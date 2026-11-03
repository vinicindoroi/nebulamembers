import assert from "node:assert/strict";
import { closePastCalls } from "../src/lib/mentor-auto-close.ts";

function makeClient(captured, rows, error = null) {
  const builder = {
    update(values) {
      captured.update = values;
      return builder;
    },
    eq(column, value) {
      captured.eq = [column, value];
      return builder;
    },
    lte(column, value) {
      captured.lte = [column, value];
      return builder;
    },
    async select(columns) {
      captured.select = columns;
      return { data: rows, error };
    },
  };
  return {
    from(table) {
      captured.table = table;
      return builder;
    },
  };
}

const now = new Date("2026-11-03T18:00:00Z");

// encerra apenas calls ainda marcadas como agendadas cujo horário já passou
const captured = {};
const result = await closePastCalls(makeClient(captured, [{ id: "a" }, { id: "b" }]), now);

assert.equal(captured.table, "mentor_bookings");
assert.deepEqual(captured.update, { status: "done" });
assert.deepEqual(captured.eq, ["status", "booked"]);
assert.equal(captured.lte[0], "ends_at");
assert.equal(captured.lte[1], "2026-11-03T18:00:00.000Z");
assert.equal(result.closed, 2);

// nada a encerrar: devolve 0 sem explodir
const empty = {};
assert.deepEqual(await closePastCalls(makeClient(empty, []), now), { closed: 0 });

// falha do banco é propagada para o chamador conseguir reportar
const broken = {};
await assert.rejects(
  () => closePastCalls(makeClient(broken, null, { message: "permission denied" }), now),
  /permission denied/,
);

console.log("ok: closePastCalls encerra sozinhas as calls cujo horário passou");
