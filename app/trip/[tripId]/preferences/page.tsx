"use client";

import { use, useEffect, useState } from "react";
import { useRequireTripSession } from "@/lib/TripSessionContext";
import {
  DEALBREAKERS,
  DESTINATION_TYPES,
  Dealbreaker,
  DestinationType,
  Preference,
  Trip,
} from "@/lib/types";
import {
  Waves,
  Mountain,
  Building2,
  Compass,
  Landmark,
  Trees,
  IndianRupee,
  CalendarRange,
  Ban,
  Sparkles,
} from "lucide-react";
import { button, card, input, label as labelClass, pageHeading, pageSubheading } from "@/lib/ui";

const LABELS: Record<DestinationType, string> = {
  beach: "Beach",
  mountains: "Mountains",
  city: "City",
  adventure: "Adventure",
  spiritual: "Spiritual",
  nature: "Nature",
};

const ICONS: Record<DestinationType, typeof Waves> = {
  beach: Waves,
  mountains: Mountain,
  city: Building2,
  adventure: Compass,
  spiritual: Landmark,
  nature: Trees,
};

const BUDGET_PRESETS = [5000, 10000, 15000, 20000, 30000];
const MAX_PICKS = 3;
// Preferred trip length is no longer asked - a shared default keeps the
// matching engine's per-member minimum meaningful without one more field.
const DEFAULT_TRIP_LENGTH_DAYS = 5;

