import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DESTINATION_TYPES, DestinationType, MatchResult, OptionTags, Trip, TripOption } from "@/lib/types";

export interface GeneratedOption {
  destination: string;
  summary: string;
  estCostPerPerson: {
    travel: number;
    stay: number;
    food: number;
    activities: number;
    total: number;
  };
  roadmap: { day: number; title: string; activities: string[] }[];
  tags: OptionTags;
}

const DEALBREAKER_DESCRIPTION: Record<string, string> = {
  no_treks: "no trekking/hiking",
  no_long_drives: "no long drives (keep drives under 3 hours)",
  no_flights: "no flights, reachable by train/road",
  no_alcohol_centric: "not centered on alcohol/nightlife",
};

function buildPrompt(match: MatchResult): string {
  const dealbreakerText = match.dealbreakers.length
    ? match.dealbreakers.map((d) => DEALBREAKER_DESCRIPTION[d] ?? d).join(", ")
    : "none";

  return `You are planning a group trip for close friends in India. Generate exactly 3 distinct trip options as a strict JSON array (no markdown fences, no commentary, no trailing text) matching this TypeScript type:

type Option = {
  destination: string;
  summary: string; // one or two sentences on why this fits the group
  estCostPerPerson: { travel: number; stay: number; food: number; activities: number; total: number }; // INR, whole trip, rough estimates, total = sum of the other four
  roadmap: { day: number; title: string; activities: string[] }[]; // one entry per day of the trip
  tags: {
    primaryType: "beach" | "mountains" | "city" | "adventure" | "spiritual" | "nature";
    requiresFlight: boolean; // true only if flying is the realistic way to reach it from major Indian cities
    hasTreks: boolean; // true if the itinerary includes any trekking/hiking
    longDriveHours: number; // longest single road-travel leg, in hours, 0 if none
    alcoholCentric: boolean; // true if nightlife/alcohol is a central part of the itinerary
  };
}

Constraints for the group:
- Max budget per person: ₹${match.budgetMaxInrPerPerson} for the whole trip (travel+stay+food+activities). Prefer options at or under this; do not wildly exceed it.
- Trip length: ${match.tripLengthDays} days.
- Shared travel window: ${match.dateWindow?.start} to ${match.dateWindow?.end}.
- Group's destination-type preference, most to least preferred: ${match.destinationTypeRanking.join(", ")}.
- Group dealbreakers, avoid these in the itinerary where possible: ${dealbreakerText}.

Return ONLY the JSON array, exactly 3 options, destinations in India, all cost figures as plain numbers (no currency symbols).`;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const withoutFences = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(withoutFences);
}

function isValidOption(value: unknown): value is GeneratedOption {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  if (typeof o.destination !== "string" || typeof o.summary !== "string") return false;

  const cost = o.estCostPerPerson as Record<string, unknown> | undefined;
  if (
    !cost ||
    typeof cost.travel !== "number" ||
    typeof cost.stay !== "number" ||
    typeof cost.food !== "number" ||
    typeof cost.activities !== "number" ||
    typeof cost.total !== "number"
  ) {
    return false;
  }

  if (!Array.isArray(o.roadmap) || o.roadmap.length === 0) return false;
  for (const day of o.roadmap) {
    if (
      typeof day !== "object" ||
      day === null ||
      typeof (day as Record<string, unknown>).day !== "number" ||
      typeof (day as Record<string, unknown>).title !== "string" ||
      !Array.isArray((day as Record<string, unknown>).activities)
    ) {
      return false;
    }
  }

  const tags = o.tags as Record<string, unknown> | undefined;
  if (
    !tags ||
    !DESTINATION_TYPES.includes(tags.primaryType as DestinationType) ||
    typeof tags.requiresFlight !== "boolean" ||
    typeof tags.hasTreks !== "boolean" ||
    typeof tags.longDriveHours !== "number" ||
    typeof tags.alcoholCentric !== "boolean"
  ) {
    return false;
  }

  return true;
}

function isValidOptionArray(value: unknown): value is GeneratedOption[] {
  return Array.isArray(value) && value.length === 3 && value.every(isValidOption);
}

export class GeminiGenerationError extends Error {}

export async function generateTripOptions(match: MatchResult): Promise<GeneratedOption[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiGenerationError("GEMINI_API_KEY is not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

  const prompt = buildPrompt(match);

  for (let attempt = 0; attempt < 2; attempt++) {
    const promptForAttempt =
      attempt === 0
        ? prompt
        : `${prompt}\n\nYour previous response was not valid JSON matching the required schema. Return ONLY the raw JSON array this time, with no markdown fences and no extra text.`;

    try {
      const result = await model.generateContent(promptForAttempt);
      const text = result.response.text();
      const parsed = extractJson(text);
      if (isValidOptionArray(parsed)) {
        return parsed;
      }
    } catch {
      // fall through to retry
    }
  }

  throw new GeminiGenerationError("Gemini did not return valid trip options after retrying");
}

// Best-effort Q&A over the trip's actual data. Failures return a plain
// fallback string instead of throwing - this is a helper, not a critical
// path, and the group's question is still visible either way.
export async function answerTripQuestion(
  trip: Trip,
  options: TripOption[],
  question: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "Ask AI isn't set up yet (missing GEMINI_API_KEY).";

  const optionsSummary = options.length
    ? options
        .map((o) => {
          const cost = o.est_cost_per_person;
          const locked = o.id === trip.locked_option_id ? " [THIS IS THE LOCKED / FINAL OPTION]" : "";
          const roadmap = o.roadmap
            .map((d) => `  Day ${d.day} - ${d.title}: ${d.activities.join("; ")}`)
            .join("\n");
          return `- ${o.destination}${locked}\n  ${o.summary}\n  Cost per person: travel ₹${cost.travel}, stay ₹${cost.stay}, food ₹${cost.food}, activities ₹${cost.activities}, total ₹${cost.total}\n${roadmap}`;
        })
        .join("\n\n")
    : "No trip options have been generated yet.";

  const prompt = `You are a helpful assistant for a group trip planning app called TripSync. Answer the group's question below using ONLY the trip data given. Be concise (2-4 sentences). If the data doesn't cover the question, say so plainly instead of guessing.

Trip: ${trip.name}
Date window: ${trip.date_window_start} to ${trip.date_window_end}
Response deadline: ${trip.response_deadline}
Status: ${trip.status}${trip.status === "locked" ? " - the group has locked in a final option, marked below" : " - no option has been locked in yet"}

Trip options:
${optionsSummary}

Question: ${question}`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text().trim() || "I couldn't come up with an answer for that.";
  } catch {
    return "Ask AI is temporarily unavailable - try again in a moment.";
  }
}
