import assert from "node:assert/strict";
import {
  memberMatchesQuery,
  sortMembers,
  statusLabel,
  relativeDay,
} from "../src/lib/member-search.ts";

const rows = [
  { id: "1", full_name: "Pedro", email: "pedro@x.com", plan: "Individual", status: "active", created_at: "2026-10-01T12:00:00Z", last_seen_at: "2026-11-02T09:00:00Z" },
  { id: "2", full_name: "Lucas lopes", email: "lucas@x.com", plan: "Premium", status: "pending", created_at: "2026-10-20T12:00:00Z", last_seen_at: null },
  { id: "3", full_name: "Allam Francisco", email: "allam@x.com", plan: "Free", status: "suspended", created_at: "2026-09-14T12:00:00Z", last_seen_at: "2026-10-28T09:00:00Z" },
];

// busca por email (o nome sozinho não basta mais)
assert.equal(memberMatchesQuery(rows[0], "pedro@x"), true);
assert.equal(memberMatchesQuery(rows[0], "Pedro"), true);
assert.equal(memberMatchesQuery(rows[0], "PEDRO x.com"), true);
assert.equal(memberMatchesQuery(rows[0], "naoexiste"), false);
assert.equal(memberMatchesQuery(rows[1], ""), true);

// ordenação por nome respeita acentuação e é case-insensitive
assert.deepEqual(sortMembers(rows, { key: "name", dir: "asc" }).map((r) => r.id), ["3", "2", "1"]);
assert.deepEqual(sortMembers(rows, { key: "name", dir: "desc" }).map((r) => r.id), ["1", "2", "3"]);

// ordenação por cadastro: mais recente primeiro
assert.deepEqual(sortMembers(rows, { key: "created_at", dir: "desc" }).map((r) => r.id), ["2", "1", "3"]);

// último acesso vazio vai para o fim em qualquer direção
assert.deepEqual(sortMembers(rows, { key: "last_seen_at", dir: "asc" }).map((r) => r.id), ["3", "1", "2"]);
assert.deepEqual(sortMembers(rows, { key: "last_seen_at", dir: "desc" }).map((r) => r.id), ["1", "3", "2"]);

// plano segue a ordem configurada e pendente fica sempre por último
assert.deepEqual(sortMembers(rows, { key: "plan", dir: "asc" }, ["Free", "Premium", "Individual"]).map((r) => r.id), ["3", "2", "1"]);

// status em português
assert.equal(statusLabel("active"), "Ativo");
assert.equal(statusLabel("suspended"), "Suspenso");
assert.equal(statusLabel("pending"), "Pendente");
assert.equal(statusLabel(null), "—");

// último acesso relativo
const now = new Date("2026-11-02T15:00:00");
assert.equal(relativeDay("2026-11-02T09:00:00", now), "Hoje");
assert.equal(relativeDay("2026-11-01T22:00:00", now), "Ontem");
assert.equal(relativeDay("2026-10-30T10:00:00", now), "Há 3 dias");
assert.equal(relativeDay("2026-10-01T10:00:00", now), "01/10/2026");
assert.equal(relativeDay(null, now), "—");

// ordenação por aulas concluídas (quem não tem aula fica em qualquer ponta conforme a direção)
const lessonRows = [
  { id: "1", full_name: "Pedro", email: "", plan: "Free", status: "active", created_at: "2026-10-01T12:00:00Z", last_seen_at: null },
  { id: "2", full_name: "Lucas", email: "", plan: "Free", status: "active", created_at: "2026-10-02T12:00:00Z", last_seen_at: null },
  { id: "3", full_name: "Allam", email: "", plan: "Free", status: "active", created_at: "2026-10-03T12:00:00Z", last_seen_at: null },
];
const lessonCounts = { 1: 2, 3: 5 };
assert.deepEqual(sortMembers(lessonRows, { key: "lessons", dir: "desc" }, [], lessonCounts).map((r) => r.id), ["3", "1", "2"]);
assert.deepEqual(sortMembers(lessonRows, { key: "lessons", dir: "asc" }, [], lessonCounts).map((r) => r.id), ["2", "1", "3"]);

console.log("member-search: all assertions passed");
