"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Sparkles,
  MapPin,
  CalendarClock,
  UserRound,
  Users,
  Plus,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import FadeInSection from "@/components/FadeInSection";
import { button, card, input } from "@/lib/ui";
import { saveClientSession } from "@/lib/client-session";

const STEPS = ["name", "dates", "deadline", "you", "friends", "review"] as const;
type Step = (typeof STEPS)[number];

const HOW_IT_WORKS = [
  { title: "Share one link", body: "Everyone sets a PIN." },
  { title: "Everyone submits", body: "Budget, dates, vibe." },
  { title: "Lock a plan", body: "Together, or with a suggestion." },
];

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<"landing" | "wizard" | "created">("landing");
  const [stepIndex, setStepIndex] = useState(0);
  const step: Step = STEPS[stepIndex];

  const [tripName, setTripName] = useState("");
  const [dateWindowStart, setDateWindowStart] = useState("");
  const [dateWindowEnd, setDateWindowEnd] = useState("");
  const [responseDeadline, setResponseDeadline] = useState("");
  const [coordinatorName, setCoordinatorName] = useState("");
  const [memberNames, setMemberNames] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [tripId, setTripId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [coordinatorMemberId, setCoordinatorMemberId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [settingPin, setSettingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  function updateMemberName(index: number, value: string) {
    setMemberNames((names) => names.map((n, i) => (i === index ? value : n)));
  }

  function validateStep(): string | null {
    if (step === "name" && !tripName.trim()) return "Give the trip a name";
    if (step === "dates" && (!dateWindowStart || !dateWindowEnd)) return "Pick both dates";
    if (step === "dates" && new Date(dateWindowStart) > new Date(dateWindowEnd)) {
      return "Start date must be before end date";
    }
    if (step === "deadline" && !responseDeadline) return "Pick a response deadline";
    if (step === "you" && !coordinatorName.trim()) return "Enter your name";
    if (step === "friends" && memberNames.every((n) => !n.trim())) return "Add at least one friend";
    return null;
  }

  function goNext() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    if (stepIndex === 0) {
      setView("landing");
      return;
    }
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function handleCreate() {
    setError(null);
    setCreating(true);
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: tripName,
        dateWindowStart,
        dateWindowEnd,
        responseDeadline,
        coordinatorName,
        memberNames,
      }),
    });
    setCreating(false);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Could not create trip");
      return;
    }
    setTripId(json.tripId);
    setShareUrl(`${window.location.origin}${json.shareUrl}`);
    setCoordinatorMemberId(json.coordinatorMemberId);
    setView("created");
  }

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleSetPin(e: React.FormEvent) {
    e.preventDefault();
    setPinError(null);
    if (!/^\d{4}$/.test(pin)) {
      setPinError("PIN must be exactly 4 digits");
      return;
    }
    if (!tripId || !coordinatorMemberId) return;
    setSettingPin(true);
    const res = await fetch(`/api/trips/${tripId}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: coordinatorMemberId, pin }),
    });
    const json = await res.json();
    setSettingPin(false);
    if (!res.ok) {
      setPinError(json.error ?? "Something went wrong");
      return;
    }
    saveClientSession(tripId, { memberId: json.member.id, name: json.member.name });
    router.push(`/trip/${tripId}/preferences`);
  }

  if (view === "created") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 px-4 py-10">
        <div className={`w-full max-w-md ${card} animate-fade-up`}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white">
            <Sparkles size={26} />
          </div>
          <h1 className="mt-4 text-center text-xl font-bold text-stone-900">Trip created!</h1>
          <p className="mt-2 text-center text-sm text-stone-500">
            First, set your own PIN and fill in your preferences. Then send the link below to the rest of the
            group.
          </p>

          <form onSubmit={handleSetPin} className="mt-5 space-y-3">
            <label className="block text-sm font-semibold text-stone-700">
              Set a 4-digit PIN for {coordinatorName}
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className={`${input} tracking-[0.5em]`}
              placeholder="••••"
              autoFocus
            />
            {pinError && <p className="text-sm text-rose-600">{pinError}</p>}
            <button type="submit" disabled={settingPin} className={`${button.primary} w-full`}>
              {settingPin ? "Continuing…" : "Continue to my preferences"} <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-6 border-t border-stone-100 pt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
              Send this to the group
            </p>
            <div className="flex items-center gap-2 rounded-2xl border-2 border-stone-200 bg-stone-50 p-3">
              <code className="flex-1 overflow-x-auto text-sm text-stone-700">{shareUrl}</code>
              <button
                onClick={handleCopy}
                className="shrink-0 rounded-full bg-stone-900 p-2 text-white transition active:scale-95"
                aria-label="Copy link"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "wizard") {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50 px-4 py-8">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-1.5">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIndex ? "w-6 bg-teal-600" : i < stepIndex ? "w-1.5 bg-teal-300" : "w-1.5 bg-stone-200"
                }`}
              />
            ))}
          </div>

          <div className={`${card} animate-fade-up`} key={step}>
            {step === "name" && (
              <div>
                <MapPin className="mb-3 text-teal-600" size={28} />
                <h2 className="text-lg font-bold text-stone-900">What&apos;s this trip called?</h2>
                <input
                  autoFocus
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  className={`${input} mt-4`}
                  placeholder="e.g. College Friends Trip"
                />
              </div>
            )}

            {step === "dates" && (
              <div>
                <CalendarClock className="mb-3 text-teal-600" size={28} />
                <h2 className="text-lg font-bold text-stone-900">When&apos;s the window?</h2>
                <p className="mt-1 text-sm text-stone-500">
                  The outer range everyone will pick their own available dates within.
                </p>
                <div className="mt-4 flex gap-3">
                  <input
                    type="date"
                    value={dateWindowStart}
                    onChange={(e) => setDateWindowStart(e.target.value)}
                    className={input}
                  />
                  <input
                    type="date"
                    value={dateWindowEnd}
                    onChange={(e) => setDateWindowEnd(e.target.value)}
                    className={input}
                  />
                </div>
              </div>
            )}

            {step === "deadline" && (
              <div>
                <CalendarClock className="mb-3 text-teal-600" size={28} />
                <h2 className="text-lg font-bold text-stone-900">Response deadline?</h2>
                <p className="mt-1 text-sm text-stone-500">When should everyone have submitted by?</p>
                <input
                  type="datetime-local"
                  value={responseDeadline}
                  onChange={(e) => setResponseDeadline(e.target.value)}
                  className={`${input} mt-4`}
                />
              </div>
            )}

            {step === "you" && (
              <div>
                <UserRound className="mb-3 text-teal-600" size={28} />
                <h2 className="text-lg font-bold text-stone-900">What&apos;s your name?</h2>
                <p className="mt-1 text-sm text-stone-500">You&apos;ll be the trip coordinator.</p>
                <input
                  autoFocus
                  value={coordinatorName}
                  onChange={(e) => setCoordinatorName(e.target.value)}
                  className={`${input} mt-4`}
                  placeholder="e.g. Riya"
                />
              </div>
            )}

            {step === "friends" && (
              <div>
                <Users className="mb-3 text-teal-600" size={28} />
                <h2 className="text-lg font-bold text-stone-900">Who else is coming?</h2>
                <div className="mt-4 space-y-2">
                  {memberNames.map((name, i) => (
                    <input
                      key={i}
                      value={name}
                      onChange={(e) => updateMemberName(i, e.target.value)}
                      className={input}
                      placeholder={`Friend ${i + 1} name`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setMemberNames((names) => [...names, ""])}
                  className={`${button.ghost} mt-2`}
                >
                  <Plus size={16} /> Add another
                </button>
              </div>
            )}

            {step === "review" && (
              <div>
                <Sparkles className="mb-3 text-teal-600" size={28} />
                <h2 className="text-lg font-bold text-stone-900">Ready to create it?</h2>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Trip</dt>
                    <dd className="font-medium text-stone-800">{tripName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Dates</dt>
                    <dd className="font-medium text-stone-800">
                      {dateWindowStart} → {dateWindowEnd}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Coordinator</dt>
                    <dd className="font-medium text-stone-800">{coordinatorName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Friends</dt>
                    <dd className="font-medium text-stone-800">
                      {memberNames.filter((n) => n.trim()).join(", ") || "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

            <div className="mt-6 flex gap-3">
              <button onClick={goBack} className={button.secondary} disabled={creating}>
                <ArrowLeft size={18} />
              </button>
              {step === "review" ? (
                <button onClick={handleCreate} disabled={creating} className={`${button.primary} flex-1`}>
                  {creating ? "Creating…" : "Create trip & get link"}
                </button>
              ) : (
                <button onClick={goNext} className={`${button.primary} flex-1`}>
                  Next <ArrowRight size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-6">
        <span className="font-display text-lg font-bold tracking-tight">TripSync</span>
        <button
          onClick={() => setView("wizard")}
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700"
        >
          Start planning
        </button>
      </div>

      {/* Hero copy */}
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 pb-6 pt-12 text-center">
        <span className="rounded-full bg-teal-50 px-3.5 py-1.5 text-xs font-bold text-teal-700">
          For groups of 4–10 friends
        </span>
        <h1 className="font-display mt-5 max-w-xl text-4xl font-bold leading-tight md:text-5xl">
          The trip that actually happens
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg font-medium text-slate-500">
          Everyone puts in what works for them. One plan comes out the other end.
        </p>
        <button
          onClick={() => setView("wizard")}
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-teal-600 px-7 py-4 text-base font-bold text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-500 active:scale-95"
        >
          Start planning your trip <ArrowRight size={18} />
        </button>
      </div>

      {/* Hero video: the hook, centered, nothing overlaid */}
      <div className="mx-auto max-w-3xl px-4 pt-10">
        <div className="overflow-hidden rounded-[28px] bg-slate-900" style={{ aspectRatio: "16 / 9" }}>
          <iframe
            src="https://drive.google.com/file/d/1CTUjvdopRphj82BkXVWzb6uTDAQKoWSp/preview"
            className="h-full w-full"
            allow="autoplay"
            allowFullScreen
          />
        </div>
      </div>

      {/* How it works */}
      <FadeInSection>
        <section className="mx-auto max-w-3xl px-4 pb-24 pt-20">
          <h2 className="font-display mb-10 text-center text-2xl font-bold">Start planning in three steps</h2>
          <div className="flex flex-wrap items-start justify-center gap-x-0 gap-y-8">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={item.title} className="flex items-start">
                <div className="flex w-48 flex-col items-center text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-base font-bold text-teal-700">
                    {i + 1}
                  </span>
                  <p className="mt-3 text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.body}</p>
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="mt-5 hidden h-0.5 w-16 bg-slate-100 sm:block" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-11 flex justify-center">
            <button onClick={() => setView("wizard")} className={button.primary}>
              Start planning your trip <ArrowRight size={18} />
            </button>
          </div>
        </section>
      </FadeInSection>
    </div>
  );
}
