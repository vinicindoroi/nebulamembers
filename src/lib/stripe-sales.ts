// Pure Stripe sales helpers (no app imports): key validation, charge → sale mapping and dashboard totals.

/** Only Stripe restricted keys are accepted, so a leaked key can never move money. */
export function isRestrictedStripeKey(key: string): boolean {
  return /^rk_(live|test)_[A-Za-z0-9]{10,}$/.test(key.trim());
}

export function keyLast4(key: string): string {
  return key.trim().slice(-4);
}

/** Currencies Stripe charges in whole units (amount 100 = 100, not 1.00). */
export const ZERO_DECIMAL = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

export function toMajor(minor: number, currency: string): number {
  return ZERO_DECIMAL.has(currency.toLowerCase()) ? minor : minor / 100;
}

type Meta = Record<string, unknown> | null | undefined;

/** utm_campaign from the first metadata that has it (charge, payment, checkout). */
export function extractCampaign(...metas: Meta[]): string | null {
  for (const m of metas) {
    if (!m || typeof m !== "object") continue;
    for (const [k, v] of Object.entries(m)) {
      const key = k.toLowerCase();
      if ((key === "utm_campaign" || key === "campaign") && typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return null;
}

const iso2 = (v: unknown) => (typeof v === "string" && /^[A-Za-z]{2}$/.test(v) ? v.toUpperCase() : null);

/** Buyer country: billing address, then card country, then shipping address. */
export function saleCountry(charge: any): string | null {
  return (
    iso2(charge?.billing_details?.address?.country) ??
    iso2(charge?.payment_method_details?.card?.country) ??
    iso2(charge?.shipping?.address?.country) ??
    null
  );
}

export type Sale = { amount: number; currency: string; country: string | null; campaign: string | null; created: number };

/** Succeeded, not fully refunded charge → sale with the net amount (minor units). Null when it doesn't count. */
export function chargeToSale(charge: any, checkoutMeta?: Meta): Sale | null {
  if (!charge || charge.status !== "succeeded" || charge.paid === false) return null;
  const net = (Number(charge.amount) || 0) - (Number(charge.amount_refunded) || 0);
  if (net <= 0) return null;
  const pi = typeof charge.payment_intent === "object" ? charge.payment_intent : null;
  return {
    amount: net,
    currency: String(charge.currency || "").toLowerCase(),
    country: saleCountry(charge),
    campaign: extractCampaign(charge.metadata, pi?.metadata, checkoutMeta),
    created: Number(charge.created) || 0,
  };
}

export type Ranked = { key: string; revenue: number; orders: number };

export type SalesSummary = {
  currency: string | null;
  revenue: number;
  orders: number;
  avgTicket: number;
  countries: Ranked[];
  campaigns: Ranked[];
  topCountry: Ranked | null;
  topCampaign: Ranked | null;
  withoutCampaign: number;
  otherCurrencies: Ranked[];
};

function rank(map: Map<string, Ranked>): Ranked[] {
  return [...map.values()].sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);
}

function bump(map: Map<string, Ranked>, key: string, amount: number) {
  const r = map.get(key) ?? { key, revenue: 0, orders: 0 };
  r.revenue += amount;
  r.orders += 1;
  map.set(key, r);
}

/**
 * Totals in the main currency (the one with most orders; amounts in different currencies are never summed).
 * Sales without campaign don't compete for "top campaign".
 */
export function summarizeSales(sales: Sale[]): SalesSummary {
  const byCurrency = new Map<string, Ranked>();
  for (const s of sales) bump(byCurrency, s.currency, s.amount);
  const currencies = [...byCurrency.values()].sort((a, b) => b.orders - a.orders || b.revenue - a.revenue);
  const main = currencies[0]?.key ?? null;

  const countries = new Map<string, Ranked>();
  const campaigns = new Map<string, Ranked>();
  let revenue = 0;
  let orders = 0;
  let withoutCampaign = 0;
  for (const s of sales) {
    if (s.currency !== main) continue;
    revenue += s.amount;
    orders += 1;
    if (s.country) bump(countries, s.country, s.amount);
    if (s.campaign) bump(campaigns, s.campaign, s.amount);
    else withoutCampaign += 1;
  }
  const rc = rank(countries);
  const rk = rank(campaigns);
  return {
    currency: main,
    revenue,
    orders,
    avgTicket: orders ? Math.round(revenue / orders) : 0,
    countries: rc,
    campaigns: rk,
    topCountry: rc[0] ?? null,
    topCampaign: rk[0] ?? null,
    withoutCampaign,
    otherCurrencies: currencies.slice(1),
  };
}

export const SALES_PERIODS = [7, 30, 90] as const;
export type SalesPeriod = (typeof SALES_PERIODS)[number];

// ---------- Sales history (date range, daily series, recent sales) ----------

export const MAX_HISTORY_DAYS = 366;

/** Error message for an invalid range (unix seconds), or null when it is fine. */
export function validateRange(fromUnix: number, toUnix: number, nowUnix: number): string | null {
  if (!Number.isFinite(fromUnix) || !Number.isFinite(toUnix)) return "Período inválido.";
  if (fromUnix > toUnix) return "A data inicial precisa ser antes da final.";
  if (fromUnix > nowUnix) return "A data inicial não pode ser no futuro.";
  if (toUnix - fromUnix > MAX_HISTORY_DAYS * 86400) return `Escolha um período de até ${MAX_HISTORY_DAYS} dias.`;
  return null;
}

/** Local calendar day (YYYY-MM-DD) of a unix time, for a fixed offset in minutes east of UTC. */
export function dayKey(unix: number, offsetMin: number): string {
  return new Date((unix + offsetMin * 60) * 1000).toISOString().slice(0, 10);
}

export type DayPoint = { date: string; revenue: number; orders: number };

/** One point per local day in [from, to], zero-filled; only sales in `currency` are counted. */
export function dailySeries(sales: Sale[], currency: string | null, fromUnix: number, toUnix: number, offsetMin: number): DayPoint[] {
  const days: DayPoint[] = [];
  const index = new Map<string, DayPoint>();
  const last = dayKey(toUnix, offsetMin);
  let cursor = Date.parse(`${dayKey(fromUnix, offsetMin)}T00:00:00Z`);
  for (let i = 0; i <= MAX_HISTORY_DAYS + 1; i++) {
    const key = new Date(cursor).toISOString().slice(0, 10);
    const p = { date: key, revenue: 0, orders: 0 };
    days.push(p);
    index.set(key, p);
    if (key >= last) break;
    cursor += 86400_000;
  }
  if (!currency) return days;
  for (const s of sales) {
    if (s.currency !== currency || s.created < fromUnix || s.created > toUnix) continue;
    const p = index.get(dayKey(s.created, offsetMin));
    if (p) {
      p.revenue += s.amount;
      p.orders += 1;
    }
  }
  return days;
}

/** Day with the highest revenue (earliest on ties), or null when nothing sold. */
export function bestDay(series: DayPoint[]): DayPoint | null {
  let best: DayPoint | null = null;
  for (const p of series) if (p.revenue > 0 && (!best || p.revenue > best.revenue)) best = p;
  return best;
}

/** Most recent sales first. */
export function recentSales(sales: Sale[], n: number): Sale[] {
  return [...sales].sort((a, b) => b.created - a.created).slice(0, n);
}
