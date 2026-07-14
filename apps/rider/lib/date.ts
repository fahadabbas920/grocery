/** True if the ISO timestamp falls on the current calendar day (local time). */
export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/**
 * True if the ISO timestamp falls within the last 7 days (a rolling 7-day
 * window ending now — not the current Mon–Sun calendar week).
 */
export function isWithinLast7Days(iso: string): boolean {
  const d = new Date(iso);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return d >= weekAgo;
}

/** Format an ISO timestamp as e.g. `5 Jul 2026`. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format an ISO timestamp as e.g. `03:45 PM`. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
