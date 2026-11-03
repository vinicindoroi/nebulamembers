/** Contagem de aulas concluídas por aluno e por grupo (fonte: lesson_progress). */

export type LessonProgressRow = { user_id: string; lesson_id: string };
export type LessonCounts = Record<string, number>;

/** Aulas distintas concluídas por aluno. Linhas repetidas (mesmo aluno + mesma aula) contam uma vez. */
export function lessonCountsByMember(rows: LessonProgressRow[]): LessonCounts {
  const seen = new Set<string>();
  const counts: LessonCounts = {};
  for (const row of rows) {
    if (!row?.user_id || !row?.lesson_id) continue;
    const key = `${row.user_id}|${row.lesson_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    counts[row.user_id] = (counts[row.user_id] ?? 0) + 1;
  }
  return counts;
}

export function lessonsOf(memberId: string, counts: LessonCounts) {
  return counts[memberId] ?? 0;
}

/** Total de aulas do grupo: soma das aulas de cada integrante (sem duplicar aulas comuns). */
export function lessonsOfGroup(memberIds: string[], counts: LessonCounts) {
  return memberIds.reduce((sum, id) => sum + lessonsOf(id, counts), 0);
}

export function formatLessons(count: number) {
  return count === 1 ? "1 aula" : `${count} ${count.toLocaleString("pt-BR")} aulas`;
}
