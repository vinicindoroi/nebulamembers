/** Contagem de calls já realizadas por aluno e por grupo (fonte: mentor_bookings). */

export type BookingCallRow = { user_id: string; status: string };
export type CallCounts = Record<string, number>;

/** Calls concluídas (status "done") por aluno. Canceladas e calls futuras não contam. */
export function callCountsByMember(rows: BookingCallRow[]): CallCounts {
  const counts: CallCounts = {};
  for (const row of rows) {
    if (!row?.user_id || row.status !== "done") continue;
    counts[row.user_id] = (counts[row.user_id] ?? 0) + 1;
  }
  return counts;
}

export function callsOf(memberId: string, counts: CallCounts) {
  return counts[memberId] ?? 0;
}

/** Total de calls do grupo: soma das calls de cada integrante. */
export function callsOfGroup(memberIds: string[], counts: CallCounts) {
  return memberIds.reduce((sum, id) => sum + callsOf(id, counts), 0);
}

export function formatCalls(count: number) {
  const label = count.toLocaleString("pt-BR");
  return count === 1 ? "1 call" : `${label} calls`;
}

export const CALL_FILTERS = [
  { value: "all", label: "Todas as calls" },
  { value: "none", label: "Nenhuma call" },
  { value: "1+", label: "1 call ou mais" },
  { value: "3+", label: "3 calls ou mais" },
  { value: "5+", label: "5 calls ou mais" },
  { value: "10+", label: "10 calls ou mais" },
] as const;

/** "all" deixa tudo passar, "none" exige zero calls, "N+" exige pelo menos N calls. */
export function matchesCallCount(count: number, filter: string) {
  if (filter === "all") return true;
  if (filter === "none") return count === 0;
  const min = Number.parseInt(filter, 10);
  if (!Number.isFinite(min)) return true;
  return count >= min;
}
