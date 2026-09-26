import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTripByToken } from "@/lib/trip-server";
import { getSessionFromCookies } from "@/lib/auth";

interface CreateConversationBody {
  memberIds: string[];
  title?: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const admin = supabaseAdmin();
  const trip = await getTripByToken(admin, tripId);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const session = getSessionFromCookies(req.cookies, trip.id);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: memberships, error: membershipsError } = await admin
    .from("conversation_members")
    .select("conversation_id")
    .eq("member_id", session.memberId);
  if (membershipsError) {
    return NextResponse.json({ error: membershipsError.message }, { status: 500 });
  }
  const conversationIds = (memberships ?? []).map((m) => m.conversation_id);
  if (conversationIds.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  const [{ data: conversations, error: convError }, { data: allMembers, error: membersError }] =
    await Promise.all([
      admin
        .from("conversations")
        .select("*")
        .in("id", conversationIds)
        .order("created_at", { ascending: false }),
      admin
        .from("conversation_members")
        .select("conversation_id, member_id, members(name)")
        .in("conversation_id", conversationIds),
    ]);
  if (convError || membersError) {
    return NextResponse.json(
      { error: convError?.message ?? membersError?.message },
      { status: 500 }
    );
  }

  const { data: lastMessages } = await admin
    .from("messages")
    .select("conversation_id, body, created_at")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  const lastMessageByConversation = new Map<string, { body: string; created_at: string }>();
  for (const msg of lastMessages ?? []) {
    if (!lastMessageByConversation.has(msg.conversation_id)) {
      lastMessageByConversation.set(msg.conversation_id, { body: msg.body, created_at: msg.created_at });
    }
  }

  const participantsByConversation = new Map<string, string[]>();
  for (const row of allMembers ?? []) {
    const name = (row.members as unknown as { name: string } | null)?.name ?? "?";
    const list = participantsByConversation.get(row.conversation_id) ?? [];
    list.push(name);
    participantsByConversation.set(row.conversation_id, list);
  }

  return NextResponse.json({
    conversations: (conversations ?? []).map((c) => ({
      ...c,
      participantNames: participantsByConversation.get(c.id) ?? [],
      lastMessage: lastMessageByConversation.get(c.id) ?? null,
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const admin = supabaseAdmin();
  const trip = await getTripByToken(admin, tripId);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const session = getSessionFromCookies(req.cookies, trip.id);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { memberIds, title } = (await req.json()) as Partial<CreateConversationBody>;
  const otherIds = Array.from(new Set((memberIds ?? []).filter((id) => id !== session.memberId)));
  if (otherIds.length === 0) {
    return NextResponse.json({ error: "Pick at least one other member" }, { status: 400 });
  }

  const { data: validMembers, error: validError } = await admin
    .from("members")
    .select("id")
    .eq("trip_id", trip.id)
    .in("id", otherIds);
  if (validError) return NextResponse.json({ error: validError.message }, { status: 500 });
  if ((validMembers ?? []).length !== otherIds.length) {
    return NextResponse.json({ error: "One or more members are invalid for this trip" }, { status: 400 });
  }

  const participantIds = [session.memberId, ...otherIds];

  const { data: conversation, error: convError } = await admin
    .from("conversations")
    .insert({ trip_id: trip.id, title: title?.trim() || null })
    .select()
    .single();
  if (convError || !conversation) {
    return NextResponse.json({ error: convError?.message ?? "Could not create conversation" }, { status: 500 });
  }

  const { error: membersError } = await admin
    .from("conversation_members")
    .insert(participantIds.map((memberId) => ({ conversation_id: conversation.id, member_id: memberId })));
  if (membersError) {
    await admin.from("conversations").delete().eq("id", conversation.id);
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  return NextResponse.json({ conversation });
}
