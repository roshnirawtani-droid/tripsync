"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ClientSession,
  clearClientSession,
  loadClientSession,
  saveClientSession,
} from "@/lib/client-session";

interface TripSessionValue {
  tripId: string;
  session: ClientSession | null;
  loading: boolean;
  signIn: (memberId: string, pin: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => void;
}

const TripSessionContext = createContext<TripSessionValue | null>(null);

export function TripSessionProvider({
  tripId,
  children,
}: {
  tripId: string;
  children: ReactNode;
}) {
  // Read synchronously on first render instead of in an effect: localStorage
  // access is instant, and avoiding the effect sidesteps a render flash
  // where every page would briefly think the user is signed out.
  const [session, setSession] = useState<ClientSession | null>(() => loadClientSession(tripId));
  const loading = false;

  async function signIn(memberId: string, pin: string) {
    const res = await fetch(`/api/trips/${tripId}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, pin }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { ok: false, error: json.error ?? "Sign in failed" };
    }
    const next: ClientSession = { memberId: json.member.id, name: json.member.name };
    saveClientSession(tripId, next);
    setSession(next);
    return { ok: true };
  }

  function signOut() {
    clearClientSession(tripId);
    setSession(null);
  }

  return (
    <TripSessionContext.Provider value={{ tripId, session, loading, signIn, signOut }}>
      {children}
    </TripSessionContext.Provider>
  );
}

export function useTripSession(): TripSessionValue {
  const ctx = useContext(TripSessionContext);
  if (!ctx) throw new Error("useTripSession must be used within TripSessionProvider");
  return ctx;
}

export function useRequireTripSession(): TripSessionValue {
  const ctx = useTripSession();
  const router = useRouter();
  useEffect(() => {
    if (!ctx.loading && !ctx.session) {
      router.replace(`/trip/${ctx.tripId}/join`);
    }
  }, [ctx.loading, ctx.session, ctx.tripId, router]);
  return ctx;
}
