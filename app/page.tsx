"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import Image from "next/image";
import {
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Snowflake,
} from "lucide-react";
import FadeInSection from "@/components/FadeInSection";
import MoodStrip from "@/components/landing/MoodStrip";
import SiteFooter from "@/components/landing/SiteFooter";
import StickyCta from "@/components/landing/StickyCta";
import CreateTripWizard, { CreatedTrip, pushWizardStep } from "@/components/CreateTripWizard";
import HeroReel from "@/components/HeroReel";
import HeroLabels from "@/components/landing/HeroLabels";
import PhotoBackdrop from "@/components/PhotoBackdrop";
import { PAGE_BACKGROUNDS } from "@/lib/backgrounds";
import { button, frostedCard, input } from "@/lib/ui";
import { saveClientSession, saveVibeHint } from "@/lib/client-session";
import { DestinationType } from "@/lib/types";

const HOW_IT_WORKS = [
  { title: "Share one link", body: "Everyone sets a PIN." },
  { title: "Everyone submits", body: "Budget, dates, vibe." },
  { title: "Lock a plan", body: "Together, or with a suggestion." },
];

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<"landing" | "wizard" | "created">("landing");
  const [created, setCreated] = useState<CreatedTrip | null>(null);
  const [copied, setCopied] = useState(false);
  const [pin, setPin] = useState("");
  const [settingPin, setSettingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const exitWizard = useCallback(() => {
    setView("landing");
  }, []);

  function startPlanning() {
    setView("wizard");
    pushWizardStep(0);
    window.scrollTo(0, 0);
  }

  function startWithVibe(vibe: DestinationType) {
    saveVibeHint(vibe);
    startPlanning();
  }

  function handleCreated(trip: CreatedTrip) {
    setCreated(trip);
    setView("created");
  }

  function handleCopy() {
    if (!created) return;
    navigator.clipboard.writeText(created.shareUrl);
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
    if (!created) return;
    const { tripId, coordinatorMemberId } = created;
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

  if (view === "created" && created) {
    return (
      <PhotoBackdrop photo={PAGE_BACKGROUNDS.created}>
        <div className={`w-full max-w-md ${frostedCard} animate-fade-up`}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-lg shadow-brand-700/30">
            <Sparkles size={26} />
          </div>
          <h1 className="mt-4 text-center font-display text-2xl font-bold text-stone-900">{created.tripName} is on!</h1>
          <p className="mt-2 text-center text-sm text-stone-600">
            First, set your own PIN and fill in your preferences. Then send the link below to the rest of the
            group.
          </p>

          <form onSubmit={handleSetPin} className="mt-5 space-y-3">
            <label className="block text-sm font-semibold text-stone-700">
              Set a 4-digit PIN for {created.coordinatorName}
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
              <code className="flex-1 overflow-x-auto text-sm text-stone-700">{created.shareUrl}</code>
              <button
                onClick={handleCopy}
                className="btn-glacier shrink-0 rounded-full p-2 transition active:scale-95"
                aria-label="Copy link"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>
      </PhotoBackdrop>
    );
  }

  if (view === "wizard") {
    return <CreateTripWizard onExit={exitWizard} onCreated={handleCreated} />;
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Hero: full-bleed photo background */}
      <div id="landing-hero" className="relative isolate overflow-hidden pb-16">
        <div className="absolute inset-0 -z-10">
          <Image src="/hero-bg.jpg" alt="" fill priority className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/55 to-white" />
        </div>

        {/* Nav */}
        <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 pt-6">
          <span className="font-display text-lg font-bold tracking-tight text-white">TripSync</span>
          <button
            onClick={startPlanning}
            className="btn-glass-dark rounded-full px-5 py-2.5 text-sm font-bold transition active:scale-[0.98]"
          >
            Start planning
          </button>
        </div>

        {/* Hero: the pitch on the left, the reel as a phone on the right. */}
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-4 pt-8 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:pt-10">
          <div className="relative z-10 text-center lg:text-left">
            <span className="inline-block rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur">
              For groups of 4–10 friends
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] text-white drop-shadow-md sm:text-6xl lg:text-7xl">
              The trip that actually happens
            </h1>
            <p className="mx-auto mt-5 max-w-md text-lg font-medium text-white/85 lg:mx-0">
              Everyone puts in their dates, budget and vibe. One plan comes out the other end.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 lg:items-start">
              <button
                onClick={startPlanning}
                className="btn-glacier inline-flex items-center gap-2 rounded-full px-7 py-4 text-base"
              >
                <Snowflake size={18} /> Start planning your trip <ArrowRight size={18} />
              </button>
              <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-semibold text-white/80 lg:justify-start">
                <span className="flex items-center gap-1">
                  <Check size={15} /> Free
                </span>
                <span className="flex items-center gap-1">
                  <Check size={15} /> No sign-up, just a PIN
                </span>
                <span className="flex items-center gap-1">
                  <Check size={15} /> Share on WhatsApp
                </span>
              </p>
            </div>
          </div>

          <div className="relative mx-auto lg:-rotate-2">
            <HeroReel caption="Manali, we're coming for you 🏔️" frame="phone" />
            <HeroLabels />
          </div>
        </div>
      </div>

      <MoodStrip onPick={startWithVibe} />

      {/* How it works */}
      <FadeInSection>
        <section className="mx-auto max-w-3xl px-4 pb-24 pt-20">
          <h2 className="font-display mb-10 text-center text-3xl font-bold">Three steps. No spreadsheets.</h2>
          <div className="flex flex-wrap items-start justify-center gap-x-0 gap-y-8">
            {HOW_IT_WORKS.map((item, i) => (
              <div key={item.title} className="flex items-start">
                <div className="flex w-48 flex-col items-center text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-base font-bold text-brand-800">
                    {i + 1}
                  </span>
                  <p className="mt-3 text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="mt-5 hidden h-0.5 w-16 bg-slate-100 sm:block" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-11 flex justify-center">
            <button onClick={startPlanning} className={button.primary}>
              Start planning your trip <ArrowRight size={18} />
            </button>
          </div>
        </section>
      </FadeInSection>

      <SiteFooter />
      <StickyCta targetId="landing-hero" onClick={startPlanning} />
    </div>
  );
}
