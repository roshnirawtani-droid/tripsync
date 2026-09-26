"use client";

import { use, useEffect, useState } from "react";
import { useRequireTripSession } from "@/lib/TripSessionContext";
import { Trip } from "@/lib/types";
import { Clock, CheckCircle2, Hourglass, Circle, TriangleAlert } from "lucide-react";
import { card, pageHeading } from "@/lib/ui";

interface MemberRow {
  id: string;
  name: string;
  joined: boolean;
  submitted: boolean;
}

function formatCountdown(deadline: string): string {
  const diffMs = new Date(deadline).getTime() - Date.now();
  if (diffMs <= 0) return "Deadline passed";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h left`;
  const minutes = Math.floor(diffMs / (1000 * 60));
  return `${hours}h ${minutes % 60}m left`;
}

export default function StatusPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = use(params);
  const { loading: sessionLoading } = useRequireTripSession();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (sessionLoading || loading) {
    return <p className="text-stone-500">Loading…</p>;
  }
  if (!trip) {
    return <p className="text-stone-600">Trip not found.</p>;
  }

  const submittedCount = members.filter((m) => m.submitted).length;
  const allSubmitted = members.length > 0 && submittedCount === members.length;
  const pct = members.length ? (submittedCount / members.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className={pageHeading}>Response status</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500">
          <Clock size={14} /> {formatCountdown(trip.response_deadline)}
        </p>
      </div>

      <div className={card}>
        <p className="text-lg font-bold text-stone-900">
          {submittedCount} of {members.length} submitted
        </p>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-rose-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.id} className={`flex items-center justify-between ${card} !py-3`}>
            <span className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
                {m.name.charAt(0).toUpperCase()}
              </span>
              <span className="text-sm font-medium text-stone-800">{m.name}</span>
            </span>
            {m.submitted ? (
              <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                <CheckCircle2 size={16} /> Submitted
              </span>
            ) : m.joined ? (
              <span className="flex items-center gap-1 text-sm font-medium text-amber-600">
                <Hourglass size={16} /> Joined
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm text-stone-400">
                <Circle size={16} /> Hasn&apos;t joined
              </span>
            )}
          </li>
        ))}
      </ul>

      {!allSubmitted && (
        <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          Options previewed now will be marked <strong>&nbsp;incomplete&nbsp;</strong> since not everyone has
          responded yet.
        </p>
      )}
    </div>
  );
}
