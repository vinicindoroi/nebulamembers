import assert from "node:assert/strict";
import { parseStepList } from "../src/lib/funnel-tracker/steps-parse.ts";

const r = parseStepList("Seleção do Alvo, Avaliação, checkout");
assert.deepEqual(r.map((s) => s.label), ["Seleção do Alvo", "Avaliação", "checkout"]);
assert.deepEqual(r.map((s) => s.key), ["selecao_do_alvo", "avaliacao", "checkout"]);

assert.equal(parseStepList("checkout, Back-traps", [{ label: "Back-traps", key: "oferta_de_saida_1" }])[1].key, "oferta_de_saida_1");
assert.equal(parseStepList("Obrigado = obrigado_final")[0].key, "obrigado_final");
assert.deepEqual(parseStepList("Upsell, upsell").map((s) => s.key), ["upsell", "upsell_2"]);
assert.equal(parseStepList("A; B\nC").length, 3);
console.log("funnel-steps-parse OK");
