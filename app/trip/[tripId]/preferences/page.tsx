"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
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
  Check,
  Lock,
  PartyPopper,
} from "lucide-react";
import Snowfall from "@/components/Snowfall";
import { VIBE_PHOTOS } from "@/lib/backgrounds";
import { takeVibeHint } from "@/lib/client-session";
import { notifyTripChanged } from "@/lib/trip-events";
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
  const [celebrating, setCelebrating] = useState(false);
  const [groupProgress, setGroupProgress] = useState<{ submitted: number; total: number } | null>(null);
  const endCelebration = useCallback(() => setCelebrating(false), []);

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
        const hint = takeVibeHint();
        if (hint && (DESTINATION_TYPES as readonly string[]).includes(hint)) {
          setPicks([hint as DestinationType]);
        }
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
    setCelebrating(true);
    notifyTripChanged();

    const membersRes = await fetch(`/api/trips/${tripId}/members`);
    if (membersRes.ok) {
      const members: { submitted: boolean }[] = (await membersRes.json()).members ?? [];
      setGroupProgress({ submitted: members.filter((m) => m.submitted).length, total: members.length });
    }
  }

  if (sessionLoading || loadingExisting) {
    return <p className="pt-10 text-white/80">Loading…</p>;
  }

  const dateMin = trip?.date_window_start;
  const dateMax = trip?.date_window_end;
  const isLocked = trip?.status === "locked";

  return (
    <div className="space-y-6">
      <div>
        <h1 className={pageHeading}>Hi {session?.name} 👋</h1>
        <p className={pageSubheading}>
          {isLocked
            ? "The trip is locked, so answers can't change any more."
            : savedAt
            ? "Submitted. You can update your answers any time before the trip is locked."
            : "Tell the group what works for you - it takes about a minute."}
        </p>
      </div>

      {celebrating && <Snowfall onDone={endCelebration} />}

      {groupProgress && (
        <div className="flex animate-fade-up items-center gap-3 rounded-3xl bg-sky-50 p-4 ring-1 ring-sky-200">
          <PartyPopper className="shrink-0 text-sky-700" size={26} />
          <div className="flex-1 text-sm">
            <p className="font-bold text-sky-900">You&apos;re in!</p>
            <p className="text-sky-800">
              {groupProgress.submitted} of {groupProgress.total} friends have answered.
              {groupProgress.submitted < groupProgress.total ? " Nudge the rest so the plan can happen." : " Everyone's in - go pick a plan!"}
            </p>
          </div>
          <Link
            href={`/trip/${tripId}/${groupProgress.submitted < groupProgress.total ? "status" : "options"}`}
            className="btn-glacier shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition active:scale-[0.97]"
          >
            {groupProgress.submitted < groupProgress.total ? "Nudge" : "Options"}
          </Link>
        </div>
      )}

      {isLocked && (
        <Link
          href={`/trip/${tripId}/options/${trip?.locked_option_id}`}
          className="flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800 ring-1 ring-sky-200 transition hover:bg-sky-100"
        >
          <Lock size={16} /> Locked in. See the final plan →
        </Link>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <fieldset disabled={isLocked} className="min-w-0 space-y-5 disabled:opacity-60">
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
          <p className="mb-3 -mt-1 text-xs text-stone-500">Tap in order of preference</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {DESTINATION_TYPES.map((type) => {
              const Icon = ICONS[type];
              const photo = VIBE_PHOTOS[type];
              const pickIndex = picks.indexOf(type);
              const selected = pickIndex !== -1;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => togglePick(type)}
                  disabled={!selected && picks.length >= MAX_PICKS}
                  aria-pressed={selected}
                  className={`group relative aspect-[4/3] overflow-hidden rounded-2xl text-left transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 ${
                    selected ? "ring-4 ring-sky-400 ring-offset-2 ring-offset-white" : "ring-1 ring-white/70"
                  }`}
                >
                  <Image
                    src={photo.src}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 200px, 45vw"
                    loading="eager"
                    className="object-cover transition duration-500 group-hover:scale-105"
                    style={{ objectPosition: photo.position }}
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                  <span className="absolute bottom-2 left-2.5 flex items-center gap-1.5 text-sm font-bold text-white">
                    <Icon size={15} /> {LABELS[type]}
                  </span>
                  {selected && (
                    <span className="btn-glacier absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-sm">
                      {pickIndex + 1}
                    </span>
                  )}
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
                aria-pressed={dealbreakers.has(d.value)}
                className={`rounded-full px-3.5 py-1.5 text-sm transition active:scale-[0.97] ${
                  dealbreakers.has(d.value)
                    ? "border border-rose-300 bg-rose-50 font-semibold text-rose-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                    : "btn-ice"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </section>

        </fieldset>

        {error && <p className="text-sm font-medium text-rose-300">{error}</p>}

        {!isLocked && (
          <button type="submit" disabled={saving} className={`${button.primary} w-full`}>
            {saving ? "Saving…" : savedAt ? <><Check size={18} /> Update my answers</> : "I'm in - submit"}
          </button>
        )}
      </form>
    </div>
  );
}
