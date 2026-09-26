import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTripByToken } from "@/lib/trip-server";
import {
  hashPin,
  isValidPin,
  sessionCookieName,
  signSessionToken,
  verifyPin,
} from "@/lib/auth";

interface AuthBody {
  memberId: string;
  pin: string;
}

// First call for a member with no pin_hash yet sets their PIN (claiming
// the name). Every later call verifies against the stored hash. Either
// way, on success we set an httpOnly session cookie for this trip.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const body = (await req.json()) as Partial<AuthBody>;
  const { memberId, pin } = body;

  if (!memberId || !pin || !isValidPin(pin)) {
    return NextResponse.json({ error: "A 4-digit PIN is required" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const trip = await getTripByToken(admin, tripId);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const { data: member, error: memberError } = await admin
    .from("members")
    .select("id, name, pin_hash")
    .eq("id", memberId)
    .eq("trip_id", trip.id)
    .maybeSingle();

  if (memberError || !member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (!member.pin_hash) {
    const pinHash = await hashPin(pin);
    const { error: updateError } = await admin
      .from("members")
      .update({ pin_hash: pinHash, joined_at: new Date().toISOString() })
      .eq("id", member.id);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    const ok = await verifyPin(pin, member.pin_hash);
    if (!ok) {
      return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
    }
  }

  const sessionToken = signSessionToken({
    tripId: trip.id,
    memberId: member.id,
    name: member.name,
  });

  const res = NextResponse.json({
    member: { id: member.id, name: member.name },
  });
  res.cookies.set(sessionCookieName(trip.id), sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
