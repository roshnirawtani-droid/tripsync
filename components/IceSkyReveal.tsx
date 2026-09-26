"use client";

import { Send, Snowflake, Users, CalendarDays } from "lucide-react";

interface IceSkyRevealProps {
  tripName: string;
  destination: string;
  dates: string;
  travellers: string[];
  shareUrl: string;
}

// Faint stars as layered radial gradients - no images, no JS.
const STARS = [
  "radial-gradient(2.5px 2.5px at 6% 14%, rgba(255,255,255,0.95), transparent)",
  "radial-gradient(1.5px 1.5px at 14% 30%, rgba(255,255,255,0.7), transparent)",
  "radial-gradient(1.5px 1.5px at 21% 9%, rgba(255,255,255,0.7), transparent)",
  "radial-gradient(2.5px 2.5px at 29% 22%, rgba(255,255,255,0.95), transparent)",
  "radial-gradient(1.5px 1.5px at 35% 40%, rgba(255,255,255,0.7), transparent)",
  "radial-gradient(1.5px 1.5px at 42% 15%, rgba(255,255,255,0.7), transparent)",
  "radial-gradient(2.5px 2.5px at 49% 31%, rgba(255,255,255,0.95), transparent)",
  "radial-gradient(1.5px 1.5px at 57% 8%, rgba(255,255,255,0.7), transparent)",
  "radial-gradient(1.5px 1.5px at 63% 24%, rgba(255,255,255,0.7), transparent)",
  "radial-gradient(2.5px 2.5px at 70% 38%, rgba(255,255,255,0.95), transparent)",
  "radial-gradient(1.5px 1.5px at 76% 12%, rgba(255,255,255,0.7), transparent)",
  "radial-gradient(1.5px 1.5px at 83% 27%, rgba(255,255,255,0.7), transparent)",
  "radial-gradient(2.5px 2.5px at 90% 10%, rgba(255,255,255,0.95), transparent)",
  "radial-gradient(1.5px 1.5px at 94% 34%, rgba(255,255,255,0.7), transparent)",
  "radial-gradient(1.5px 1.5px at 11% 46%, rgba(255,255,255,0.7), transparent)",
  "radial-gradient(2.5px 2.5px at 47% 48%, rgba(255,255,255,0.95), transparent)",
  "radial-gradient(1.5px 1.5px at 67% 50%, rgba(255,255,255,0.7), transparent)",
  "radial-gradient(1.5px 1.5px at 86% 47%, rgba(255,255,255,0.7), transparent)",
].join(", ");

// The payoff once the group locks a plan: a clear, icy Himalayan sky with
// the destination revealed on a sheet of frosted ice. Worth a screenshot,
// and the share button carries it into every other group chat.
export default function IceSkyReveal({ tripName, destination, dates, travellers, shareUrl }: IceSkyRevealProps) {
  const shareText = `It's happening! "${tripName}" is locked: ${destination}, ${dates}. ${travellers.join(", ")} - see the plan: ${shareUrl}`;

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${tripName} - ${destination}`, text: shareText });
        return;
      } catch {
        // Cancelled or unsupported payload - fall back to WhatsApp below.
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <section
      aria-label={`Trip locked: ${destination}`}
      className="relative isolate animate-fade-up overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#071426] via-[#12365e] to-[#7fb2d9] px-5 pb-28 pt-8 text-white shadow-2xl shadow-sky-950/40 sm:px-8"
    >
      {/* Sky: stars, then two soft aurora glows drifting slowly. */}
      <div aria-hidden className="absolute inset-0 -z-10" style={{ backgroundImage: STARS }} />
      <div
        aria-hidden
        className="absolute -left-1/4 top-6 -z-10 h-40 w-3/4 rounded-full bg-cyan-300/30 blur-3xl motion-safe:animate-[aurora_14s_ease-in-out_infinite_alternate]"
      />
      <div
        aria-hidden
        className="absolute -right-1/4 top-16 -z-10 h-36 w-2/3 rounded-full bg-violet-400/25 blur-3xl motion-safe:animate-[aurora_18s_ease-in-out_infinite_alternate-reverse]"
      />
      <Snowflake aria-hidden size={140} strokeWidth={0.6} className="absolute -right-8 -top-8 -z-10 text-white/10" />

      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-sky-100">
        <Snowflake size={13} /> Clear skies ahead
      </p>

      {/* The sheet of ice */}
      <div className="mt-5 rounded-3xl border border-white/30 bg-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] backdrop-blur-md">
        <p className="text-sm font-medium text-sky-100">It&apos;s locked. You&apos;re going to</p>
        <p className="mt-1 font-display text-5xl font-bold leading-none drop-shadow-[0_2px_12px_rgba(125,211,252,0.45)] sm:text-6xl">
          {destination}
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
          <span className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5">
            <CalendarDays size={15} /> {dates}
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5">
            <Users size={15} /> {travellers.length} friends
          </span>
        </div>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {travellers.map((name) => (
            <li
              key={name}
              className="rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-sky-950 shadow-sm"
            >
              {name}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={handleShare}
        className="btn-ice mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-bold transition active:scale-[0.98]"
      >
        <Send size={18} /> Share the news
      </button>

      {/* Himalayan ridge silhouette closing off the sky. */}
      <svg
        aria-hidden
        viewBox="0 0 400 90"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 -z-10 h-24 w-full"
      >
        <path
          d="M0 90 L0 58 L38 34 L62 48 L96 18 L128 44 L150 36 L184 8 L214 40 L240 30 L272 52 L300 22 L332 46 L360 36 L400 56 L400 90 Z"
          fill="#0b2340"
          fillOpacity="0.55"
        />
        <path
          d="M0 90 L0 70 L44 52 L80 66 L118 40 L150 62 L196 34 L236 60 L270 48 L310 68 L352 50 L400 72 L400 90 Z"
          fill="#061528"
        />
        <path d="M184 8 L176 18 L184 15 L192 19 Z M96 18 L90 26 L97 23 L103 27 Z M300 22 L294 30 L301 27 L307 31 Z" fill="#e0f2fe" fillOpacity="0.8" />
      </svg>
    </section>
  );
}
