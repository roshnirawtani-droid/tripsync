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

// A vibe tapped on the landing page's mood strip, carried through trip
// creation so the coordinator's preferences start with it already picked.
const VIBE_HINT_KEY = "tripsync_vibe_hint";

export function saveVibeHint(vibe: string): void {
  try {
    window.localStorage.setItem(VIBE_HINT_KEY, vibe);
  } catch {
    // Storage can be unavailable (private mode) - the hint is optional.
  }
}

export function takeVibeHint(): string | null {
  try {
    const vibe = window.localStorage.getItem(VIBE_HINT_KEY);
    window.localStorage.removeItem(VIBE_HINT_KEY);
    return vibe;
  } catch {
    return null;
  }
}
