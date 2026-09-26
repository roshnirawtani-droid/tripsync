import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTripByToken } from "@/lib/trip-server";
import { getSessionFromCookies } from "@/lib/auth";
import { computeMatch } from "@/lib/matching";
import { computeFitGrid } from "@/lib/fit";
import { generateTripOptions, GeminiGenerationError } from "@/lib/gemini";
import { Preference } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const admin = supabaseAdmin();
  const trip = await getTripByToken(admin, tripId);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const { data: options, error } = await admin
    .from("options")
    .select("*")
    .eq("trip_id", trip.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ options: options ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const admin = supabaseAdmin();
  const trip = await getTripByToken(admin, tripId);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  if (trip.status === "locked") {
    return NextResponse.json({ error: "This trip is already locked" }, { status: 409 });
  }

  const session = getSessionFromCookies(req.cookies, trip.id);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [{ data: members, error: membersError }, { data: preferences, error: prefsError }] =
    await Promise.all([
      admin.from("members").select("id, name").eq("trip_id", trip.id),
      admin.from("preferences").select("*").eq("trip_id", trip.id),
    ]);

  if (membersError || prefsError || !members) {
    return NextResponse.json(
      { error: membersError?.message ?? prefsError?.message ?? "Could not load trip data" },
      { status: 500 }
    );
  }

  const typedPreferences = (preferences ?? []) as Preference[];
  const submittedPreferences = typedPreferences.filter((p) => p.submitted_at);
  if (submittedPreferences.length === 0) {
    return NextResponse.json({ error: "No one has submitted preferences yet" }, { status: 422 });
  }

  const match = computeMatch(typedPreferences, members.length, {
    start: trip.date_window_start,
    end: trip.date_window_end,
  });

  if (!match.dateWindow) {
    return NextResponse.json(
      { error: "No dates overlap across everyone who has responded so far", match },
      { status: 422 }
    );
  }

  let generated;
  try {
    generated = await generateTripOptions(match);
  } catch (err) {
    if (err instanceof GeminiGenerationError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }

  const memberNameById = new Map(members.map((m) => [m.id, m.name]));
  const prefsWithNames = submittedPreferences.map((p) => ({
    ...p,
    memberName: memberNameById.get(p.member_id) ?? "Unknown",
  }));

  const rows = generated.map((option) => {
    const tags = { ...option.tags, source: "ai" as const };
    return {
      trip_id: trip.id,
      destination: option.destination,
      summary: option.summary,
      est_cost_per_person: option.estCostPerPerson,
      roadmap: option.roadmap,
      tags,
      fit_grid: computeFitGrid(prefsWithNames, option.estCostPerPerson.total, tags),
    };
  });

  // Only clear previously AI-generated options on regenerate - manually
  // proposed ones stay put.
  await admin.from("options").delete().eq("trip_id", trip.id).eq("tags->>source", "ai");
  const { data: inserted, error: insertError } = await admin
    .from("options")
    .insert(rows)
    .select();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: allOptions, error: allOptionsError } = await admin
    .from("options")
    .select("*")
    .eq("trip_id", trip.id)
    .order("created_at", { ascending: true });
  if (allOptionsError) {
    return NextResponse.json({ error: allOptionsError.message }, { status: 500 });
  }

  return NextResponse.json({ options: allOptions ?? inserted, match });
}
