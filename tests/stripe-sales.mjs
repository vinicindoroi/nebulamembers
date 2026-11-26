import assert from "node:assert/strict";
import { chargeToSale, extractCampaign, isRestrictedStripeKey, saleCountry, summarizeSales, toMajor, windowStartUnix } from "../src/lib/stripe-sales.ts";

// Só chave restrita (somente leitura) é aceita
assert.equal(isRestrictedStripeKey("rk_live_51Abcdefghijklmnop"), true);
assert.equal(isRestrictedStripeKey("rk_test_51Abcdefghijklmnop"), true);
assert.equal(isRestrictedStripeKey("sk_live_51Abcdefghijklmnop"), false);
assert.equal(isRestrictedStripeKey("pk_live_51Abcdefghijklmnop"), false);

// Campanha vem do utm_campaign (cobrança → pagamento → checkout)
assert.equal(extractCampaign({ utm_campaign: "black-friday" }), "black-friday");
assert.equal(extractCampaign({}, { UTM_CAMPAIGN: "cbo-01" }), "cbo-01");
assert.equal(extractCampaign({ utm_campaign: "  " }, null, { utm_campaign: "checkout-camp" }), "checkout-camp");
assert.equal(extractCampaign({ utm_source: "fb" }), null);

// País: endereço de cobrança, depois país do cartão
assert.equal(saleCountry({ billing_details: { address: { country: "br" } }, payment_method_details: { card: { country: "US" } } }), "BR");
assert.equal(saleCountry({ billing_details: { address: { country: null } }, payment_method_details: { card: { country: "PT" } } }), "PT");
assert.equal(saleCountry({}), null);

// Venda conta o valor líquido; falhou ou reembolsada inteira não conta
const base = { status: "succeeded", paid: true, currency: "usd", created: 1, metadata: {} };
assert.equal(chargeToSale({ ...base, amount: 5000, amount_refunded: 1000 }).amount, 4000);
assert.equal(chargeToSale({ ...base, amount: 5000, amount_refunded: 5000 }), null);
assert.equal(chargeToSale({ ...base, status: "failed", amount: 5000, amount_refunded: 0 }), null);
assert.equal(chargeToSale({ ...base, amount: 100, amount_refunded: 0, payment_intent: { metadata: { utm_campaign: "pi-camp" } } }).campaign, "pi-camp");

// Moeda sem centavos
assert.equal(toMajor(1500, "JPY"), 1500);
assert.equal(toMajor(1500, "usd"), 15);

// Faturamento, país e campanha que mais venderam
const s = (amount, country, campaign, currency = "usd") => ({ amount, currency, country, campaign, created: 0 });
const sum = summarizeSales([
  s(10000, "US", "camp-a"),
  s(5000, "US", "camp-b"),
  s(20000, "BR", "camp-b"),
  s(3000, "PT", null),
  s(99900, "BR", "camp-x", "brl"),
]);
assert.equal(sum.currency, "usd");            // moeda com mais pedidos
assert.equal(sum.revenue, 38000);             // nunca soma moedas diferentes
assert.equal(sum.orders, 4);
assert.equal(sum.avgTicket, 9500);
assert.equal(sum.topCountry.key, "BR");        // BR 200 > US 150
assert.equal(sum.topCampaign.key, "camp-b");   // 250 > 100
assert.equal(sum.withoutCampaign, 1);
assert.deepEqual(sum.otherCurrencies.map((c) => c.key), ["brl"]);
assert.equal(summarizeSales([]).topCountry, null);

console.log("stripe-sales: ok");

// ---------- Histórico ----------
const { validateRange, dayKey, dailySeries, bestDay, recentSales, MAX_HISTORY_DAYS } = await import("../src/lib/stripe-sales.ts");
const NOW = Date.parse("2026-11-23T18:00:00Z") / 1000;
assert.equal(MAX_HISTORY_DAYS, 366);
assert.equal(validateRange(NOW - 30 * 86400, NOW, NOW), null);
assert.match(validateRange(NOW, NOW - 1, NOW), /antes da final/);
assert.match(validateRange(NOW + 86400, NOW + 2 * 86400, NOW), /futuro/);
assert.match(validateRange(NOW - 400 * 86400, NOW, NOW), /366 dias/);

// Dia local no fuso de Brasília (-180 min): 01:00 UTC ainda é o dia anterior
assert.equal(dayKey(Date.parse("2026-11-23T01:00:00Z") / 1000, -180), "2026-11-22");
assert.equal(dayKey(Date.parse("2026-11-23T04:00:00Z") / 1000, -180), "2026-11-23");

// Série diária: todos os dias do período, com zero onde não vendeu, só na moeda principal
const from = Date.parse("2026-11-20T03:00:00Z") / 1000; // 20/11 00:00 em Brasília
const to = Date.parse("2026-11-24T02:59:59Z") / 1000;   // 23/11 23:59 em Brasília
const at = (iso, amount, currency = "brl") => ({ amount, currency, country: "BR", campaign: null, created: Date.parse(iso) / 1000 });
const hist = [
  at("2026-11-20T12:00:00Z", 1000),
  at("2026-11-22T12:00:00Z", 3000),
  at("2026-11-22T20:00:00Z", 2000),
  at("2026-11-23T01:00:00Z", 500),  // 22/11 22:00 em Brasília
  at("2026-11-21T12:00:00Z", 9999, "usd"),
];
const series = dailySeries(hist, "brl", from, to, -180);
assert.deepEqual(series.map((p) => p.date), ["2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23"]);
assert.deepEqual(series.map((p) => p.revenue), [1000, 0, 5500, 0]);
assert.deepEqual(series.map((p) => p.orders), [1, 0, 3, 0]);
assert.equal(bestDay(series).date, "2026-11-22");
assert.equal(bestDay(dailySeries([], "brl", from, to, -180)), null);
assert.deepEqual(recentSales(hist, 2).map((s) => s.amount), [500, 2000]);

console.log("stripe-sales history: ok");

// ---------- Janela "Hoje" (meia-noite do fuso do aluno) ----------
const u = (iso) => Math.floor(Date.parse(iso) / 1000);

// 7/30/90 dias: volta N dias a partir de agora
assert.equal(windowStartUnix(7, u("2026-02-05T10:00:00Z"), 0), u("2026-01-29T10:00:00Z"));
assert.equal(windowStartUnix(30, u("2026-02-05T10:00:00Z"), -180), u("2026-01-06T10:00:00Z"));

// Hoje em UTC-3: 10:00 UTC são 07:00 locais -> meia-noite local = 03:00 UTC
assert.equal(windowStartUnix("today", u("2026-02-05T10:00:00Z"), -180), u("2026-02-05T03:00:00Z"));
// 01:00 UTC ainda é 22:00 do dia anterior em UTC-3 -> a janela começa 22h antes
assert.equal(windowStartUnix("today", u("2026-02-05T01:00:00Z"), -180), u("2026-02-04T03:00:00Z"));
// UTC+9 (Tóquio): 23:00 UTC já é 08:00 do dia seguinte -> meia-noite local = 15:00 UTC de hoje
assert.equal(windowStartUnix("today", u("2026-02-05T23:00:00Z"), 540), u("2026-02-05T15:00:00Z"));
// Nunca no futuro
assert.equal(windowStartUnix("today", u("2026-02-05T03:00:00Z"), -180), u("2026-02-05T03:00:00Z"));
