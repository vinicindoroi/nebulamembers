import { z } from "zod";
import { accountSchema, campaignSchema, insightSchema, campaignMetrics, metaDateRange, type MetaAccount, type MetaPeriod, type MetaReport } from "./core";

export function metaConfig() {
  const appId = process.env["META_APP_ID"];
  const appSecret = process.env["META_APP_SECRET"];
  const configId = process.env["META_LOGIN_CONFIG_ID"];
  const version = process.env["META_GRAPH_VERSION"];
  if (!appId || !appSecret || !configId || !version || !/^v\d+\.\d+$/.test(version)) return null;
  return { appId, appSecret, configId, version };
}
export class MetaError extends Error {
  constructor(public status: number, public code: number, message: string, public retryAt: string | null = null) { super(message); }
  get reconnect() { return this.code === 190; }
  get quota() { return this.status === 429 || [4, 17, 32, 613, 80004].includes(this.code); }
}
async function jsonResponse(response: Response, sensitive: string[]) {
  const body: unknown = await response.json().catch(() => null);
  const failure = z.object({ error: z.object({ code: z.number().optional(), message: z.string().optional(), error_user_msg: z.string().optional() }) }).safeParse(body);
  if (!response.ok || failure.success) {
    let message = failure.success ? failure.data.error.error_user_msg ?? failure.data.error.message ?? "Não foi possível consultar a Meta." : "Não foi possível consultar a Meta.";
    for (const secret of sensitive) if (secret) message = message.split(secret).join("[oculto]");
    message = message.replace(/https?:\/\/\S+/g, "[endereço omitido]").slice(0, 400);
    const retryHeader = response.headers.get("Retry-After");
    const retryTime = retryHeader ? Number.isFinite(Number(retryHeader)) ? Date.now() + Number(retryHeader) * 1000 : Date.parse(retryHeader) : 0;
    throw new MetaError(response.status, failure.success ? failure.data.error.code ?? 0 : 0, `Meta (${response.status}): ${message}`, new Date(Math.max(Date.now() + 15 * 60_000, Number.isFinite(retryTime) ? retryTime : 0)).toISOString());
  }
  return body;
}
export async function exchangeMetaCode(code: string, redirectUri: string) {
  const config = metaConfig();
  if (!config) throw new Error("A conexão Facebook ainda não foi configurada.");
  const exchange = async (params: Record<string, string>) => {
    const url = new URL(`https://graph.facebook.com/${config.version}/oauth/access_token`);
    url.search = new URLSearchParams({ client_id: config.appId, client_secret: config.appSecret, ...params }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000), redirect: "manual" });
    return z.object({ access_token: z.string(), expires_in: z.number().optional() }).parse(await jsonResponse(response, [config.appSecret, code, ...Object.values(params)]));
  };
  const short = await exchange({ code, redirect_uri: redirectUri });
  const long = await exchange({ grant_type: "fb_exchange_token", fb_exchange_token: short.access_token });
  if (!long.expires_in || long.expires_in <= 0) throw new Error("Configure o login da Meta para autorizações de usuário com validade definida.");
  return { token: long.access_token, expiresAt: new Date(Date.now() + long.expires_in * 1000).toISOString() };
}
export function createMetaReader(token: string) {
  const get = async (path: string, params: Record<string, string> = {}) => {
    const config = metaConfig();
    if (!config) throw new Error("A conexão Facebook ainda não foi configurada.");
    const secretKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(config.appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const proof = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", secretKey, new TextEncoder().encode(token))), (b) => b.toString(16).padStart(2, "0")).join("");
    const url = new URL(`https://graph.facebook.com/${config.version}/${path}`);
    url.search = new URLSearchParams({ ...params, appsecret_proof: proof }).toString();
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000), redirect: "manual" });
    return jsonResponse(response, [token, config.appSecret, proof]);
  };
  const list = async <T>(path: string, schema: z.ZodType<T>, params: Record<string, string> = {}) => {
    const rows: T[] = [];
    let after: string | undefined;
    for (let page = 0; page < 10; page++) {
      let raw: unknown;
      try { raw = await get(path, { ...params, limit: "100", ...(after ? { after } : {}) }); }
      catch (error) {
        if (error instanceof MetaError && error.quota) return { rows, partial: true, warning: error.message, retryAt: error.retryAt };
        throw error;
      }
      const response = z.object({ data: z.array(schema), paging: z.object({ next: z.string().optional(), cursors: z.object({ after: z.string().optional() }).optional() }).optional() }).parse(raw);
      rows.push(...response.data);
      // Never follow provider next URLs, which may contain credentials.
      if (!response.paging?.next) return { rows, partial: false, warning: null, retryAt: null };
      after = response.paging.cursors?.after;
      if (!after) return { rows, partial: true, warning: null, retryAt: null };
    }
    return { rows, partial: true, warning: null, retryAt: null };
  };
  return {
    async identity() {
      const permissions = await list("me/permissions", z.object({ permission: z.string(), status: z.string() }));
      if (!permissions.rows.some((p) => p.permission === "ads_read" && p.status === "granted")) throw new Error("Autorize a leitura das campanhas para conectar o Facebook.");
      return z.object({ name: z.string() }).parse(await get("me", { fields: "name" }));
    },
    accounts: () => list("me/adaccounts", accountSchema, { fields: "id,name,currency,timezone_name,account_status" }),
    async report(account: MetaAccount, period: MetaPeriod): Promise<MetaReport> {
      const range = metaDateRange(period, account.timezone_name);
      const campaigns = await list(`${account.id}/campaigns`, campaignSchema, { fields: "id,name,objective,effective_status", filtering: JSON.stringify([{ field: "effective_status", operator: "NOT_IN", value: ["ARCHIVED", "DELETED"] }]) });
      const insights = campaigns.retryAt ? { rows: [], partial: true, warning: campaigns.warning, retryAt: campaigns.retryAt } : await list(`${account.id}/insights`, insightSchema, { level: "campaign", fields: "campaign_id,spend,impressions,inline_link_clicks,actions,action_values", time_range: JSON.stringify(range), use_unified_attribution_setting: "true" });
      const byId = new Map(insights.rows.map((row) => [row.campaign_id, row]));
      return { account, range, campaigns: campaigns.rows.map((campaign) => campaignMetrics(campaign, byId.get(campaign.id), !insights.partial)).sort((a, b) => b.spend - a.spend), partial: campaigns.partial || insights.partial, fetchedAt: new Date().toISOString(), warning: campaigns.warning ?? insights.warning, retryAt: campaigns.retryAt ?? insights.retryAt };
    },
  };
}