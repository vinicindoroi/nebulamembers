import assert from "node:assert/strict";
import { chargeToDecline, declineReason, summarizeDeclines } from "../src/lib/stripe-sales.ts";

// Só cobranças com status failed contam como recusa
assert.equal(chargeToDecline({ status: "succeeded", amount: 100 }), null);
const d = chargeToDecline({ status: "failed", amount: 4990, currency: "USD", created: 10, outcome: { reason: "insufficient_funds" }, billing_details: { address: { country: "br" } } });
assert.equal(d.reason, "Saldo insuficiente");
assert.equal(d.currency, "usd");
assert.equal(d.country, "BR");

// Motivo: código da recusa, bloqueio do Radar, código de falha, ou "não informado"
assert.equal(declineReason({ outcome: { type: "blocked" } }), "Bloqueado pela Stripe (Radar)");
assert.equal(declineReason({ failure_code: "expired_card" }), "Cartão vencido");
assert.equal(declineReason({ failure_code: "weird_code" }), "weird code");
assert.equal(declineReason({}), "Motivo não informado");

// Taxa de recusa sobre todas as tentativas e motivos ordenados por frequência
const mk = (reason, created) => ({ amount: 1, currency: "usd", country: null, campaign: null, created, reason });
const s = summarizeDeclines([mk("CVC incorreto", 1), mk("Saldo insuficiente", 3), mk("Saldo insuficiente", 2)], 7);
assert.equal(s.count, 3);
assert.equal(s.rate, 30);
assert.deepEqual(s.reasons, [{ reason: "Saldo insuficiente", count: 2 }, { reason: "CVC incorreto", count: 1 }]);
assert.deepEqual(s.recent.map((x) => x.created), [3, 2, 1]);
assert.equal(summarizeDeclines([], 0).rate, 0);
console.log("stripe declines: ok");

// ---------- Rótulos quando a busca atinge o limite ----------
import { declineCountLabel, declineRateLabel } from "../src/lib/stripe-sales.ts";

assert.equal(declineCountLabel(300, false), "300");
assert.equal(declineCountLabel(1234, false), "1.234");
assert.equal(declineCountLabel(300, true), "300+");
assert.equal(declineCountLabel(1234, true), "1.234+");
assert.equal(declineRateLabel(54.3, false), "54,3%");
assert.equal(declineRateLabel(54.3, true), "≈ 54,3%");
assert.equal(declineRateLabel(0, true), "≈ 0%");
