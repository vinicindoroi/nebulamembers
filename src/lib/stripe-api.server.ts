// Read-only Stripe REST calls made with a student's own restricted key.
import { chargeToDecline, chargeToSale, type Decline, type Sale } from "./stripe-sales";

const API = "https://api.stripe.com/v1";
/** The period is split into windows fetched in parallel; each window reads at most this many pages of 100. */
const WINDOWS = 8;
const PAGES_PER_WINDOW = 5;

export class StripeError extends Error {
  constructor(public status: number, public code: string | null, message: string) {
    super(message);
  }
}

/**
 * Stripe throttles bursty traffic (429), and a dashboard load fans out into many
 * search pages at once. Keep a few requests in flight and retry the throttled ones.
 */
const MAX_IN_FLIGHT = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class Semaphore {
  private free: number;
  private queue: Array<() => void> = [];
  constructor(n: number) { this.free = n; }
  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.free <= 0) await new Promise<void>((r) => this.queue.push(r));
    else this.free--;
    try { return await fn(); } finally {
      if (this.queue.length) this.queue.shift()!();
      else this.free++;
    }
  }
}

const apiSlot = new Semaphore(MAX_IN_FLIGHT);

async function stripeGetOnce(key: string, path: string, params: Array<[string, string]>): Promise<any> {
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

export async function stripeGet(key: string, path: string, params: Array<[string, string]> = []): Promise<any> {
  return apiSlot.run(async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await stripeGetOnce(key, path, params);
      } catch (e) {
        if (e instanceof StripeError && e.status === 429 && attempt < 2) {
          await sleep(400 * (attempt + 1));
          continue;
        }
        throw e;
      }
    }
  });
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

/** Declined charges in [since, until]; same windows as the sales, so the cap is not 300. */
async function declinesInWindow(key: string, from: number, to: number, last: boolean): Promise<Page> {
  const upper = last ? `created<=${to}` : `created<${to}`;
  const query = `status:'failed' AND created>=${from} AND ${upper}`;
  try {
    return await searchAll(key, query, [], PAGES_PER_WINDOW);
  } catch (e) {
    if (!(e instanceof StripeError) || (e.status !== 400 && e.status !== 404)) throw e;
    const range: Array<[string, string]> = [["created[gte]", String(from)], [last ? "created[lte]" : "created[lt]", String(to)]];
    return listAll(key, "/charges", range, PAGES_PER_WINDOW);
  }
}

export async function fetchDeclines(key: string, sinceUnix: number, untilUnix: number): Promise<{ declines: Decline[]; truncated: boolean }> {
  const parts = windows(sinceUnix, untilUnix);
  const chunks = await Promise.all(parts.map(([a, b], i) => declinesInWindow(key, a, b, i === parts.length - 1)));
  const seen = new Set<string>();
  const declines: Decline[] = [];
  for (const chunk of chunks) {
    for (const c of chunk.items) {
      if (c?.id && seen.has(c.id)) continue;
      if (c?.id) seen.add(c.id);
      const d = chargeToDecline(c);
      if (d) declines.push(d);
    }
  }
  return { declines, truncated: chunks.some((c) => c.truncated) };
}
