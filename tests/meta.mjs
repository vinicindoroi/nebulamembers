import assert from "node:assert/strict";
import { metaDateRange, campaignMetrics, oauthStateValid, metaPeriodSchema } from "../src/lib/meta/core.ts";
import { encryptMetaToken, decryptMetaToken, hashState } from "../src/lib/meta/crypto.server.ts";

// Cada aluno só pode concluir a própria autorização; estados expirados não valem.
const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const now = Date.parse("2026-11-27T22:00:00Z");
const state = { user_id: userA, expires_at: "2026-11-27T22:10:00Z" };
assert.equal(oauthStateValid(state, userA, now), true);
assert.equal(oauthStateValid(state, userB, now), false);
assert.equal(oauthStateValid(state, userA, now + 600_000), false);
assert.equal(oauthStateValid(null, userA, now), false);

// O token criptografado é vinculado ao aluno, mesmo se a linha for trocada.
process.env["META_TOKENS_SECRET"] = "isolated-test-encryption-key-not-a-provider-credential";
const encrypted = await encryptMetaToken("isolated-test-token", userA);
assert.notEqual(encrypted, "isolated-test-token");
assert.equal(await decryptMetaToken(encrypted, userA), "isolated-test-token");
await assert.rejects(() => decryptMetaToken(encrypted, userB));
assert.equal((await hashState("state-a")).length, 64);
assert.notEqual(await hashState("state-a"), await hashState("state-b"));

// Hoje usa o fuso da conta de anúncios, não o relógio UTC do servidor.
assert.deepEqual(metaDateRange("today", "America/Sao_Paulo", new Date("2026-11-28T01:00:00Z")), { since: "2026-11-27", until: "2026-11-27" });
assert.deepEqual(metaDateRange(7, "America/Sao_Paulo", new Date("2026-11-28T01:00:00Z")), { since: "2026-11-21", until: "2026-11-27" });
assert.equal(metaPeriodSchema.safeParse(365).success, false);

// Não soma compras duplicadas nem trata métricas ausentes como venda confirmada.
const campaign = { id: "c1", name: "Campanha aluno A", effective_status: "ACTIVE" };
const metrics = campaignMetrics(campaign, { campaign_id: "c1", spend: "100.50", impressions: "1000", inline_link_clicks: "50", actions: [{ action_type: "offsite_conversion.fb_pixel_purchase", value: "3" }, { action_type: "purchase", value: "3" }], action_values: [{ action_type: "offsite_conversion.fb_pixel_purchase", value: "301.50" }] });
assert.equal(metrics.spend, 100.50); // Meta já fornece moeda em unidade principal.
assert.equal(metrics.purchases, 3);
assert.equal(metrics.roas, 3);
assert.equal(metrics.ctr, 5);
assert.equal(campaignMetrics(campaign).purchases, null);
assert.equal(campaignMetrics(campaign).roas, null);
assert.equal(campaignMetrics(campaign, undefined, false).metricsAvailable, false);
console.log("meta: isolamento, criptografia, fuso e métricas OK");