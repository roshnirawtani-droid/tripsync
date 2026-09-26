import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

interface CreateTripBody {
  name: string;
  dateWindowStart: string;
  dateWindowEnd: string;
  responseDeadline: string;
  coordinatorName: string;
  memberNames: string[];
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<CreateTripBody>;
  const { name, dateWindowStart, dateWindowEnd, responseDeadline, coordinatorName, memberNames } = body;

  if (!name?.trim() || !dateWindowStart || !dateWindowEnd || !responseDeadline || !coordinatorName?.trim()) {
    return NextResponse.json({ error: "Missing required trip fields" }, { status: 400 });
  }
  const cleanedNames = (memberNames ?? [])
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
  const uniqueNames = Array.from(new Set([coordinatorName.trim(), ...cleanedNames]));
  if (uniqueNames.length < 2) {
    return NextResponse.json({ error: "Add at least 1 other member" }, { status: 400 });
  }
  if (new Date(dateWindowStart) > new Date(dateWindowEnd)) {
    return NextResponse.json({ error: "Date window start must be before end" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: trip, error: tripError } = await admin
    .from("trips")
    .insert({
      name: name.trim(),
      date_window_start: dateWindowStart,
      date_window_end: dateWindowEnd,
      response_deadline: responseDeadline,
    })
    .select()
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: tripError?.message ?? "Could not create trip" }, { status: 500 });
  }

  const { data: members, error: membersError } = await admin
    .from("members")
    .insert(uniqueNames.map((memberName) => ({ trip_id: trip.id, name: memberName })))
    .select("id, name");

  if (membersError || !members) {
    await admin.from("trips").delete().eq("id", trip.id);
    return NextResponse.json({ error: membersError?.message ?? "Could not add members" }, { status: 500 });
  }

  const coordinator = members.find((m) => m.name === coordinatorName.trim());
  const { error: coordinatorError } = await admin
    .from("trips")
    .update({ coordinator_member_id: coordinator?.id })
    .eq("id", trip.id);

  if (coordinatorError) {
    return NextResponse.json({ error: coordinatorError.message }, { status: 500 });
  }

  return NextResponse.json({
    tripId: trip.share_token,
    shareUrl: `/trip/${trip.share_token}/join`,
    coordinatorMemberId: coordinator?.id,
  });
}
