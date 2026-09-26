import "server-only";
import {
  GenerativeModel,
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  ResponseSchema,
  SchemaType,
} from "@google/generative-ai";
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

const DEFAULT_MODEL = "gemini-3.8-flash";

// Structured output: Gemini is constrained to return exactly this JSON
// shape, so the response parses and validates instead of arriving wrapped
// in prose or markdown fences.
const OPTIONS_SCHEMA: ResponseSchema = {
  type: SchemaType.ARRAY,
  minItems: 3,
  maxItems: 3,
  items: {
    type: SchemaType.OBJECT,
    required: ["destination", "summary", "estCostPerPerson", "roadmap", "tags"],
    properties: {
      destination: { type: SchemaType.STRING },
      summary: { type: SchemaType.STRING },
      estCostPerPerson: {
        type: SchemaType.OBJECT,
        required: ["travel", "stay", "food", "activities", "total"],
        properties: {
          travel: { type: SchemaType.NUMBER },
          stay: { type: SchemaType.NUMBER },
          food: { type: SchemaType.NUMBER },
          activities: { type: SchemaType.NUMBER },
          total: { type: SchemaType.NUMBER },
        },
      },
      roadmap: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          required: ["day", "title", "activities"],
          properties: {
            day: { type: SchemaType.INTEGER },
            title: { type: SchemaType.STRING },
            activities: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          },
        },
      },
      tags: {
        type: SchemaType.OBJECT,
        required: ["primaryType", "requiresFlight", "hasTreks", "longDriveHours", "alcoholCentric"],
        properties: {
          primaryType: { type: SchemaType.STRING, format: "enum", enum: [...DESTINATION_TYPES] },
          requiresFlight: { type: SchemaType.BOOLEAN },
          hasTreks: { type: SchemaType.BOOLEAN },
          longDriveHours: { type: SchemaType.NUMBER },
          alcoholCentric: { type: SchemaType.BOOLEAN },
        },
      },
    },
  },
};

function getModel(apiKey: string, json: boolean): GenerativeModel {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    ...(json
      ? { generationConfig: { responseMimeType: "application/json", responseSchema: OPTIONS_SCHEMA } }
      : {}),
  });
}

// Configuration problems (bad key, no access, quota, unknown model) will
// fail the same way on every retry, so they're reported straight away in
// words the organiser can act on instead of as "invalid options".
function describeConfigError(err: unknown): string | null {
  if (!(err instanceof GoogleGenerativeAIFetchError)) return null;
  const reason = err.errorDetails?.map((d) => (d as { reason?: string }).reason).find(Boolean);
  if (reason === "API_KEY_INVALID" || err.status === 401) {
    return "Gemini rejected the API key. Set a valid GEMINI_API_KEY from aistudio.google.com/apikey (it starts with AIza) and restart the server.";
  }
  if (err.status === 403) return "This Gemini API key isn't allowed to use the Gemini API. Check the key's project and restrictions.";
  if (err.status === 429) return "Gemini's rate limit or quota is used up for this key. Wait a minute and try again.";
  if (err.status === 404) {
    return `The Gemini model "${process.env.GEMINI_MODEL || DEFAULT_MODEL}" isn't available for this key. Set GEMINI_MODEL to a model your key can use.`;
  }
  return null;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const withoutFences = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const parsed: unknown = JSON.parse(withoutFences);
  // Tolerate the model wrapping the array, e.g. { "options": [...] }.
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const firstArray = Object.values(parsed).find(Array.isArray);
    if (firstArray) return firstArray;
  }
  return parsed;
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

  const model = getModel(apiKey, true);
  const prompt = buildPrompt(match);
  let lastProblem = "the response didn't match the expected format";

  for (let attempt = 0; attempt < 2; attempt++) {
    const promptForAttempt =
      attempt === 0
        ? prompt
        : `${prompt}\n\nYour previous response was not valid JSON matching the required schema. Return ONLY the raw JSON array this time, with no markdown fences and no extra text.`;

    try {
      const result = await model.generateContent(promptForAttempt);
      const parsed = extractJson(result.response.text());
      if (isValidOptionArray(parsed)) {
        return parsed;
      }
      lastProblem = "the response didn't match the expected format";
    } catch (err) {
      const configProblem = describeConfigError(err);
      if (configProblem) throw new GeminiGenerationError(configProblem);
      lastProblem = err instanceof Error ? err.message : String(err);
      console.error("Gemini trip generation failed:", lastProblem);
    }
  }

  throw new GeminiGenerationError(`Gemini did not return valid trip options (${lastProblem}). Please try again.`);
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
    const result = await getModel(apiKey, false).generateContent(prompt);
    return result.response.text().trim() || "I couldn't come up with an answer for that.";
  } catch (err) {
    const configProblem = describeConfigError(err);
    if (configProblem) return `Ask AI isn't working: ${configProblem}`;
    return "Ask AI is temporarily unavailable - try again in a moment.";
  }
}
