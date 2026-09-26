import "server-only";
import {
  Dealbreaker,
  DESTINATION_TYPES,
  DestinationType,
  MatchResult,
  Preference,
} from "@/lib/types";

// Deterministic, server-side: turns the group's raw preferences into the
// shared constraints the AI planner and fit-grid computation both rely on.
// No AI involved here — same inputs always give the same output.
export function computeMatch(
  preferences: Preference[],
  totalMembers: number,
  tripDateWindow: { start: string; end: string }
): MatchResult {
  const submitted = preferences.filter((p) => p.submitted_at);

  if (submitted.length === 0) {
    return {
      incomplete: true,
      membersConsidered: 0,
      totalMembers,
      dateWindow: null,
      tripLengthDays: null,
      budgetMaxInrPerPerson: null,
      dealbreakers: [],
      destinationTypeRanking: [...DESTINATION_TYPES],
    };
  }

  // Overlap of every submitted member's available range with each other
  // and with the trip's own date window.
  let overlapStart = tripDateWindow.start;
  let overlapEnd = tripDateWindow.end;
  for (const pref of submitted) {
    if (pref.available_start > overlapStart) overlapStart = pref.available_start;
    if (pref.available_end < overlapEnd) overlapEnd = pref.available_end;
  }
  const dateWindow = overlapStart <= overlapEnd ? { start: overlapStart, end: overlapEnd } : null;

  const budgetMaxInrPerPerson = Math.min(...submitted.map((p) => p.budget_max_inr));

  const tripLengthDays = Math.min(...submitted.map((p) => p.trip_length_days));

  const dealbreakerSet = new Set<Dealbreaker>();
  for (const pref of submitted) {
    for (const d of pref.dealbreakers) dealbreakerSet.add(d);
  }

  // Borda-style scoring: a member's most preferred type gets the most
  // points, so the group ranking favors types many people rank highly.
  const scores = new Map<DestinationType, number>(DESTINATION_TYPES.map((t) => [t, 0]));
  for (const pref of submitted) {
    pref.destination_ranking.forEach((type, index) => {
      const points = pref.destination_ranking.length - index;
      scores.set(type, (scores.get(type) ?? 0) + points);
    });
  }
  const destinationTypeRanking = [...DESTINATION_TYPES].sort(
    (a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0)
  );

  return {
    incomplete: submitted.length < totalMembers,
    membersConsidered: submitted.length,
    totalMembers,
    dateWindow,
    tripLengthDays,
    budgetMaxInrPerPerson,
    dealbreakers: Array.from(dealbreakerSet),
    destinationTypeRanking,
  };
}
