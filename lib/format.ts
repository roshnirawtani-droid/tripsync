// Small display helpers shared by the trip header band and the pages, so
// a date or countdown reads the same wherever it appears.

export function formatCountdown(deadline: string): string {
  const diffMs = new Date(deadline).getTime() - Date.now();
  if (diffMs <= 0) return "Deadline passed";
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h left`;
  const minutes = Math.floor(diffMs / (1000 * 60));
  return `${hours}h ${minutes % 60}m left`;
}

// "10 – 25 Dec 2026", or "28 Dec 2026 – 3 Jan 2027" across months/years.
// Dates are plain YYYY-MM-DD strings, so they're parsed as local dates to
// avoid a timezone shifting them by a day.
export function formatDateRange(start: string, end: string): string {
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  const month = (d: Date) => d.toLocaleDateString("en-IN", { month: "short" });
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    return `${a.getDate()} – ${b.getDate()} ${month(b)} ${b.getFullYear()}`;
  }
  const full = (d: Date) => `${d.getDate()} ${month(d)} ${d.getFullYear()}`;
  return `${full(a)} – ${full(b)}`;
}
