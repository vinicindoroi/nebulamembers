import assert from "node:assert/strict";
import { averageRating, normalizeTasks, pendingFeedback } from "../src/lib/call-feedback.ts";

const now = new Date("2026-11-10T12:00:00Z").getTime();
const day = 86400_000;
const call = (id, status, daysAgo) => ({
  id,
  status,
  starts_at: new Date(now - daysAgo * day - 3600_000).toISOString(),
  ends_at: new Date(now - daysAgo * day).toISOString(),
});

// Pede avaliação da call realizada mais recente ainda não avaliada
const bookings = [call("old", "done", 5), call("recent", "done", 1), call("cancel", "cancelled", 0.5)];
assert.equal(pendingFeedback(bookings, new Set(), now)?.id, "recent");

// Call já avaliada não é pedida de novo
assert.equal(pendingFeedback(bookings, new Set(["recent"]), now)?.id, "old");

// Call cancelada ou ainda marcada nunca pede avaliação
assert.equal(pendingFeedback([call("c", "cancelled", 1), call("b", "booked", 1)], new Set(), now), null);

// Depois de 14 dias não pede mais
assert.equal(pendingFeedback([call("x", "done", 15)], new Set(), now), null);

// Média com uma casa decimal; sem notas = null
assert.equal(averageRating([{ rating: 5 }, { rating: 4 }, { rating: 4 }]), 4.3);
assert.equal(averageRating([]), null);

// Tarefas vazias são descartadas
assert.deepEqual(normalizeTasks([{ text: " Gravar VSL ", done: true }, { text: "  ", done: false }, "Subir campanha"]), [
  { text: "Gravar VSL", done: true },
  { text: "Subir campanha", done: false },
]);

console.log("call-feedback: ok");
