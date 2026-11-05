import assert from "node:assert/strict";
import {
  CALL_FILTERS,
  callCountsByMember,
  callsOf,
  callsOfGroup,
  formatCalls,
  matchesCallCount,
} from "../src/lib/member-calls.ts";

const rows = [
  { user_id: "ana", status: "done" },
  { user_id: "ana", status: "done" },
  { user_id: "ana", status: "booked" },   // futura: ainda não aconteceu
  { user_id: "bia", status: "done" },
  { user_id: "bia", status: "cancelled" }, // cancelada: não conta
  { user_id: "cai", status: "booked" },
];

const counts = callCountsByMember(rows);
assert.deepEqual(counts, { ana: 2, bia: 1 });
assert.equal(callsOf("ana", counts), 2);
assert.equal(callsOf("cai", counts), 0);
assert.equal(callsOf("ninguem", counts), 0);

// Grupo: soma das calls dos integrantes.
assert.equal(callsOfGroup(["ana", "bia", "cai"], counts), 3);
assert.equal(callsOfGroup(["cai"], counts), 0);
assert.equal(callsOfGroup([], counts), 0);

// Filtros por quantidade.
assert.equal(matchesCallCount(0, "all"), true);
assert.equal(matchesCallCount(0, "none"), true);
assert.equal(matchesCallCount(1, "none"), false);
assert.equal(matchesCallCount(1, "1+"), true);
assert.equal(matchesCallCount(0, "1+"), false);
assert.equal(matchesCallCount(2, "3+"), false);
assert.equal(matchesCallCount(3, "3+"), true);
assert.equal(matchesCallCount(4, "5+"), false);
assert.equal(matchesCallCount(5, "5+"), true);
assert.equal(matchesCallCount(9, "10+"), false);
assert.equal(matchesCallCount(10, "10+"), true);
assert.equal(matchesCallCount(7, "valor desconhecido"), true);

// O seletor oferece todas as faixas usadas acima.
for (const value of ["all", "none", "1+", "3+", "5+", "10+"]) {
  assert.ok(CALL_FILTERS.some((f) => f.value === value), `falta a faixa ${value}`);
}

// Rótulos em português.
assert.equal(formatCalls(0), "0 calls");
assert.equal(formatCalls(1), "1 call");
assert.equal(formatCalls(12), "12 calls");

console.log("Calls realizadas por aluno e por grupo: contagem, faixas e rótulos passaram.");
