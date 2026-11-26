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

/** Sales window on the globe: the buyer's own calendar day, or the last N days. */
export type SalesWindow = SalesPeriod | "today";
export const SALES_WINDOWS: readonly SalesWindow[] = ["today", ...SALES_PERIODS];

/**
 * First second of the window (unix). "today" is midnight in the buyer's own
 * calendar (offsetMin = minutes east of UTC), never midnight in UTC.
 */
export function windowStartUnix(win: SalesWindow, nowUnix: number, offsetMin: number): number {
  if (win !== "today") return nowUnix - win * 86400;
  const midnight = Math.floor(Date.parse(`${dayKey(nowUnix, offsetMin)}T00:00:00Z`) / 1000) - offsetMin * 60;
  return Math.max(0, Math.min(midnight, nowUnix));
}

/** "hoje" / "últimos 7 dias" — for headings and empty states. */
export function windowLabel(win: SalesWindow): string {
  return win === "today" ? "hoje" : `últimos ${win} dias`;
}

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

// ---------- Declined payments ----------

export type Decline = { amount: number; currency: string; country: string | null; campaign: string | null; created: number; reason: string };

const REASONS: Record<string, string> = {
  insufficient_funds: "Saldo insuficiente",
  generic_decline: "Recusado pelo banco",
  do_not_honor: "Recusado pelo banco",
  card_declined: "Cartão recusado",
  lost_card: "Cartão perdido",
  stolen_card: "Cartão roubado",
  expired_card: "Cartão vencido",
  incorrect_cvc: "CVC incorreto",
  invalid_cvc: "CVC incorreto",
  incorrect_number: "Número do cartão incorreto",
  invalid_number: "Número do cartão incorreto",
  invalid_expiry_month: "Validade incorreta",
  invalid_expiry_year: "Validade incorreta",
  incorrect_zip: "CEP/ZIP incorreto",
  processing_error: "Erro de processamento",
  fraudulent: "Suspeita de fraude",
  merchant_blacklist: "Bloqueado pela Stripe (Radar)",
  highest_risk_level: "Bloqueado pela Stripe (Radar)",
  card_velocity_exceeded: "Limite de tentativas excedido",
  withdrawal_count_limit_exceeded: "Limite do cartão excedido",
  card_not_supported: "Cartão não suportado",
  currency_not_supported: "Moeda não suportada",
  transaction_not_allowed: "Transação não permitida",
  authentication_required: "Autenticação 3DS necessária",
  try_again_later: "Tente novamente mais tarde",
  pickup_card: "Cartão retido pelo banco",
  restricted_card: "Cartão restrito",
  security_violation: "Violação de segurança",
  service_not_allowed: "Serviço não permitido",
  call_issuer: "Contatar o banco emissor",
};

/** Human (pt-BR) reason for a failed charge: decline code, then Radar/outcome, then failure code. */
export function declineReason(charge: any): string {
  const codes = [charge?.outcome?.reason, charge?.failure_code];
  if (charge?.outcome?.type === "blocked" && !charge?.outcome?.reason) return "Bloqueado pela Stripe (Radar)";
  for (const c of codes) if (typeof c === "string" && REASONS[c]) return REASONS[c]!;
  const raw = codes.find((c) => typeof c === "string" && c);
  return raw ? String(raw).replace(/_/g, " ") : "Motivo não informado";
}

/** Failed charge → declined attempt (amount in minor units). Null for anything that is not a failure. */
export function chargeToDecline(charge: any, checkoutMeta?: Meta): Decline | null {
  if (!charge || charge.status !== "failed") return null;
  const pi = typeof charge.payment_intent === "object" ? charge.payment_intent : null;
  return {
    amount: Number(charge.amount) || 0,
    currency: String(charge.currency || "").toLowerCase(),
    country: saleCountry(charge),
    campaign: extractCampaign(charge.metadata, pi?.metadata, checkoutMeta),
    created: Number(charge.created) || 0,
    reason: declineReason(charge),
  };
}

export type DeclineSummary = { count: number; rate: number; reasons: { reason: string; count: number }[]; recent: Decline[] };

/** "300" — or "300+" when the fetch hit the cap, so the number is never read as the real total. */
export function declineCountLabel(count: number, truncated: boolean): string {
  return truncated ? `${count.toLocaleString("pt-BR")}+` : count.toLocaleString("pt-BR");
}

/** "54,3%" — with "≈" when the sample was capped and the share is only an estimate. */
export function declineRateLabel(rate: number, truncated: boolean): string {
  const text = rate.toLocaleString("pt-BR");
  return truncated ? `≈ ${text}%` : `${text}%`;
}

