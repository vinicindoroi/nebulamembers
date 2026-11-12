import assert from "node:assert/strict";
import { isTabAllowed, withTabAccess, duplicatePlan, effectivePlanList } from "../src/lib/plan-access.ts";

// Valor explícito da aba vence a chave antiga.
assert.equal(isTabAllowed({ courses_access: true, tabs: { "/courses": false } }, "/courses"), false);
// Sem valor explícito, respeita a chave antiga.
assert.equal(isTabAllowed({ funnels_access: false }, "/funnels"), false);
// Abas novas sem configuração ficam liberadas.
assert.equal(isTabAllowed({}, "/gurufucker"), true);
// Perfil e Configurações nunca bloqueiam.
assert.equal(isTabAllowed({ tabs: { "/profile": false } }, "/profile"), true);
// Bloquear aba atualiza também a chave antiga.
const f = withTabAccess({ forum_access: true }, "/forum", false);
assert.equal(f.forum_access, false);
assert.equal(isTabAllowed(f, "/forum"), false);

// Duplicar copia todas as permissões, com nome/slug únicos e cópia independente.
const original = { id: "p1", name: "Individual", slug: "individual", level: 3, features: { tabs: { "/uptime": false }, courses_access: true } };
const copy = duplicatePlan(original, [original], "p2");
assert.equal(copy.id, "p2");
assert.equal(copy.slug, "individual-copia");
assert.equal(copy.name, "Individual (cópia)");
assert.equal(copy.level, 3);
assert.deepEqual(copy.features, original.features);
copy.features.tabs["/uptime"] = true;
assert.equal(original.features.tabs["/uptime"], false);
const copy2 = duplicatePlan(original, [original, copy], "p3");
assert.equal(copy2.slug, "individual-copia-2");

// Conteúdo sem lista explícita expande a hierarquia (nível maior herda).
const plans = [{ slug: "free", level: 0 }, { slug: "pro", level: 1 }, { slug: "individual", level: 3 }];
assert.deepEqual(effectivePlanList(null, "pro", plans), ["pro", "individual"]);
assert.deepEqual(effectivePlanList(["Free"], "pro", plans), ["free"]);
console.log("plan-access: ok");
