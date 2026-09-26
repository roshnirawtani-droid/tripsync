// The trip header band shows who has submitted and whether the trip is
// locked. Pages that change either fire this so the band refetches right
// away instead of waiting for the next navigation.
const TRIP_REFRESH_EVENT = "tripsync:refresh";

export function notifyTripChanged(): void {
  window.dispatchEvent(new Event(TRIP_REFRESH_EVENT));
}

export function onTripChanged(handler: () => void): () => void {
  window.addEventListener(TRIP_REFRESH_EVENT, handler);
  return () => window.removeEventListener(TRIP_REFRESH_EVENT, handler);
}
