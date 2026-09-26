"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BadgeCheck, CalendarDays, Clock } from "lucide-react";
import { PAGE_BACKGROUNDS, PageBackgroundKey } from "@/lib/backgrounds";
import { formatCountdown, formatDateRange } from "@/lib/format";
import { onTripChanged } from "@/lib/trip-events";
import { Trip, TripOption } from "@/lib/types";

interface MemberRow {
  id: string;
  name: string;
  joined: boolean;
  submitted: boolean;
}

// Detail pages (one option, one chat) get a shorter band so the content -
// especially a chat thread - isn't pushed below the fold.
function backgroundFor(pathname: string, trip: Trip | null): { key: PageBackgroundKey; compact: boolean } {
  const [, , , section, detailId] = pathname.split("/");
  if (section === "options" && detailId) {
    const isLockedPlan = trip?.status === "locked" && trip.locked_option_id === detailId;
    return { key: isLockedPlan ? "locked" : "optionDetail", compact: true };
  }
  if (section === "chats") return { key: "chats", compact: Boolean(detailId) };
  if (section === "status" || section === "options" || section === "help" || section === "preferences") {
    return { key: section, compact: false };
  }
  return { key: "preferences", compact: false };
}

function avatarRing(member: MemberRow): string {
  if (member.submitted) return "ring-2 ring-sky-300";
  if (member.joined) return "outline-2 outline-dashed outline-amber-300 outline-offset-1";
  return "opacity-60 ring-1 ring-white/40";
}

function avatarLabel(member: MemberRow): string {
  if (member.submitted) return `${member.name} · submitted`;
  if (member.joined) return `${member.name} · joined, not submitted yet`;
  return `${member.name} · hasn't joined yet`;
}

// The trip's identity on every in-app page: a Manali photo chosen per page
// (shown full-screen behind the content), with the trip name, dates,
// countdown and who's in. Seeing the empty
// avatar rings is the gentle nudge that gets the last friends to submit.
export default function TripHeroBand({ tripId }: { tripId: string }) {
  const pathname = usePathname() ?? "";
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [lockedDestination, setLockedDestination] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [tripRes, membersRes] = await Promise.all([
        fetch(`/api/trips/${tripId}`),
        fetch(`/api/trips/${tripId}/members`),
      ]);
      if (cancelled) return;
      const nextTrip: Trip | null = tripRes.ok ? (await tripRes.json()).trip : null;
      setTrip(nextTrip);
      if (membersRes.ok) setMembers((await membersRes.json()).members ?? []);

      if (nextTrip?.status === "locked" && nextTrip.locked_option_id) {
        const optionsRes = await fetch(`/api/trips/${tripId}/options`);
        if (!cancelled && optionsRes.ok) {
          const options: TripOption[] = (await optionsRes.json()).options ?? [];
          setLockedDestination(options.find((o) => o.id === nextTrip.locked_option_id)?.destination ?? null);
        }
      }
    }
    load();
    const unsubscribe = onTripChanged(load);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [tripId, pathname]);

  const { key, compact } = backgroundFor(pathname, trip);
  const photo = PAGE_BACKGROUNDS[key];
  const submittedCount = members.filter((m) => m.submitted).length;
  const isLocked = trip?.status === "locked";

  return (
    <header className={`relative ${compact ? "h-40 sm:h-60" : "h-60 sm:h-72"}`}>
      {/* The page's photo fills the whole viewport behind everything, under
          the same dark scrim as the landing hero; cards float on it as glass. */}
      <div className="fixed inset-0 -z-10">
        <Image
          key={photo.src}
          src={photo.src}
          alt=""
          fill
          priority
          sizes="100vw"
          className="animate-[fade-in_0.6s_ease-out] object-cover"
          style={{ objectPosition: photo.position }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/65 via-slate-950/50 to-slate-950/80" />
      </div>

      <div className={`mx-auto flex h-full max-w-2xl flex-col justify-end px-4 sm:pt-20 ${compact ? "pb-12" : "pb-16"}`}>
        {trip && (
          <div className="animate-fade-up space-y-2.5">
            <h2 className="font-display text-2xl font-bold leading-tight text-white drop-shadow-md sm:text-3xl">
              {trip.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white">
              <span className="flex items-center gap-1 rounded-full bg-black/30 px-2.5 py-1 backdrop-blur-sm">
                <CalendarDays size={13} /> {formatDateRange(trip.date_window_start, trip.date_window_end)}
              </span>
              {isLocked ? (
                <Link
                  href={`/trip/${tripId}/options/${trip.locked_option_id}`}
                  className="btn-glacier flex items-center gap-1 rounded-full px-2.5 py-1 transition"
                >
                  <BadgeCheck size={13} /> Locked{lockedDestination ? ` · ${lockedDestination}` : ""}
                </Link>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-black/30 px-2.5 py-1 backdrop-blur-sm">
                  <Clock size={13} /> {formatCountdown(trip.response_deadline)} to respond
                </span>
              )}
              {!compact && members.length > 0 && (
                <span className="flex items-center gap-2 rounded-full bg-black/30 py-1 pl-1.5 pr-2.5 backdrop-blur-sm">
                  <span className="flex -space-x-1.5">
                    {members.map((m) => (
                      <span
                        key={m.id}
                        title={avatarLabel(m)}
                        aria-label={avatarLabel(m)}
                        className={`flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-800 ${avatarRing(m)}`}
                      >
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                    ))}
                  </span>
                  {submittedCount}/{members.length} in
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
