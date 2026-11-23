// Read-only Stripe REST calls made with a student's own restricted key.
import { chargeToSale, type Sale } from "./stripe-sales";

const API = "https://api.stripe.com/v1";
/** The period is split into windows fetched in parallel; each window reads at most this many pages of 100. */
const WINDOWS = 8;
const PAGES_PER_WINDOW = 5;

export class StripeError extends Error {
  constructor(public status: number, public code: string | null, message: string) {
    super(message);
  }
}

export async function stripeGet(key: string, path: string, params: Array<[string, string]> = []): Promise<any> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API}${path}${qs ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${key}`, "Stripe-Version": "2024-06-20" },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* keep null */ }
  if (!res.ok) {
    console.error(`Stripe ${path} failed [${res.status}]: ${text.slice(0, 500)}`);
    throw new StripeError(res.status, body?.error?.code ?? body?.error?.type ?? null, body?.error?.message ?? `Stripe ${res.status}`);
  }
  return body;
}

type Page = { items: any[]; truncated: boolean };

/** Cursor-paginated list endpoint (charges, checkout sessions). */
async function listAll(key: string, path: string, params: Array<[string, string]>, maxPages: number): Promise<Page> {
  const items: any[] = [];
  let after: string | null = null;
  for (let page = 0; page < maxPages; page++) {
    const body: any = await stripeGet(key, path, [...params, ["limit", "100"], ...(after ? [["starting_after", after] as [string, string]] : [])]);
    const data: any[] = body?.data ?? [];
    items.push(...data);
    if (!body?.has_more || !data.length) return { items, truncated: false };
    after = data[data.length - 1].id;
  }
  return { items, truncated: true };
}

/** Search endpoint: only succeeded charges, so declined attempts never cost a page. */
async function searchAll(key: string, query: string, extra: Array<[string, string]>, maxPages: number): Promise<Page> {
  const items: any[] = [];
  let next: string | null = null;
  for (let page = 0; page < maxPages; page++) {
    const body: any = await stripeGet(key, "/charges/search", [["query", query], ["limit", "100"], ...extra, ...(next ? [["page", next] as [string, string]] : [])]);
    const data: any[] = body?.data ?? [];
    items.push(...data);
    if (!body?.has_more || !body?.next_page || !data.length) return { items, truncated: false };
    next = body.next_page;
  }
  return { items, truncated: true };
}

/** Split [since, until] into contiguous windows so their pages download in parallel. */
function windows(since: number, until: number): Array<[number, number]> {
  const span = Math.max(1, until - since);
  const n = Math.max(1, Math.min(WINDOWS, Math.ceil(span / 3600)));
  const step = Math.ceil(span / n);
  const out: Array<[number, number]> = [];
  for (let a = since; a < until; a += step) out.push([a, Math.min(until, a + step)]);
  return out.length ? out : [[since, until]];
}

async function chargesInWindow(key: string, from: number, to: number, last: boolean): Promise<Page> {
  const upper = last ? `created<=${to}` : `created<${to}`;
  const query = `status:'succeeded' AND created>=${from} AND ${upper}`;
  const expand: Array<[string, string]> = [["expand[]", "data.payment_intent"]];
  try {
    return await searchAll(key, query, expand, PAGES_PER_WINDOW).catch((e) => {
      // Without PaymentIntents read access, search without the expansion.
      if (e instanceof StripeError && e.status === 403) return searchAll(key, query, [], PAGES_PER_WINDOW);
      throw e;
    });
  } catch (e) {
    if (!(e instanceof StripeError) || (e.status !== 400 && e.status !== 404)) throw e;
    // Search unavailable for this account: fall back to the plain list (includes failed charges, filtered later).
    const range: Array<[string, string]> = [["created[gte]", String(from)], [last ? "created[lte]" : "created[lt]", String(to)]];
    return listAll(key, "/charges", [...range, ["expand[]", "data.payment_intent"]], PAGES_PER_WINDOW).catch((err) => {
      if (err instanceof StripeError && err.status === 403) return listAll(key, "/charges", range, PAGES_PER_WINDOW);
      throw err;
    });
  }
}

/** Sales since `sinceUnix`; checkout session metadata is merged in when the key can read sessions. */
export async function fetchSales(key: string, sinceUnix: number, untilUnix?: number): Promise<{ sales: Sale[]; truncated: boolean; checkoutRead: boolean }> {
  const until = untilUnix ?? Math.floor(Date.now() / 1000);
  const parts = windows(sinceUnix, until);
  const sessionRange: Array<[string, string]> = [["created[gte]", String(sinceUnix)], ["created[lte]", String(until)], ["status", "complete"]];
  const [chunks, sessions] = await Promise.all([
    Promise.all(parts.map(([a, b], i) => chargesInWindow(key, a, b, i === parts.length - 1))),
    listAll(key, "/checkout/sessions", sessionRange, 10).catch(() => null),
  ]);
  const metaByPi = new Map<string, Record<string, unknown>>();
  for (const s of sessions?.items ?? []) {
    const pi = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
    if (pi && s.metadata) metaByPi.set(pi, s.metadata);
  }
  const seen = new Set<string>();
  const sales: Sale[] = [];
  for (const chunk of chunks) {
    for (const c of chunk.items) {
      if (c?.id && seen.has(c.id)) continue;
      if (c?.id) seen.add(c.id);
      const pi = typeof c.payment_intent === "string" ? c.payment_intent : c.payment_intent?.id;
      const sale = chargeToSale(c, pi ? metaByPi.get(pi) : undefined);
      if (sale) sales.push(sale);
    }
  }
  return { sales, truncated: chunks.some((c) => c.truncated), checkoutRead: sessions !== null };
}
