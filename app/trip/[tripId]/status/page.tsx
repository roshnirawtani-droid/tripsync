"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRequireTripSession } from "@/lib/TripSessionContext";
import { Trip } from "@/lib/types";
import { formatCountdown, formatDateRange } from "@/lib/format";
import { BadgeCheck, CheckCircle2, Hourglass, Circle, TriangleAlert, Send, Link2, Check } from "lucide-react";
import { button, card, pageHeading, pageSubheading } from "@/lib/ui";

interface MemberRow {
  id: string;
  name: string;
  joined: boolean;
  submitted: boolean;
}

// wa.me with only ?text opens WhatsApp's own contact picker, so the
// nudge works without us ever knowing anyone's phone number.
function whatsappLink(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export default function StatusPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = use(params);
  const { session, loading: sessionLoading } = useRequireTripSession();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const [tripRes, membersRes] = await Promise.all([
        fetch(`/api/trips/${tripId}`),
        fetch(`/api/trips/${tripId}/members`),
      ]);
      if (tripRes.ok) setTrip((await tripRes.json()).trip);
      if (membersRes.ok) setMembers((await membersRes.json()).members ?? []);
      setLoading(false);
    }
    load();
  }, [tripId]);

  function handleCopy() {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (sessionLoading || loading) {
    return <p className="pt-10 text-white/80">Loading…</p>;
  }
  if (!trip) {
    return <p className="pt-10 text-white">Trip not found.</p>;
  }

  const submittedCount = members.filter((m) => m.submitted).length;
  const allSubmitted = members.length > 0 && submittedCount === members.length;
  const pct = members.length ? (submittedCount / members.length) * 100 : 0;
  const isLocked = trip.status === "locked";
  // Only reached after the client-side fetch, so window is always defined here.
  const joinUrl = `${window.location.origin}/trip/${tripId}/join`;
  const dates = formatDateRange(trip.date_window_start, trip.date_window_end);

  const nudgeMessage = (name: string) =>
    `Hey ${name}! We're planning "${trip.name}" (${dates}) on TripSync. Add your dates, budget and vibe so we can lock it in - ${formatCountdown(trip.response_deadline)}: ${joinUrl}`;
  const inviteMessage = `We're planning "${trip.name}" (${dates}) on TripSync! Pick your name, add your dates, budget and vibe here: ${joinUrl}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className={pageHeading}>Who&apos;s in?</h1>
        <p className={pageSubheading}>
          {isLocked
            ? "The plan is locked - see you in the mountains."
            : allSubmitted
            ? "Everyone has answered. Time to pick a plan."
            : "Nudge the stragglers - the plan gets better with every answer."}
        </p>
      </div>

      {isLocked && (
        <Link
          href={`/trip/${tripId}/options/${trip.locked_option_id}`}
          className="flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800 ring-1 ring-sky-200 transition hover:bg-sky-100"
        >
          <BadgeCheck size={18} /> The trip is locked. See the final plan →
        </Link>
      )}

      <div className={card}>
        <div className="flex items-baseline justify-between">
          <p className="font-display text-3xl font-bold text-stone-900">
            {submittedCount}
            <span className="text-lg text-stone-400"> / {members.length}</span>
          </p>
          <p className="text-sm font-medium text-stone-500">submitted</p>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-700 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        {!isLocked && (
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={whatsappLink(inviteMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glacier inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition active:scale-[0.98]"
            >
              <Send size={16} /> Share invite on WhatsApp
            </a>
            <button onClick={handleCopy} className={`${button.secondary} !px-4 !py-2 !text-sm`}>
              {copied ? <Check size={16} /> : <Link2 size={16} />} {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        )}
      </div>

      <ul className="space-y-2">
        {members.map((m) => {
          const isMe = m.id === session?.memberId;
          return (
            <li key={m.id} className={`flex items-center justify-between gap-3 ${card} !py-3`}>
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800 ${
                    m.submitted ? "ring-2 ring-sky-400" : ""
                  }`}
                >
                  {m.name.charAt(0).toUpperCase()}
                </span>
                <span className="truncate text-sm font-medium text-stone-800">
                  {m.name}
                  {isMe && <span className="text-stone-500"> (you)</span>}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {m.submitted ? (
                  <span className="flex items-center gap-1 text-sm font-medium text-sky-700">
                    <CheckCircle2 size={16} /> Submitted
                  </span>
                ) : m.joined ? (
                  <span className="flex items-center gap-1 text-sm font-medium text-amber-700">
                    <Hourglass size={16} /> Joined
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-stone-500">
                    <Circle size={16} /> Not joined
                  </span>
                )}
                {!m.submitted && !isMe && !isLocked && (
                  <a
                    href={whatsappLink(nudgeMessage(m.name))}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Nudge ${m.name} on WhatsApp`}
                    className="btn-ice inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition active:scale-[0.97]"
                  >
                    <Send size={12} /> Nudge
                  </a>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {!allSubmitted && !isLocked && (
        <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <span>
            Options planned now will be marked <strong>incomplete</strong> until everyone has responded.
          </span>
        </p>
      )}
    </div>
  );
}
