"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTripSession } from "@/lib/TripSessionContext";
import { UserRound, KeyRound, ArrowRight } from "lucide-react";
import PhotoBackdrop from "@/components/PhotoBackdrop";
import { PAGE_BACKGROUNDS } from "@/lib/backgrounds";
import { button, frostedCard, input, label as labelClass } from "@/lib/ui";

interface MemberRow {
  id: string;
  name: string;
  joined: boolean;
  submitted: boolean;
}

export default function JoinPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = use(params);
  const router = useRouter();
  const { session, signIn, loading } = useTripSession();

  const [tripName, setTripName] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      router.replace(`/trip/${tripId}/preferences`);
    }
  }, [loading, session, tripId, router]);

  useEffect(() => {
    async function load() {
      const tripRes = await fetch(`/api/trips/${tripId}`);
      if (!tripRes.ok) {
        setNotFound(true);
        return;
      }
      const tripJson = await tripRes.json();
      setTripName(tripJson.trip.name);

      const membersRes = await fetch(`/api/trips/${tripId}/members`);
      const membersJson = await membersRes.json();
      setMembers(membersJson.members ?? []);
    }
    load();
  }, [tripId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedId) {
      setError("Pick your name");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits");
      return;
    }
    setSubmitting(true);
    const result = await signIn(selectedId, pin);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong");
      return;
    }
    router.push(`/trip/${tripId}/preferences`);
  }

  if (notFound) {
    return (
      <PhotoBackdrop photo={PAGE_BACKGROUNDS.join}>
        <div className={`w-full max-w-sm ${frostedCard} text-center`}>
          <p className="font-display text-lg font-bold text-stone-900">This trip link doesn&apos;t exist.</p>
          <p className="mt-1 text-sm text-stone-600">Ask whoever shared it to send it again.</p>
        </div>
      </PhotoBackdrop>
    );
  }

  const selectedMember = members.find((m) => m.id === selectedId);

  return (
    <PhotoBackdrop photo={PAGE_BACKGROUNDS.join}>
      <p className="mb-5 font-display text-lg font-bold tracking-tight text-white drop-shadow">TripSync</p>
      <div className={`w-full max-w-sm ${frostedCard} animate-fade-up`}>
        <p className="text-xs font-bold uppercase tracking-widest text-brand-700">You&apos;re invited</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-stone-900">{tripName ?? "Loading trip…"}</h1>
        <p className="mt-1 text-sm text-stone-600">
          Pick your name and set a 4-digit PIN. You&apos;ll use the same PIN next time.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className={labelClass}>
              <UserRound size={16} className="mr-1 inline -mt-0.5" /> Who are you?
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className={input}
            >
              <option value="">Select your name</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.joined ? "(already joined)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              <KeyRound size={16} className="mr-1 inline -mt-0.5" />
              {selectedMember?.joined ? "Enter your PIN" : "Set a 4-digit PIN"}
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
            />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button type="submit" disabled={submitting} className={`${button.primary} w-full`}>
            {submitting ? "Continuing…" : "Continue"} <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </PhotoBackdrop>
  );
}
