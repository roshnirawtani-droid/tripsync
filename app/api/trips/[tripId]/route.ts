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
  return NextResponse.json({ trip });
}
