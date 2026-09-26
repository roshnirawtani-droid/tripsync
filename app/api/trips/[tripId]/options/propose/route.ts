import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTripByToken } from "@/lib/trip-server";
import { getSessionFromCookies } from "@/lib/auth";
import { computeFitGrid } from "@/lib/fit";
import { OptionTags, Preference } from "@/lib/types";

interface ProposeBody {
  destination: string;
  summary: string;
  estCostPerPersonTotal: number;
  roadmapText: string;
}

// A member's own manually-typed option, alongside the AI-generated ones.
// No AI call here - it's added to the trip's option list, not a
// replacement for it (see the "ai"-only delete filter in the sibling
// generate route).
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

  const { destination, summary, estCostPerPersonTotal, roadmapText } =
    (await req.json()) as Partial<ProposeBody>;

  if (!destination?.trim()) {
    return NextResponse.json({ error: "Destination is required" }, { status: 400 });
  }
  if (typeof estCostPerPersonTotal !== "number" || estCostPerPersonTotal <= 0) {
    return NextResponse.json({ error: "Enter a valid estimated cost per person" }, { status: 400 });
  }

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

  const memberNameById = new Map(members.map((m) => [m.id, m.name]));
  const prefsWithNames = ((preferences ?? []) as Preference[])
    .filter((p) => p.submitted_at)
    .map((p) => ({ ...p, memberName: memberNameById.get(p.member_id) ?? "Unknown" }));

  // We don't know this proposal's real travel mode/drive time/etc., so it
  // never trips a dealbreaker automatically - the proposer is expected to
  // already know what they're suggesting. Only budget is checked.
  const tags: OptionTags = {
    primaryType: "city",
    requiresFlight: false,
    hasTreks: false,
    longDriveHours: 0,
    alcoholCentric: false,
    source: "manual",
  };

  const activities = (roadmapText ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const { data: inserted, error: insertError } = await admin
    .from("options")
    .insert({
      trip_id: trip.id,
      destination: destination.trim(),
      summary: summary?.trim() || "Proposed by a group member.",
      est_cost_per_person: {
        travel: 0,
        stay: 0,
        food: 0,
        activities: 0,
        total: estCostPerPersonTotal,
      },
      roadmap: [{ day: 1, title: destination.trim(), activities: activities.length ? activities : ["No details added yet."] }],
      tags,
      fit_grid: computeFitGrid(prefsWithNames, estCostPerPersonTotal, tags),
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ option: inserted });
}
