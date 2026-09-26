import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTripByToken } from "@/lib/trip-server";
import { getSessionFromCookies } from "@/lib/auth";
import { isConversationMember } from "@/lib/conversation-server";

interface SendMessageBody {
  body: string;
  attachedOptionId?: string | null;
}

async function loadConversationInTrip(
  admin: ReturnType<typeof supabaseAdmin>,
  tripId: string,
  conversationId: string
) {
  const { data } = await admin
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("trip_id", tripId)
    .maybeSingle();
  return data;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string; conversationId: string }> }
) {
  const { tripId, conversationId } = await params;
  const admin = supabaseAdmin();
  const trip = await getTripByToken(admin, tripId);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const session = getSessionFromCookies(req.cookies, trip.id);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const conversation = await loadConversationInTrip(admin, trip.id, conversationId);
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const isMember = await isConversationMember(admin, conversationId, session.memberId);
  if (!isMember) return NextResponse.json({ error: "Not a member of this conversation" }, { status: 403 });

  const { data: messages, error } = await admin
    .from("messages")
    .select("*, members(name)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    messages: (messages ?? []).map(({ members, ...m }) => ({
      ...m,
      senderName: (members as unknown as { name: string } | null)?.name ?? "?",
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string; conversationId: string }> }
) {
  const { tripId, conversationId } = await params;
  const admin = supabaseAdmin();
  const trip = await getTripByToken(admin, tripId);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const session = getSessionFromCookies(req.cookies, trip.id);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const conversation = await loadConversationInTrip(admin, trip.id, conversationId);
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

  const isMember = await isConversationMember(admin, conversationId, session.memberId);
  if (!isMember) return NextResponse.json({ error: "Not a member of this conversation" }, { status: 403 });

  const { body, attachedOptionId } = (await req.json()) as Partial<SendMessageBody>;
  if (!body?.trim()) {
    return NextResponse.json({ error: "Message can't be empty" }, { status: 400 });
  }

  if (attachedOptionId) {
    const { data: option } = await admin
      .from("options")
      .select("id")
      .eq("id", attachedOptionId)
      .eq("trip_id", trip.id)
      .maybeSingle();
    if (!option) {
      return NextResponse.json({ error: "Attached option not found for this trip" }, { status: 400 });
    }
  }

  const { data: message, error } = await admin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      member_id: session.memberId,
      body: body.trim(),
      attached_option_id: attachedOptionId || null,
    })
    .select("*, members(name)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { members, ...rest } = message;
  return NextResponse.json({
    message: { ...rest, senderName: (members as unknown as { name: string } | null)?.name ?? "?" },
  });
}
