import assert from "node:assert/strict";
import { formatLessons, lessonCountsByMember, lessonsOf, lessonsOfGroup } from "../src/lib/member-lessons.ts";

const rows = [
  { user_id: "ana", lesson_id: "l1" },
  { user_id: "ana", lesson_id: "l2" },
  { user_id: "ana", lesson_id: "l2" }, // repetida: mesma aula não conta duas vezes
  { user_id: "bia", lesson_id: "l1" },
  { user_id: "cai", lesson_id: "l3" },
];

const counts = lessonCountsByMember(rows);
assert.deepEqual(counts, { ana: 2, bia: 1, cai: 1 });
assert.equal(lessonsOf("ana", counts), 2);
assert.equal(lessonsOf("ninguem", counts), 0);

// Grupo: soma das aulas dos integrantes.
assert.equal(lessonsOfGroup(["ana", "bia"], counts), 3);
assert.equal(lessonsOfGroup(["cai"], counts), 1);
assert.equal(lessonsOfGroup([], counts), 0);
assert.equal(lessonsOfGroup(["ninguem"], counts), 0);

// Rótulos em português.
assert.equal(formatLessons(0), "0 aulas");
assert.equal(formatLessons(1), "1 aula");
assert.equal(formatLessons(12), "12 aulas");

console.log("Aulas concluídas por aluno e por grupo: contagem e rótulos passaram.");
