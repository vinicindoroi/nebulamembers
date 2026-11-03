import assert from "node:assert/strict";
import { callsQueue } from "../src/lib/call-queue.ts";

const rows = [
  { id: "allam", status: "done", starts_at: "2026-11-03T20:00:00Z" },
  { id: "pedro", status: "booked", starts_at: "2026-11-03T21:00:00Z" },
  { id: "victor", status: "booked", starts_at: "2026-11-03T22:00:00Z" },
  { id: "arthur", status: "booked", starts_at: "2026-11-03T23:00:00Z" },
  { id: "jose", status: "done", starts_at: "2026-11-03T18:00:00Z" },
];

// realizada vai para o fim da fila, mesmo sendo mais cedo que as pendentes
assert.deepEqual(callsQueue(rows).map((r) => r.id), ["pedro", "victor", "arthur", "jose", "allam"]);

// pendentes seguem em ordem cronológica; o array original não é alterado
assert.deepEqual(rows.map((r) => r.id), ["allam", "pedro", "victor", "arthur", "jose"]);

// só realizadas: continuam em ordem cronológica entre si
assert.deepEqual(
  callsQueue(rows.filter((r) => r.status === "done")).map((r) => r.id),
  ["jose", "allam"],
);

// sem realizadas: ordem cronológica preservada
assert.deepEqual(
  callsQueue(rows.filter((r) => r.status === "booked")).map((r) => r.id),
  ["pedro", "victor", "arthur"],
);

console.log("ok: callsQueue coloca as calls concluídas no fim da fila");
