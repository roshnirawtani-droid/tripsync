"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, Snowflake, Users, X } from "lucide-react";
import PhotoBackdrop from "@/components/PhotoBackdrop";
import { PAGE_BACKGROUNDS } from "@/lib/backgrounds";
import { formatDateRange } from "@/lib/format";
import { button, frostedCard, input, label as labelClass } from "@/lib/ui";

export interface CreatedTrip {
  tripId: string;
  shareUrl: string;
  coordinatorMemberId: string;
  tripName: string;
  coordinatorName: string;
}

const STEPS = [
  { key: "trip", title: "What's the trip called?", icon: MapPin },
  { key: "when", title: "When are you going?", icon: CalendarDays },
  { key: "who", title: "Who's coming?", icon: Users },
] as const;

const NAME_IDEAS = ["Manali Winter Escape", "College Gang Reunion", "Birthday Getaway"];

// Each step is a browser history entry, so the phone's back gesture and
// the browser Back button step backwards through the wizard like an app
// instead of leaving the page.
const HISTORY_KEY = "tsWizardStep";

export function pushWizardStep(step: number): void {
  window.history.pushState({ [HISTORY_KEY]: step }, "");
}

// Defaults the answer deadline to a week before the trip at 9pm, the most
// common choice, as long as that is still in the future.
function suggestedDeadline(start: string): string {
  const d = new Date(`${start}T21:00:00`);
  d.setDate(d.getDate() - 7);
  if (d.getTime() <= Date.now()) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T21:00`;
}

export default function CreateTripWizard({
  onExit,
  onCreated,
}: {
  onExit: () => void;
  onCreated: (trip: CreatedTrip) => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const stepRef = useRef(0);

  const [tripName, setTripName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [deadline, setDeadline] = useState("");
  const [coordinatorName, setCoordinatorName] = useState("");
  const [friends, setFriends] = useState<string[]>([]);
  const [friendDraft, setFriendDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    function handlePopState(e: PopStateEvent) {
      const step = e.state?.[HISTORY_KEY];
      if (typeof step !== "number") {
        onExit();
        return;
      }
      setDirection(step < stepRef.current ? -1 : 1);
      stepRef.current = step;
      setStepIndex(step);
      setError(null);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [onExit]);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  function validate(): string | null {
    if (step.key === "trip" && !tripName.trim()) return "Give the trip a name";
    if (step.key === "when") {
      if (!start || !end) return "Pick both dates";
      if (new Date(start) > new Date(end)) return "The trip has to start before it ends";
      if (!deadline) return "Pick when answers are due";
    }
    if (step.key === "who") {
      if (!coordinatorName.trim()) return "Add your name";
      if (friends.length === 0 && !friendDraft.trim()) return "Add at least one friend";
    }
    return null;
  }

  function addFriend(name: string) {
    const clean = name.trim().replace(/,$/, "").trim();
    if (!clean) return;
    setFriends((prev) => (prev.some((f) => f.toLowerCase() === clean.toLowerCase()) ? prev : [...prev, clean]));
    setFriendDraft("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    if (!isLast) {
      const next = stepIndex + 1;
      setDirection(1);
      stepRef.current = next;
      setStepIndex(next);
      pushWizardStep(next);
      return;
    }

    const memberNames = friendDraft.trim() ? [...friends, friendDraft.trim()] : friends;
    setCreating(true);
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: tripName,
        dateWindowStart: start,
        dateWindowEnd: end,
        responseDeadline: deadline,
        coordinatorName,
        memberNames,
      }),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(json.error ?? "Could not create the trip");
      return;
    }
    onCreated({
      tripId: json.tripId,
      shareUrl: `${window.location.origin}${json.shareUrl}`,
      coordinatorMemberId: json.coordinatorMemberId,
      tripName: tripName.trim(),
      coordinatorName: coordinatorName.trim(),
    });
  }

  const Icon = step.icon;
  const summary = [
    tripName.trim(),
    start && end && new Date(start) <= new Date(end) ? formatDateRange(start, end) : null,
    friends.length ? `${friends.length + 1} people` : null,
  ].filter(Boolean);

  return (
    <PhotoBackdrop photo={PAGE_BACKGROUNDS.wizard}>
      <div className="w-full max-w-md">
        {/* App-style top bar: exit, progress, step count. */}
        <div className="mb-4 flex items-center gap-3 text-white">
          <button
            type="button"
            onClick={onExit}
            aria-label="Close and go back to the home page"
            className="btn-glass-dark flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-95"
          >
            <X size={18} />
          </button>
          <div
            className="flex flex-1 gap-1.5"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={stepIndex + 1}
            aria-label="Trip setup progress"
          >
            {STEPS.map((s, i) => (
              <span key={s.key} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
                <span
                  className={`block h-full rounded-full bg-white transition-all duration-500 ${i <= stepIndex ? "w-full" : "w-0"}`}
                />
              </span>
            ))}
          </div>
          <span className="shrink-0 text-xs font-bold tabular-nums text-white/90">
            {stepIndex + 1}/{STEPS.length}
          </span>
        </div>

        <form onSubmit={handleSubmit} className={`${frostedCard} overflow-hidden`} noValidate>
          <div
            key={step.key}
            className={direction === 1 ? "animate-[slide-in-right_0.35s_ease-out]" : "animate-[slide-in-left_0.35s_ease-out]"}
          >
            <Icon className="text-sky-800" size={26} />
            <h1 className="mt-2 font-display text-2xl font-bold text-stone-900">{step.title}</h1>

            {step.key === "trip" && (
              <div className="mt-4 space-y-3">
                <input
                  autoFocus
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  className={input}
                  placeholder="e.g. Manali Winter Escape"
                  aria-label="Trip name"
                />
                <div className="flex flex-wrap gap-2">
                  {NAME_IDEAS.map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => setTripName(idea)}
                      className="btn-ice rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-[0.97]"
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step.key === "when" && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={labelClass}>From</span>
                    <input
                      type="date"
                      value={start}
                      onChange={(e) => {
                        setStart(e.target.value);
                        if (!deadline && e.target.value) setDeadline(suggestedDeadline(e.target.value));
                      }}
                      className={input}
                    />
                  </label>
                  <label className="block">
                    <span className={labelClass}>To</span>
                    <input
                      type="date"
                      value={end}
                      min={start || undefined}
                      onChange={(e) => setEnd(e.target.value)}
                      className={input}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className={labelClass}>Everyone answers by</span>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className={input}
                  />
                </label>
              </div>
            )}

            {step.key === "who" && (
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className={labelClass}>Your name (you&apos;re the organiser)</span>
                  <input
                    autoFocus
                    value={coordinatorName}
                    onChange={(e) => setCoordinatorName(e.target.value)}
                    className={input}
                    placeholder="e.g. Meera"
                  />
                </label>
                <div>
                  <span className={labelClass}>Friends</span>
                  {friends.length > 0 && (
                    <ul className="mb-2 flex flex-wrap gap-1.5">
                      {friends.map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-1 rounded-full bg-sky-100 py-1 pl-3 pr-1 text-sm font-semibold text-sky-900"
                        >
                          {f}
                          <button
                            type="button"
                            onClick={() => setFriends((prev) => prev.filter((x) => x !== f))}
                            aria-label={`Remove ${f}`}
                            className="flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-sky-200"
                          >
                            <X size={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <input
                    value={friendDraft}
                    onChange={(e) => {
                      if (e.target.value.endsWith(",")) addFriend(e.target.value);
                      else setFriendDraft(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && friendDraft.trim()) {
                        e.preventDefault();
                        addFriend(friendDraft);
                      }
                    }}
                    onBlur={() => addFriend(friendDraft)}
                    className={input}
                    placeholder={friends.length ? "Add another…" : "Type a name, press Enter"}
                    aria-label="Add a friend"
                  />
                </div>
              </div>
            )}
          </div>

          <p role="alert" className="mt-3 min-h-5 text-sm text-rose-700">
            {error}
          </p>

          <div className="mt-2 flex gap-3">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => window.history.back()}
                className={button.secondary}
                aria-label="Previous step"
                disabled={creating}
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <button type="submit" disabled={creating} className={`${button.primary} flex-1`}>
              {isLast ? (
                <>
                  <Snowflake size={18} /> {creating ? "Creating…" : "Create trip"}
                </>
              ) : (
                <>
                  Continue <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
          <p className="mt-3 hidden text-center text-xs text-stone-500 sm:block">
            Press <kbd className="rounded border border-stone-300 bg-white px-1 font-sans">Enter</kbd> to continue
          </p>
        </form>

        {summary.length > 0 && (
          <p className="mt-4 text-center text-sm font-semibold text-white drop-shadow">{summary.join(" · ")}</p>
        )}
      </div>
    </PhotoBackdrop>
  );
}
