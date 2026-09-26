"use client";

export interface ClientSession {
  memberId: string;
  name: string;
}

function storageKey(tripId: string): string {
  return `tripsync_member_${tripId}`;
}

export function loadClientSession(tripId: string): ClientSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(tripId));
    return raw ? (JSON.parse(raw) as ClientSession) : null;
  } catch {
    return null;
  }
}

export function saveClientSession(tripId: string, session: ClientSession): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(tripId), JSON.stringify(session));
}

export function clearClientSession(tripId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(storageKey(tripId));
}
