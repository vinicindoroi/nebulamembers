/** Rules for post-call notes, tasks and the satisfaction survey. */

export type CallTask = { text: string; done: boolean };
export type CallNotes = { booking_id: string; summary: string; tasks: CallTask[]; updated_at?: string };
export type CallFeedback = { booking_id: string; user_id: string; rating: number; comment: string | null; created_at: string };

type BookingLike = { id: string; status: string; starts_at: string; ends_at: string };

/** How long after a call the student is still asked to rate it. */
export const FEEDBACK_WINDOW_DAYS = 14;

/**
 * The call the student should rate now: the most recent realized call,
 * not rated yet, that ended within the feedback window.
 */
export function pendingFeedback<T extends BookingLike>(
  bookings: T[],
  ratedIds: Set<string>,
  now: number = Date.now(),
): T | null {
  const minEnd = now - FEEDBACK_WINDOW_DAYS * 86400_000;
  const candidates = bookings
    .filter((b) => b.status === "done" && !ratedIds.has(b.id))
    .filter((b) => {
      const end = new Date(b.ends_at).getTime();
      return end <= now && end >= minEnd;
    })
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  return candidates[0] ?? null;
}

/** Average rating rounded to one decimal, or null when there are no ratings. */
export function averageRating(rows: { rating: number }[]): number | null {
  if (rows.length === 0) return null;
  const sum = rows.reduce((acc, r) => acc + r.rating, 0);
  return Math.round((sum / rows.length) * 10) / 10;
}

/** Normalizes the tasks JSON stored for a call into a clean list. */
export function normalizeTasks(raw: unknown): CallTask[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => (typeof t === "string" ? { text: t, done: false } : t))
    .filter((t): t is CallTask => !!t && typeof (t as CallTask).text === "string" && (t as CallTask).text.trim() !== "")
    .map((t) => ({ text: t.text.trim().slice(0, 300), done: !!t.done }));
}
