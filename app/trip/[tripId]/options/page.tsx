"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRequireTripSession } from "@/lib/TripSessionContext";
import { FitStatus, Trip, TripOption } from "@/lib/types";
import { CheckCircle2, TriangleAlert, XCircle, Sparkles, BadgeCheck, PenLine } from "lucide-react";
import { button, card, input, pageHeading, pageSubheading } from "@/lib/ui";

const FIT_ICON: Record<FitStatus, typeof CheckCircle2> = {
  good: CheckCircle2,
  compromise: TriangleAlert,
  conflict: XCircle,
};
const FIT_COLOR: Record<FitStatus, string> = {
  good: "bg-emerald-50 text-emerald-700",
  compromise: "bg-amber-50 text-amber-700",
  conflict: "bg-rose-50 text-rose-700",
};

export default function OptionsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = use(params);
  const { loading: sessionLoading } = useRequireTripSession();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [options, setOptions] = useState<TripOption[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPropose, setShowPropose] = useState(false);
  const [proposeDestination, setProposeDestination] = useState("");
  const [proposeSummary, setProposeSummary] = useState("");
  const [proposeCost, setProposeCost] = useState("");
  const [proposeRoadmap, setProposeRoadmap] = useState("");
  const [proposing, setProposing] = useState(false);
  const [proposeError, setProposeError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [tripRes, optionsRes, membersRes] = await Promise.all([
        fetch(`/api/trips/${tripId}`),
        fetch(`/api/trips/${tripId}/options`),
        fetch(`/api/trips/${tripId}/members`),
      ]);
      if (tripRes.ok) setTrip((await tripRes.json()).trip);
      if (optionsRes.ok) setOptions((await optionsRes.json()).options ?? []);
      if (membersRes.ok) setMembers((await membersRes.json()).members ?? []);
      setLoading(false);
    }
    load();
  }, [tripId]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    const res = await fetch(`/api/trips/${tripId}/options`, { method: "POST" });
    const json = await res.json();
    setGenerating(false);
    if (!res.ok) {
      setError(json.error ?? "Could not generate options");
      return;
    }
    setOptions(json.options ?? []);
  }

  async function handlePropose(e: React.FormEvent) {
    e.preventDefault();
    setProposeError(null);
    const cost = Number(proposeCost);
    if (!proposeDestination.trim()) {
      setProposeError("Give it a destination name");
      return;
    }
    if (!cost || cost <= 0) {
      setProposeError("Enter a valid estimated cost per person");
      return;
    }
    setProposing(true);
    const res = await fetch(`/api/trips/${tripId}/options/propose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination: proposeDestination,
        summary: proposeSummary,
        estCostPerPersonTotal: cost,
        roadmapText: proposeRoadmap,
      }),
    });
    const json = await res.json();
    setProposing(false);
    if (!res.ok) {
      setProposeError(json.error ?? "Could not add this option");
      return;
    }
    setOptions((prev) => [...prev, json.option]);
    setShowPropose(false);
    setProposeDestination("");
    setProposeSummary("");
    setProposeCost("");
    setProposeRoadmap("");
  }

  if (sessionLoading || loading) {
    return <p className="text-stone-500">Loading…</p>;
  }

  const memberNameById = new Map(members.map((m) => [m.id, m.name]));
  const isLocked = trip?.status === "locked";

  return (
    <div className="space-y-6">
      <div>
        <h1 className={pageHeading}>Trip options</h1>
        <p className={pageSubheading}>
          {isLocked
            ? "This trip is locked."
            : "Ask the app to plan 3 AI options from everyone's preferences, or add your own - anyone can lock the group's final pick."}
        </p>
      </div>

      {!isLocked && (
        <div className="space-y-2">
          <button onClick={handleGenerate} disabled={generating} className={`${button.primary} w-full`}>
            <Sparkles size={18} />
            {generating
              ? "Generating with Gemini…"
              : options.some((o) => o.tags.source === "ai")
              ? "Regenerate AI options"
              : "Ask the app for options"}
          </button>
          <button
            onClick={() => setShowPropose((v) => !v)}
            className={`${button.secondary} w-full`}
          >
            <PenLine size={18} /> {showPropose ? "Cancel" : "Propose your own option"}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {showPropose && (
        <form onSubmit={handlePropose} className={`${card} space-y-3`}>
          <input
            value={proposeDestination}
            onChange={(e) => setProposeDestination(e.target.value)}
            className={input}
            placeholder="Destination (e.g. Gokarna)"
          />
          <textarea
            value={proposeSummary}
            onChange={(e) => setProposeSummary(e.target.value)}
            rows={2}
            className={input}
            placeholder="Why this fits the group (optional)"
          />
          <input
            type="number"
            min={1}
            value={proposeCost}
            onChange={(e) => setProposeCost(e.target.value)}
            className={input}
            placeholder="Estimated cost per person (₹)"
          />
          <textarea
            value={proposeRoadmap}
            onChange={(e) => setProposeRoadmap(e.target.value)}
            rows={3}
            className={input}
            placeholder="Rough plan, one line per idea (optional)"
          />
          {proposeError && <p className="text-sm text-rose-600">{proposeError}</p>}
          <button type="submit" disabled={proposing} className={`${button.primary} w-full`}>
            {proposing ? "Adding…" : "Add this option"}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {options.map((option) => {
          const optionLocked = trip?.locked_option_id === option.id;
          return (
            <Link
              key={option.id}
              href={`/trip/${tripId}/options/${option.id}`}
              className={`block ${card} transition hover:shadow-md ${
                optionLocked ? "border-emerald-400 ring-1 ring-emerald-400" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-stone-900">{option.destination}</h2>
                <div className="flex shrink-0 items-center gap-1.5">
                  {option.tags.source === "manual" && (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
                      Proposed
                    </span>
                  )}
                  {optionLocked && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <BadgeCheck size={14} /> Locked
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm text-stone-600">{option.summary}</p>
              <p className="mt-2 text-sm font-semibold text-stone-800">
                ~₹{option.est_cost_per_person.total.toLocaleString("en-IN")} per person
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(option.fit_grid).map(([memberId, fit]) => {
                  const Icon = FIT_ICON[fit.status];
                  return (
                    <span
                      key={memberId}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${FIT_COLOR[fit.status]}`}
                      title={fit.reason}
                    >
                      <Icon size={13} /> {memberNameById.get(memberId) ?? "?"}
                    </span>
                  );
                })}
              </div>
            </Link>
          );
        })}
      </div>

      {options.length === 0 && !generating && (
        <p className="text-center text-sm text-stone-500">No options yet.</p>
      )}
      {options.length > 0 && !isLocked && (
        <p className="text-center text-sm text-stone-500">
          Open an option to review it fully and lock it in for the group.
        </p>
      )}
    </div>
  );
}
