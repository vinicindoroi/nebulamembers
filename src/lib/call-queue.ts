/** Pending calls keep their chronological order; finished ones drop to the end of the queue. */
export function callsQueue<T extends { status: string; starts_at: string }>(rows: T[]) {
  return [...rows].sort(
    (a, b) =>
      (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0) ||
      new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
}
