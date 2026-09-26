import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTripByToken } from "@/lib/trip-server";
import { getSessionFromCookies } from "@/lib/auth";
import { answerTripQuestion } from "@/lib/gemini";
import { TripOption } from "@/lib/types";

interface HelpBody {
  question: string;
  askAI: boolean;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;
  const admin = supabaseAdmin();
  const trip = await getTripByToken(admin, tripId);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const { data: questions, error } = await admin
    .from("help_questions")
    .select("*, members(name)")
    .eq("trip_id", trip.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    questions: (questions ?? []).map(({ members, ...q }) => ({
      ...q,
      memberName: (members as unknown as { name: string } | null)?.name ?? "?",
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

  const { question, askAI } = (await req.json()) as Partial<HelpBody>;
  if (!question?.trim()) {
    return NextResponse.json({ error: "Question can't be empty" }, { status: 400 });
  }

  let aiAnswer: string | null = null;
  if (askAI) {
    const { data: options } = await admin.from("options").select("*").eq("trip_id", trip.id);
    aiAnswer = await answerTripQuestion(trip, (options ?? []) as TripOption[], question.trim());
  }

  const { data: inserted, error } = await admin
    .from("help_questions")
    .insert({
      trip_id: trip.id,
      member_id: session.memberId,
      question: question.trim(),
      ai_answer: aiAnswer,
    })
    .select("*, members(name)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { members, ...rest } = inserted;
  return NextResponse.json({
    question: { ...rest, memberName: (members as unknown as { name: string } | null)?.name ?? "?" },
  });
}
