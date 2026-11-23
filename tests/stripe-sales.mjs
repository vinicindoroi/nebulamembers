import assert from "node:assert/strict";
import { chargeToSale, extractCampaign, isRestrictedStripeKey, saleCountry, summarizeSales, toMajor } from "../src/lib/stripe-sales.ts";

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
