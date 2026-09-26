export type TripStatus = "collecting" | "locked";

export type DestinationType =
  | "beach"
  | "mountains"
  | "city"
  | "adventure"
  | "spiritual"
  | "nature";

export type Dealbreaker =
  | "no_treks"
  | "no_long_drives"
  | "no_flights"
  | "no_alcohol_centric";

export interface Trip {
  id: string;
  name: string;
  date_window_start: string;
  date_window_end: string;
  response_deadline: string;
  status: TripStatus;
  locked_option_id: string | null;
  coordinator_member_id: string | null;
  share_token: string;
  created_at: string;
}

export interface Member {
  id: string;
  trip_id: string;
  name: string;
  created_at: string;
}

export interface Preference {
  id: string;
  trip_id: string;
  member_id: string;
  budget_max_inr: number;
  available_start: string;
  available_end: string;
  destination_ranking: DestinationType[];
  trip_length_days: number;
  dealbreakers: Dealbreaker[];
  submitted_at: string | null;
  updated_at: string;
}

export interface CostBreakdown {
  travel: number;
  stay: number;
  food: number;
  activities: number;
  total: number;
}

export interface RoadmapDay {
  day: number;
  title: string;
  activities: string[];
}

export type FitStatus = "good" | "compromise" | "conflict";

export interface FitEntry {
  status: FitStatus;
  reason: string;
}

export interface OptionTags {
  primaryType: DestinationType;
  requiresFlight: boolean;
  hasTreks: boolean;
  longDriveHours: number;
  alcoholCentric: boolean;
  source?: "ai" | "manual";
}

export interface TripOption {
  id: string;
  trip_id: string;
  destination: string;
  summary: string;
  est_cost_per_person: CostBreakdown;
  roadmap: RoadmapDay[];
  tags: OptionTags;
  fit_grid: Record<string, FitEntry>;
  enrichment: OptionEnrichment | null;
  created_at: string;
}

export interface MatchResult {
  incomplete: boolean;
  membersConsidered: number;
  totalMembers: number;
  dateWindow: { start: string; end: string } | null;
  tripLengthDays: number | null;
  budgetMaxInrPerPerson: number | null;
  dealbreakers: Dealbreaker[];
  destinationTypeRanking: DestinationType[];
}

export interface OptionEnrichment {
  attractions: { name: string; kind: string }[] | null;
  stays: { name: string; distanceKm: number | null }[] | null;
  weather: { days: { date: string; minC: number; maxC: number; precipMm: number }[]; isForecast: boolean } | null;
  fetchedAt: string;
}

export interface Conversation {
  id: string;
  trip_id: string;
  title: string | null;
  attached_option_id: string | null;
  created_at: string;
  participantNames?: string[];
  lastMessage?: { body: string; created_at: string } | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  member_id: string;
  body: string;
  attached_option_id: string | null;
  created_at: string;
  senderName?: string;
}

export interface HelpQuestion {
  id: string;
  trip_id: string;
  member_id: string;
  question: string;
  ai_answer: string | null;
  created_at: string;
  memberName?: string;
}

export const DESTINATION_TYPES: DestinationType[] = [
  "beach",
  "mountains",
  "city",
  "adventure",
  "spiritual",
  "nature",
];

export const DEALBREAKERS: { value: Dealbreaker; label: string }[] = [
  { value: "no_treks", label: "No treks" },
  { value: "no_long_drives", label: "No long drives" },
  { value: "no_flights", label: "No flights" },
  { value: "no_alcohol_centric", label: "No alcohol-centric places" },
];
