// Read-only Stripe REST calls made with a student's own restricted key.
import { chargeToSale, type Sale } from "./stripe-sales";

const API = "https://api.stripe.com/v1";
const MAX_PAGES = 10;

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

async function listAll(key: string, path: string, params: Array<[string, string]>) {
  const items: any[] = [];
  let after: string | null = null;
  let truncated = false;
  for (let page = 0; page < MAX_PAGES; page++) {
    const body: any = await stripeGet(key, path, [...params, ["limit", "100"], ...(after ? [["starting_after", after] as [string, string]] : [])]);
    const data: any[] = body?.data ?? [];
    items.push(...data);
    if (!body?.has_more || !data.length) return { items, truncated };
    after = data[data.length - 1].id;
    if (page === MAX_PAGES - 1) truncated = true;
  }
  return { items, truncated };
}

/** Sales since `sinceUnix`; checkout session metadata is merged in when the key can read sessions. */
export async function fetchSales(key: string, sinceUnix: number): Promise<{ sales: Sale[]; truncated: boolean; checkoutRead: boolean }> {
  const since: [string, string] = ["created[gte]", String(sinceUnix)];
  const [charges, sessions] = await Promise.all([
    listAll(key, "/charges", [since, ["expand[]", "data.payment_intent"]]).catch(async (e) => {
      // Without PaymentIntents read access, list charges without expansion.
      if (e instanceof StripeError && e.status === 403) return listAll(key, "/charges", [since]);
      throw e;
    }),
    listAll(key, "/checkout/sessions", [since, ["status", "complete"]]).catch(() => null),
  ]);
  const metaByPi = new Map<string, Record<string, unknown>>();
  for (const s of sessions?.items ?? []) {
    const pi = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
    if (pi && s.metadata) metaByPi.set(pi, s.metadata);
  }
  const sales: Sale[] = [];
  for (const c of charges.items) {
    const pi = typeof c.payment_intent === "string" ? c.payment_intent : c.payment_intent?.id;
    const sale = chargeToSale(c, pi ? metaByPi.get(pi) : undefined);
    if (sale) sales.push(sale);
  }
  return { sales, truncated: charges.truncated, checkoutRead: sessions !== null };
}
