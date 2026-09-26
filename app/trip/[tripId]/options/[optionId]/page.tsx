"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireTripSession } from "@/lib/TripSessionContext";
import { FitStatus, OptionEnrichment, Trip, TripOption } from "@/lib/types";
import {
  ArrowLeft,
  CheckCircle2,
  TriangleAlert,
  XCircle,
  CloudSun,
  Landmark,
  BedDouble,
  BadgeCheck,
  MapPin,
} from "lucide-react";
import { button, card, pageHeading } from "@/lib/ui";

const FIT_ICON: Record<FitStatus, typeof CheckCircle2> = {
  good: CheckCircle2,
  compromise: TriangleAlert,
  conflict: XCircle,
};
const FIT_COLOR: Record<FitStatus, string> = {
  good: "text-emerald-600",
  compromise: "text-amber-600",
  conflict: "text-rose-600",
};

export default function OptionDetailPage({
  params,
}: {
  params: Promise<{ tripId: string; optionId: string }>;
}) {
  const { tripId, optionId } = use(params);
  const router = useRouter();
  const { session, loading: sessionLoading } = useRequireTripSession();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [option, setOption] = useState<TripOption | null>(null);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrichment, setEnrichment] = useState<OptionEnrichment | null>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [tripRes, optionsRes, membersRes] = await Promise.all([
        fetch(`/api/trips/${tripId}`),
        fetch(`/api/trips/${tripId}/options`),
        fetch(`/api/trips/${tripId}/members`),
      ]);
      if (tripRes.ok) setTrip((await tripRes.json()).trip);
      if (optionsRes.ok) {
        const json = await optionsRes.json();
        const found = (json.options as TripOption[]).find((o) => o.id === optionId);
        setOption(found ?? null);
      }
      if (membersRes.ok) setMembers((await membersRes.json()).members ?? []);
      setLoading(false);
    }
    load();
  }, [tripId, optionId]);

  useEffect(() => {
    async function loadEnrichment() {
      const res = await fetch(`/api/trips/${tripId}/options/${optionId}/enrich`);
      if (res.ok) setEnrichment((await res.json()).enrichment ?? null);
      setEnrichmentLoading(false);
    }
    loadEnrichment();
  }, [tripId, optionId]);

  async function handleLock() {
    setLocking(true);
    setError(null);
    const res = await fetch(`/api/trips/${tripId}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId }),
    });
    const json = await res.json();
    setLocking(false);
    if (!res.ok) {
      setError(json.error ?? "Could not lock this option");
      return;
    }
    setTrip(json.trip);
  }

  if (sessionLoading || loading) {
    return <p className="text-stone-500">Loading…</p>;
  }
  if (!option) {
    return <p className="text-stone-600">Option not found.</p>;
  }

  // Any signed-in member can lock - it's the group's decision, not just the coordinator's.
  const canLock = Boolean(session);
  const isLocked = trip?.status === "locked";
  const isThisLocked = trip?.locked_option_id === option.id;
  const memberNameById = new Map(members.map((m) => [m.id, m.name]));
  const cost = option.est_cost_per_person;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push(`/trip/${tripId}/options`)}
        className="flex items-center gap-1 text-sm font-semibold text-orange-600"
      >
        <ArrowLeft size={16} /> All options
      </button>

      <div>
        <h1 className={`${pageHeading} flex items-center gap-2`}>
          <MapPin className="text-orange-500" size={22} /> {option.destination}
        </h1>
        <p className="mt-1 text-sm text-stone-600">{option.summary}</p>
      </div>

      <section className={card}>
        <h2 className="mb-2 text-sm font-bold text-stone-800">Estimated cost per person</h2>
        <dl className="grid grid-cols-2 gap-y-1.5 text-sm text-stone-600">
          <dt>Travel</dt>
          <dd className="text-right">₹{cost.travel.toLocaleString("en-IN")}</dd>
          <dt>Stay</dt>
          <dd className="text-right">₹{cost.stay.toLocaleString("en-IN")}</dd>
          <dt>Food</dt>
          <dd className="text-right">₹{cost.food.toLocaleString("en-IN")}</dd>
          <dt>Activities</dt>
          <dd className="text-right">₹{cost.activities.toLocaleString("en-IN")}</dd>
          <dt className="border-t border-stone-100 pt-1.5 font-bold text-stone-800">Total</dt>
          <dd className="border-t border-stone-100 pt-1.5 text-right font-bold text-stone-800">
            ₹{cost.total.toLocaleString("en-IN")}
          </dd>
        </dl>
        <p className="mt-2 text-xs text-stone-400">All figures are estimates.</p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-stone-800">Where the group stands</h2>
        <ul className={`${card} divide-y divide-stone-100 !p-0`}>
          {Object.entries(option.fit_grid).map(([memberId, fit]) => {
            const Icon = FIT_ICON[fit.status];
            return (
              <li key={memberId} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium text-stone-800">{memberNameById.get(memberId) ?? "?"}</span>
                <span className={`flex items-center gap-1.5 ${FIT_COLOR[fit.status]}`}>
                  <Icon size={15} /> {fit.reason.split(": ").slice(1).join(": ")}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-stone-800">Day-by-day roadmap</h2>
        <ol className="space-y-3">
          {option.roadmap.map((day) => (
            <li key={day.day} className={card}>
              <p className="flex items-center gap-2 text-sm font-bold text-stone-800">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs text-white">
                  {day.day}
                </span>
                {day.title}
              </p>
              <ul className="mt-2 ml-8 list-outside list-disc space-y-1 text-sm text-stone-600">
                {day.activities.map((activity, i) => (
                  <li key={i}>{activity}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold text-stone-800">Local info</h2>
        {enrichmentLoading ? (
          <p className="text-sm text-stone-500">Loading local info…</p>
        ) : (
          <div className="space-y-3">
            {enrichment?.weather && (
              <div className={card}>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                  <CloudSun size={14} />
                  {enrichment.weather.isForecast
                    ? "Weather forecast"
                    : "Weather around these dates last year (no forecast this far out)"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {enrichment.weather.days.map((d) => (
                    <div key={d.date} className="rounded-xl bg-stone-50 px-2.5 py-1.5 text-xs text-stone-700">
                      {d.date.slice(5)}: {Math.round(d.minC)}–{Math.round(d.maxC)}°C
                      {d.precipMm > 0 ? `, ${d.precipMm.toFixed(0)}mm rain` : ""}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {enrichment?.attractions && enrichment.attractions.length > 0 && (
              <div className={card}>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                  <Landmark size={14} /> Nearby attractions
                </p>
                <ul className="space-y-1 text-sm text-stone-700">
                  {enrichment.attractions.map((a, i) => (
                    <li key={i}>
                      {a.name} <span className="text-stone-400">({a.kind})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {enrichment?.stays && enrichment.stays.length > 0 && (
              <div className={card}>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                  <BedDouble size={14} /> Places to stay
                </p>
                <ul className="space-y-1 text-sm text-stone-700">
                  {enrichment.stays.map((s, i) => (
                    <li key={i}>
                      {s.name}
                      {s.distanceKm !== null ? (
                        <span className="text-stone-400"> ({s.distanceKm} km away)</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {enrichment &&
              !enrichment.weather &&
              !enrichment.attractions?.length &&
              !enrichment.stays?.length && (
                <p className="text-sm text-stone-500">
                  Local info isn&apos;t available for this option right now.
                </p>
              )}
          </div>
        )}
      </section>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {isThisLocked && (
        <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <BadgeCheck size={18} /> This is the locked trip plan.
        </p>
      )}
      {!isLocked && canLock && (
        <button onClick={handleLock} disabled={locking} className={`${button.success} w-full`}>
          {locking ? "Locking…" : "Lock this option for the group"}
        </button>
      )}
    </div>
  );
}
