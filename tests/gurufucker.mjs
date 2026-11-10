import assert from "node:assert/strict";
import {
  buildOrderBody, DEFAULT_SETTINGS, expectedTicketCents, normalizeSettings, parsePriceToCents, reachChances, simulateBuyer,
} from "../src/lib/gurufucker/core.ts";

// Pagamento vem pré-definido como Cartão
assert.equal(DEFAULT_SETTINGS.paymentMethod, "credit_card");
assert.equal(normalizeSettings({}).paymentMethod, "credit_card");
assert.equal(normalizeSettings({ paymentMethod: "pix" }).paymentMethod, "pix");
assert.equal(normalizeSettings({ paymentMethod: "nada" }).paymentMethod, "credit_card");

// Valores digitados
assert.equal(parsePriceToCents("97,00"), 9700);
assert.equal(parsePriceToCents("1.297,90"), 129790);
assert.equal(parsePriceToCents("47.5"), 4750);
assert.equal(parsePriceToCents(""), 0);

const funnel = [
  { id: "a", name: "Front", priceCents: 9700, conv: 100 },
  { id: "b", name: "Upsell 1", priceCents: 19700, conv: 50 },
  { id: "c", name: "Upsell 2", priceCents: 4700, conv: 100 },
];

// Ordem: sempre compra o 1º; com 100% passa por todos, na ordem
const always = () => 0;
assert.deepEqual(simulateBuyer(funnel, always).map((s) => s.id), ["a", "b", "c"]);
// Recusou o 2º -> para ali, não compra o 3º
const never = () => 0.99;
assert.deepEqual(simulateBuyer(funnel, never).map((s) => s.id), ["a"]);
// Produto sem valor é pulado
assert.deepEqual(simulateBuyer([{ id: "x", name: "", priceCents: 0, conv: 100 }, ...funnel], always)[0].id, "a");

assert.deepEqual(reachChances(funnel), [1, 0.5, 0.5]);
assert.equal(expectedTicketCents(funnel), 9700 + 9850 + 2350);

// Moeda escolhida vai na comissão
const body = buildOrderBody({
  orderId: "o1", step: funnel[0],
  settings: { platform: "X", paymentMethod: "pix", currency: "USD", isTest: false, randomCustomer: true, customerName: "", customerEmail: "", stepDelaySec: 0, utm_source: "", utm_campaign: "", utm_medium: "", utm_content: "", utm_term: "" },
  customer: { name: "A", email: "a@a.com" }, status: "paid", createdAt: new Date(0), approvedAt: new Date(0),
});
assert.equal(body.commission.currency, "USD");
assert.equal(body.commission.totalPriceInCents, 9700);
assert.equal(body.products[0].priceInCents, 9700);

console.log("gurufucker: ok");
