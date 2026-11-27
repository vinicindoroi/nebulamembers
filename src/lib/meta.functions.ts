import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { accountSchema, metaDateRange, metaPeriodSchema, metaReportSchema, oauthStateValid } from "./meta/core";

export const startMetaConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { approvedMetaUser, metaStore } = await import("./meta/storage.server");
    await approvedMetaUser(context.supabase);
    const { metaConfig } = await import("./meta/api.server");
    const config = metaConfig();
    if (!config) throw new Error("A conexão Facebook aguarda configuração pela administração.");
    const request = getRequest();
    const url = new URL(request.url);
    const forwarded = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    const origin = forwarded ? new URL(`https://${forwarded}`).origin : url.origin;
    const redirectUri = `${origin}/api/public/meta/callback`;
    const state = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
    const { hashState } = await import("./meta/crypto.server");
    const db = await metaStore();
    const { error: clearError } = await db.from("student_meta_oauth_states").delete().eq("user_id", context.userId);
    if (clearError) throw new Error("Não foi possível iniciar a conexão.");
    const { error } = await db.from("student_meta_oauth_states").insert({ user_id: context.userId, state_hash: await hashState(state), redirect_uri: redirectUri, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() });
    if (error) throw new Error("Não foi possível iniciar a conexão.");
    const auth = new URL(`https://www.facebook.com/${config.version}/dialog/oauth`);
    auth.search = new URLSearchParams({ client_id: config.appId, redirect_uri: redirectUri, state, config_id: config.configId, response_type: "code", override_default_response_type: "true", auth_type: "rerequest" }).toString();
    return { authorizationUrl: auth.toString() };
  });

export const finishMetaConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ state: z.string().regex(/^[a-f0-9]{64}$/), code: z.string().min(1).max(4096) }).strict().parse(data))
  .handler(async ({ context, data }) => {
    const { approvedMetaUser, metaStore } = await import("./meta/storage.server");
    await approvedMetaUser(context.supabase);
    const { hashState, encryptMetaToken } = await import("./meta/crypto.server");
    const db = await metaStore();
    // Atomic, one-use consumption binds this authorization to the signed-in app user.
    const { data: stateRow, error: stateError } = await db.from("student_meta_oauth_states").delete().eq("state_hash", await hashState(data.state)).eq("user_id", context.userId).gt("expires_at", new Date().toISOString()).select("user_id,expires_at,redirect_uri").maybeSingle();
    if (stateError || !oauthStateValid(stateRow, context.userId) || !stateRow) throw new Error("Essa conexão expirou ou pertence a outra sessão. Tente novamente.");
    const { exchangeMetaCode, createMetaReader } = await import("./meta/api.server");
    const credentials = await exchangeMetaCode(data.code, stateRow.redirect_uri);
    const identity = await createMetaReader(credentials.token).identity();
    const { error: cacheError } = await db.from("student_meta_reports").delete().eq("user_id", context.userId);
    if (cacheError) throw new Error("Não foi possível atualizar a conexão.");
    const { error } = await db.from("student_meta_connections").upsert({ user_id: context.userId, token_ciphertext: await encryptMetaToken(credentials.token, context.userId), facebook_name: identity.name, expires_at: credentials.expiresAt, connected_at: new Date().toISOString() });
    if (error) throw new Error("Não foi possível salvar sua conexão Facebook.");
    return { name: identity.name };
  });

export const getMetaConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const storage = await import("./meta/storage.server");
    await storage.approvedMetaUser(context.supabase);
    const { metaConfig, createMetaReader, MetaError } = await import("./meta/api.server");
    const config = metaConfig();
    const row = await storage.metaConnection(context.userId);
    if (!row) return { configured: !!config, connected: false, reconnect: false, name: null, expiresAt: null, accounts: [], partial: false };
    const token = await storage.metaToken(context.userId);
    const base = { configured: !!config, connected: true, name: row.facebook_name, expiresAt: row.expires_at };
    if (!token || !config) return { ...base, reconnect: true, accounts: [], partial: false };
    try {
      const cacheKey = `accounts:${config.version}`;
      const cached = await storage.cachedMeta(context.userId, cacheKey);
      const accounts = cached ? z.object({ rows: z.array(accountSchema), partial: z.boolean() }).parse(cached) : await createMetaReader(token).accounts();
      if (!cached) await storage.saveMetaCache(context.userId, cacheKey, { rows: accounts.rows.map((account) => ({ ...account })), partial: accounts.partial }, "retryAt" in accounts && typeof accounts.retryAt === "string" ? accounts.retryAt : null);
      return { ...base, reconnect: false, accounts: accounts.rows, partial: accounts.partial };
    } catch (error) {
      if (error instanceof MetaError && error.reconnect) return { ...base, reconnect: true, accounts: [], partial: false };
      throw error;
    }
  });

export const getMetaCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ accountId: z.string().regex(/^act_\d+$/), period: metaPeriodSchema }).strict().parse(data))
  .handler(async ({ context, data }) => {
    const storage = await import("./meta/storage.server");
    await storage.approvedMetaUser(context.supabase);
    const { metaConfig, createMetaReader } = await import("./meta/api.server");
    const config = metaConfig();
    const token = await storage.metaToken(context.userId);
    if (!token || !config) throw new Error("Reconecte seu Facebook para consultar as campanhas.");
    const reader = createMetaReader(token);
    const accountsKey = `accounts:${config.version}`;
    const cachedAccounts = await storage.cachedMeta(context.userId, accountsKey);
    const accounts = cachedAccounts ? z.object({ rows: z.array(accountSchema), partial: z.boolean() }).parse(cachedAccounts) : await reader.accounts();
    if (!cachedAccounts) await storage.saveMetaCache(context.userId, accountsKey, { rows: accounts.rows.map((account) => ({ ...account })), partial: accounts.partial }, "retryAt" in accounts && typeof accounts.retryAt === "string" ? accounts.retryAt : null);
    const account = accounts.rows.find((account) => account.id === data.accountId);
    if (!account) throw new Error("Essa conta não está autorizada no seu Facebook.");
    const range = metaDateRange(data.period, account.timezone_name);
    const cacheKey = `${config.version}:${account.id}:${range.since}:${range.until}`;
    const cached = await storage.cachedMeta(context.userId, cacheKey);
    if (cached) return metaReportSchema.parse(cached);
    const report = await reader.report(account, data.period);
    await storage.saveMetaCache(context.userId, cacheKey, { ...report, account: { ...report.account }, range: { ...report.range }, campaigns: report.campaigns.map((campaign) => ({ ...campaign })) }, report.retryAt);
    return report;
  });

export const disconnectMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { approvedMetaUser, metaStore } = await import("./meta/storage.server");
    await approvedMetaUser(context.supabase);
    const db = await metaStore();
    for (const table of ["student_meta_oauth_states", "student_meta_reports", "student_meta_connections"] as const) {
      const { error } = await db.from(table).delete().eq("user_id", context.userId);
      if (error) throw new Error("Não foi possível desconectar seu Facebook.");
    }
    return { ok: true };
  });