/** Count, decline rate over all attempts (0–100, one decimal), reasons by frequency and the latest attempts. */
export function summarizeDeclines(declines: Decline[], salesCount: number, recentN = 8): DeclineSummary {
  const by = new Map<string, number>();
  for (const d of declines) by.set(d.reason, (by.get(d.reason) ?? 0) + 1);
  const total = declines.length + salesCount;
  return {
    count: declines.length,
    rate: total ? Math.round((declines.length / total) * 1000) / 10 : 0,
    reasons: [...by].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason)),
    recent: [...declines].sort((a, b) => b.created - a.created).slice(0, recentN),
  };
}

export type DeclineSource = "stripe" | "checkout" | "cliente";
export type DeclineFinding = { source: DeclineSource; title: string; detail: string; count: number };
export type DeclineDiagnosis = { main: DeclineSource | null; share: Record<DeclineSource, number>; findings: DeclineFinding[] };

const SOURCE_RULES: { source: DeclineSource; reasons: string[]; title: string; detail: string }[] = [
  { source: "stripe", reasons: ["Bloqueado pela Stripe (Radar)"], title: "Antifraude da Stripe bloqueando", detail: "O Radar está barrando pagamentos antes do banco. Revise as regras do Radar ou peça liberação à Stripe; muitos bloqueios seguidos costumam indicar teste de cartões por robôs." },
  { source: "checkout", reasons: ["CVC incorreto", "Validade incorreta", "CEP/ZIP incorreto", "Número do cartão inválido", "Número do cartão incorreto"], title: "Campos do cartão com erro", detail: "Clientes erram CVC, validade ou CEP. Melhore a validação e as máscaras dos campos e não peça CEP se não for necessário." },
  { source: "checkout", reasons: ["Autenticação 3DS necessária"], title: "3D Secure não tratado", detail: "O banco pediu autenticação e o checkout não completou o 3DS. Use Payment Intents/Checkout da Stripe com confirmação no navegador." },
  { source: "checkout", reasons: ["Transação não permitida", "Moeda não suportada", "Cartão não suportado", "Serviço não permitido"], title: "Tipo de compra não aceito pelo cartão", detail: "Cartões recusando a moeda ou compra internacional. Ofereça moeda local e outros métodos (Apple/Google Pay, Link)." },
  { source: "checkout", reasons: ["Limite de tentativas excedido", "Tente novamente mais tarde", "Erro de processamento"], title: "Tentativas repetidas", detail: "O mesmo cartão tenta várias vezes seguidas. Bloqueie cliques duplos no botão de pagar e limite novas tentativas." },
  { source: "cliente", reasons: ["Saldo insuficiente", "Recusado pelo banco", "Contatar o banco emissor", "Suspeita de fraude", "Cartão restrito", "Cartão retido pelo banco", "Limite do cartão excedido", "Cartão perdido", "Cartão roubado", "Cartão expirado"], title: "Banco do cliente recusou", detail: "Saldo, limite ou bloqueio do próprio banco. Não é falha sua: ofereça outro método de pagamento e recuperação por e-mail." },
];

/** Classifies decline reasons into Stripe, checkout or customer-bank causes, with actionable findings. */
export function diagnoseDeclines(reasons: { reason: string; count: number }[], recent: Decline[] = []): DeclineDiagnosis {
  const share: Record<DeclineSource, number> = { stripe: 0, checkout: 0, cliente: 0 };
  const findings: DeclineFinding[] = [];
  for (const rule of SOURCE_RULES) {
    const count = reasons.filter((r) => rule.reasons.includes(r.reason)).reduce((s, r) => s + r.count, 0);
    if (!count) continue;
    share[rule.source] += count;
    findings.push({ source: rule.source, title: rule.title, detail: rule.detail, count });
  }
  // Same amount+campaign failing several times within 2 minutes = retries from the checkout.
  const sorted = [...recent].sort((a, b) => a.created - b.created);
  let bursts = 0;
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1]!, b = sorted[i]!;
    if (b.created - a.created <= 120 && a.amount === b.amount && a.campaign === b.campaign) bursts++;
  }
  if (bursts >= 2 && !findings.some((f) => f.title === "Tentativas repetidas")) {
    findings.push({ source: "checkout", title: "Tentativas repetidas", detail: "Várias recusas do mesmo valor em poucos segundos. Bloqueie clique duplo no botão de pagar e limite novas tentativas.", count: bursts });
  }
  findings.sort((x, y) => y.count - x.count);
  const total = share.stripe + share.checkout + share.cliente;
  const main = total ? (Object.entries(share).sort((x, y) => y[1] - x[1])[0]![0] as DeclineSource) : null;
  return { main, share, findings };
}
