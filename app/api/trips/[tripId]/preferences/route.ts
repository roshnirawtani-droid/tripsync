import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTripByToken } from "@/lib/trip-server";
import { getSessionFromCookies } from "@/lib/auth";
import { DESTINATION_TYPES, Dealbreaker, DestinationType } from "@/lib/types";

const VALID_DEALBREAKERS: Dealbreaker[] = [
  "no_treks",
  "no_long_drives",
  "no_flights",
  "no_alcohol_centric",
];

interface PreferenceBody {
  budgetMaxInr: number;
  availableStart: string;
  availableEnd: string;
  destinationRanking: DestinationType[];
  tripLengthDays: number;
  dealbreakers: Dealbreaker[];
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

  const { data, error } = await admin
    .from("preferences")
    .select("*")
    .eq("trip_id", trip.id)
    .eq("member_id", session.memberId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preference: data ?? null });
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
    return NextResponse.json({ error: "This trip is locked; preferences can't be changed" }, { status: 409 });
  }

  const session = getSessionFromCookies(req.cookies, trip.id);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await req.json()) as Partial<PreferenceBody>;
  const {
    budgetMaxInr,
    availableStart,
    availableEnd,
    destinationRanking,
    tripLengthDays,
    dealbreakers,
  } = body;

  if (
    typeof budgetMaxInr !== "number" ||
    budgetMaxInr <= 0 ||
    !availableStart ||
    !availableEnd ||
    !Array.isArray(destinationRanking) ||
    destinationRanking.length === 0 ||
    !destinationRanking.every((d) => DESTINATION_TYPES.includes(d)) ||
    typeof tripLengthDays !== "number" ||
    tripLengthDays <= 0
  ) {
    return NextResponse.json({ error: "Invalid preference data" }, { status: 400 });
  }
  if (new Date(availableStart) > new Date(availableEnd)) {
    return NextResponse.json({ error: "Available start must be before end" }, { status: 400 });
  }
  const cleanDealbreakers = (dealbreakers ?? []).filter((d) => VALID_DEALBREAKERS.includes(d));

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("preferences")
    .upsert(
      {
        trip_id: trip.id,
        member_id: session.memberId,
        budget_max_inr: budgetMaxInr,
        available_start: availableStart,
        available_end: availableEnd,
        destination_ranking: destinationRanking,
        trip_length_days: tripLengthDays,
        dealbreakers: cleanDealbreakers,
        submitted_at: now,
        updated_at: now,
      },
      { onConflict: "member_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preference: data });
}
