import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTripByToken } from "@/lib/trip-server";
import { getSessionFromCookies } from "@/lib/auth";

interface LockBody {
  optionId: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const admin = supabaseAdmin();
  const trip = await getTripByToken(admin, tripId);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  // Any signed-in member of the trip can lock the group's decision - this
  // isn't the coordinator's call alone, everyone contributed preferences.
  const session = getSessionFromCookies(req.cookies, trip.id);
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (trip.status === "locked") {
    return NextResponse.json({ error: "This trip is already locked" }, { status: 409 });
  }

  const { optionId } = (await req.json()) as Partial<LockBody>;
  if (!optionId) {
    return NextResponse.json({ error: "optionId is required" }, { status: 400 });
  }

  const { data: option, error: optionError } = await admin
    .from("options")
    .select("id")
    .eq("id", optionId)
    .eq("trip_id", trip.id)
    .maybeSingle();
  if (optionError || !option) {
    return NextResponse.json({ error: "Option not found for this trip" }, { status: 404 });
  }

  const { data: updated, error: updateError } = await admin
    .from("trips")
    .update({ status: "locked", locked_option_id: optionId })
    .eq("id", trip.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ trip: updated });
}
