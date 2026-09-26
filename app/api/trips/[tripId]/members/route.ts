import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTripByToken } from "@/lib/trip-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const admin = supabaseAdmin();
  const trip = await getTripByToken(admin, tripId);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const [{ data: members, error: membersError }, { data: prefs, error: prefsError }] =
    await Promise.all([
      admin
        .from("members")
        .select("id, name, joined_at")
        .eq("trip_id", trip.id)
        .order("created_at", { ascending: true }),
      admin
        .from("preferences")
        .select("member_id, submitted_at")
        .eq("trip_id", trip.id),
    ]);

  if (membersError || prefsError) {
    return NextResponse.json(
      { error: membersError?.message ?? prefsError?.message },
      { status: 500 }
    );
  }

  const submittedByMember = new Set(
    (prefs ?? []).filter((p) => p.submitted_at).map((p) => p.member_id)
  );

  return NextResponse.json({
    members: (members ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      joined: Boolean(m.joined_at),
      submitted: submittedByMember.has(m.id),
    })),
  });
}
