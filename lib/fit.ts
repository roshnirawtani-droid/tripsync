import "server-only";
import { Dealbreaker, FitEntry, OptionTags, Preference } from "@/lib/types";

// Which structured option tag each dealbreaker rules out. Kept separate
// from the AI's own prose so a member's dealbreaker is enforced
// mechanically, not by trusting the model to have honored it.
function violatesDealbreaker(dealbreaker: Dealbreaker, tags: OptionTags): boolean {
  switch (dealbreaker) {
    case "no_flights":
      return tags.requiresFlight;
    case "no_treks":
      return tags.hasTreks;
    case "no_long_drives":
      return tags.longDriveHours > 3;
    case "no_alcohol_centric":
      return tags.alcoholCentric;
  }
}

const DEALBREAKER_LABEL: Record<Dealbreaker, string> = {
  no_flights: "involves a flight",
  no_treks: "involves a trek",
  no_long_drives: "involves a long drive",
  no_alcohol_centric: "is alcohol-centric",
};

export function computeFitForMember(
  pref: Preference,
  memberName: string,
  totalCostPerPerson: number,
  tags: OptionTags
): FitEntry {
  const brokenDealbreaker = pref.dealbreakers.find((d) => violatesDealbreaker(d, tags));
  if (brokenDealbreaker) {
    return {
      status: "conflict",
      reason: `${memberName}: this trip ${DEALBREAKER_LABEL[brokenDealbreaker]}`,
    };
  }

  const overBudget = totalCostPerPerson - pref.budget_max_inr;
  if (overBudget > 0) {
    const severe = overBudget > pref.budget_max_inr * 0.3;
    return {
      status: severe ? "conflict" : "compromise",
      reason: `${memberName}: ₹${overBudget.toLocaleString("en-IN")} over budget`,
    };
  }

  const rank = pref.destination_ranking.indexOf(tags.primaryType);
  const isLeastPreferred = rank >= 0 && rank >= pref.destination_ranking.length - 2;
  if (isLeastPreferred) {
    return {
      status: "compromise",
      reason: `${memberName}: not among their top destination picks`,
    };
  }

  return { status: "good", reason: `${memberName}: good fit` };
}

export function computeFitGrid(
  preferences: (Preference & { memberName: string })[],
  totalCostPerPerson: number,
  tags: OptionTags
): Record<string, FitEntry> {
  const grid: Record<string, FitEntry> = {};
  for (const pref of preferences) {
    grid[pref.member_id] = computeFitForMember(pref, pref.memberName, totalCostPerPerson, tags);
  }
  return grid;
}