export default function PreferencesPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = use(params);
  const { session, loading: sessionLoading } = useRequireTripSession();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [budget, setBudget] = useState("");
  const [availStart, setAvailStart] = useState("");
  const [availEnd, setAvailEnd] = useState("");
  const [picks, setPicks] = useState<DestinationType[]>([]);
  const [tripLengthDays, setTripLengthDays] = useState(DEFAULT_TRIP_LENGTH_DAYS);
  const [dealbreakers, setDealbreakers] = useState<Set<Dealbreaker>>(new Set());

  const [loadingExisting, setLoadingExisting] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    async function load() {
      const [tripRes, prefRes] = await Promise.all([
        fetch(`/api/trips/${tripId}`),
        fetch(`/api/trips/${tripId}/preferences`),
      ]);

      let tripData: Trip | null = null;
      if (tripRes.ok) {
        tripData = (await tripRes.json()).trip;
        setTrip(tripData);
      }

      if (!prefRes.ok) {
        setLoadingExisting(false);
        return;
      }
      const json = await prefRes.json();
      const pref: Preference | null = json.preference;
      if (pref) {
        setBudget(String(pref.budget_max_inr));
        setAvailStart(pref.available_start);
        setAvailEnd(pref.available_end);
        setPicks(pref.destination_ranking.slice(0, MAX_PICKS));
        setTripLengthDays(pref.trip_length_days);
        setDealbreakers(new Set(pref.dealbreakers));
        setSavedAt(pref.submitted_at);
      } else if (tripData) {
        // Default to the full trip window so most people just narrow it
        // down instead of typing dates from scratch.
        setAvailStart(tripData.date_window_start);
        setAvailEnd(tripData.date_window_end);
      }
      setLoadingExisting(false);
    }
    load();
  }, [tripId, session]);

  function togglePick(type: DestinationType) {
    setPicks((prev) => {
      if (prev.includes(type)) return prev.filter((t) => t !== type);
      if (prev.length >= MAX_PICKS) return prev;
      return [...prev, type];
    });
  }

  function toggleDealbreaker(value: Dealbreaker) {
    setDealbreakers((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const budgetNum = Number(budget);
    if (!budgetNum || budgetNum <= 0) {
      setError("Enter a valid budget");
      return;
    }
    if (!availStart || !availEnd) {
      setError("Enter your available dates");
      return;
    }
    if (picks.length === 0) {
      setError("Pick at least one destination vibe");
      return;
    }

    // The matching engine wants a full ranking; picks (in tap order) lead,
    // followed by the rest in their default order.
    const fullRanking = [...picks, ...DESTINATION_TYPES.filter((t) => !picks.includes(t))];

    setSaving(true);
    const res = await fetch(`/api/trips/${tripId}/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        budgetMaxInr: budgetNum,
        availableStart: availStart,
        availableEnd: availEnd,
        destinationRanking: fullRanking,
        tripLengthDays,
        dealbreakers: Array.from(dealbreakers),
      }),
    });
    setSaving(false);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Could not save preferences");
      return;
    }
    setSavedAt(json.preference.submitted_at);
  }

  if (sessionLoading || loadingExisting) {
    return <p className="text-stone-500">Loading…</p>;
  }

  const dateMin = trip?.date_window_start;
  const dateMax = trip?.date_window_end;

  return (
    <div className="space-y-6">
      <div>
        <h1 className={pageHeading}>Hi {session?.name} 👋</h1>
        <p className={pageSubheading}>
          {savedAt
            ? "Submitted. You can update your answers any time before the trip is locked."
            : "Fill this out so the group can find a trip that works for everyone."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className={card}>
          <label className={labelClass}>
            <IndianRupee size={16} className="mr-1 inline -mt-0.5" /> Max budget per person
          </label>
          <div className="mb-3 flex flex-wrap gap-2">
            {BUDGET_PRESETS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setBudget(String(amount))}
                className={button.chip(budget === String(amount))}
              >
                ₹{amount.toLocaleString("en-IN")}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={1}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className={input}
            placeholder="Or type a custom amount"
          />
        </section>

        <section className={card}>
          <label className={labelClass}>
            <CalendarRange size={16} className="mr-1 inline -mt-0.5" /> Your available dates
          </label>
          <p className="mb-3 -mt-1 text-xs text-stone-400">
            Within the trip window ({dateMin} to {dateMax})
          </p>
          <div className="flex gap-3">
            <input
              type="date"
              value={availStart}
              min={dateMin}
              max={dateMax}
              onChange={(e) => setAvailStart(e.target.value)}
              className={input}
            />
            <input
              type="date"
              value={availEnd}
              min={dateMin}
              max={dateMax}
              onChange={(e) => setAvailEnd(e.target.value)}
              className={input}
            />
          </div>
        </section>

        <section className={card}>
          <label className={labelClass}>
            <Sparkles size={16} className="mr-1 inline -mt-0.5" /> Pick your top {MAX_PICKS} vibes
          </label>
          <p className="mb-3 -mt-1 text-xs text-stone-400">Tap in order of preference</p>
          <div className="flex flex-wrap gap-2">
            {DESTINATION_TYPES.map((type) => {
              const Icon = ICONS[type];
              const pickIndex = picks.indexOf(type);
              const selected = pickIndex !== -1;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => togglePick(type)}
                  disabled={!selected && picks.length >= MAX_PICKS}
                  className={`flex items-center gap-1.5 rounded-full border-2 px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    selected
                      ? "border-orange-400 bg-orange-50 text-orange-700"
                      : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                  }`}
                >
                  {selected && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                      {pickIndex + 1}
                    </span>
                  )}
                  <Icon size={15} /> {LABELS[type]}
                </button>
              );
            })}
          </div>
        </section>

        <section className={card}>
          <label className={labelClass}>
            <Ban size={16} className="mr-1 inline -mt-0.5" /> Dealbreakers
          </label>
          <div className="flex flex-wrap gap-2">
            {DEALBREAKERS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDealbreaker(d.value)}
                className={`rounded-full border-2 px-3 py-1.5 text-sm font-medium transition ${
                  dealbreakers.has(d.value)
                    ? "border-rose-400 bg-rose-50 text-rose-700"
                    : "border-stone-200 text-stone-600 hover:border-stone-300"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </section>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button type="submit" disabled={saving} className={`${button.primary} w-full`}>
          {saving ? "Saving…" : savedAt ? "Update preferences" : "Submit preferences"}
        </button>
      </form>
    </div>
  );
}
