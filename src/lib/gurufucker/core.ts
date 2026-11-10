// Lógica pura do Gurufucker (sem imports de app): funil, moedas e payload da Utmify.

export const CURRENCIES = {
  BRL: { label: "Real", locale: "pt-BR" },
  USD: { label: "Dólar americano", locale: "en-US" },
  EUR: { label: "Euro", locale: "de-DE" },
  GBP: { label: "Libra", locale: "en-GB" },
  ARS: { label: "Peso argentino", locale: "es-AR" },
  CAD: { label: "Dólar canadense", locale: "en-CA" },
  COP: { label: "Peso colombiano", locale: "es-CO" },
  MXN: { label: "Peso mexicano", locale: "es-MX" },
  PYG: { label: "Guarani", locale: "es-PY" },
  CLP: { label: "Peso chileno", locale: "es-CL" },
  PEN: { label: "Sol peruano", locale: "es-PE" },
  PLN: { label: "Złoty", locale: "pl-PL" },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

export function isCurrency(v: unknown): v is CurrencyCode {
  return typeof v === "string" && v in CURRENCIES;
}

export function formatMoney(cents: number, currency: string): string {
  const code = isCurrency(currency) ? currency : "BRL";
  try {
    return new Intl.NumberFormat(CURRENCIES[code].locale, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format((cents || 0) / 100);
  } catch {
    return `${code} ${((cents || 0) / 100).toFixed(2)}`;
  }
}

/** "1.297,90" | "97" | "97.5" -> centavos. Inválido -> 0. */
export function parsePriceToCents(raw: string): number {
  const s = String(raw ?? "").trim().replace(/[^\d.,]/g, "");
  if (!s) return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let normalized: string;
  if (lastComma > lastDot) normalized = s.replace(/\./g, "").replace(",", ".");
  else if (lastDot > lastComma && s.length - lastDot - 1 <= 2) normalized = s.replace(/,/g, "");
  else normalized = s.replace(/[.,]/g, "");
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

export function centsToInput(cents: number): string {
  return ((cents || 0) / 100).toFixed(2).replace(".", ",");
}

export type FunnelStep = {
  id: string;
  name: string;
  priceCents: number;
  /** Chance (0–100) de quem comprou o produto anterior comprar este. Ignorada no 1º. */
  conv: number;
};

export type PaymentMethod = "pix" | "credit_card" | "boleto";

export type GuruSettings = {
  platform: string;
  paymentMethod: PaymentMethod;
  currency: CurrencyCode;
  isTest: boolean;
  randomCustomer: boolean;
  customerName: string;
  customerEmail: string;
  stepDelaySec: number;
  utm_source: string;
  utm_campaign: string;
  utm_medium: string;
  utm_content: string;
  utm_term: string;
};

export const DEFAULT_SETTINGS: GuruSettings = {
  platform: "Nebula",
  paymentMethod: "credit_card",
  currency: "BRL",
  isTest: false,
  randomCustomer: true,
  customerName: "Cliente",
  customerEmail: "cliente@example.com",
  stepDelaySec: 2,
  utm_source: "",
  utm_campaign: "",
  utm_medium: "",
  utm_content: "",
  utm_term: "",
};

export function normalizeSettings(raw: unknown): GuruSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<GuruSettings>;
  const s = { ...DEFAULT_SETTINGS, ...r };
  if (!isCurrency(s.currency)) s.currency = "BRL";
  if (!["pix", "credit_card", "boleto"].includes(s.paymentMethod)) s.paymentMethod = "credit_card";
  s.stepDelaySec = clamp(Math.floor(Number(s.stepDelaySec) || 0), 0, 30);
  s.isTest = !!s.isTest;
  s.randomCustomer = s.randomCustomer !== false;
  return s;
}

export function normalizeFunnel(raw: unknown): FunnelStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .slice(0, 20)
    .map((x, i) => {
      const it = x as Partial<FunnelStep>;
      return {
        id: String(it.id || `p${i + 1}`),
        name: String(it.name ?? "").slice(0, 120),
        priceCents: Math.max(0, Math.round(Number(it.priceCents) || 0)),
        conv: clamp(Math.round(Number(it.conv ?? 100)), 0, 100),
      };
    });
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Produtos que dá para disparar: com valor > 0, na ordem do funil. */
export function sellableSteps(funnel: FunnelStep[]): FunnelStep[] {
  return funnel.filter((s) => s.priceCents > 0);
}

/**
 * Simula um comprador percorrendo o funil na ordem: sempre compra o 1º;
 * cada produto seguinte é comprado com a chance `conv`, e o funil para
 * no primeiro produto recusado.
 */
export function simulateBuyer(funnel: FunnelStep[], rng: () => number = Math.random): FunnelStep[] {
  const steps = sellableSteps(funnel);
  if (steps.length === 0) return [];
  const bought: FunnelStep[] = [steps[0]];
  for (let i = 1; i < steps.length; i++) {
    if (rng() * 100 < steps[i].conv) bought.push(steps[i]);
    else break;
  }
  return bought;
}

/** Chance (0–1) de um comprador chegar a comprar cada produto. */
export function reachChances(funnel: FunnelStep[]): number[] {
  const steps = sellableSteps(funnel);
  const out: number[] = [];
  let p = 1;
  steps.forEach((s, i) => {
    if (i > 0) p *= s.conv / 100;
    out.push(p);
  });
  return out;
}

/** Valor médio esperado por comprador, em centavos. */
export function expectedTicketCents(funnel: FunnelStep[]): number {
  const steps = sellableSteps(funnel);
  const chances = reachChances(funnel);
  return Math.round(steps.reduce((sum, s, i) => sum + s.priceCents * chances[i], 0));
}

const FIRST = ["Lucas", "Mariana", "Pedro", "Juliana", "Gabriel", "Camila", "Rafael", "Larissa", "Bruno", "Fernanda", "Thiago", "Beatriz", "Mateus", "Amanda", "Felipe", "Letícia", "Gustavo", "Carolina", "Diego", "Isabela", "Rodrigo", "Patrícia", "André", "Vanessa"];
const LAST = ["Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Ferreira", "Almeida", "Ribeiro", "Carvalho", "Gomes", "Martins", "Rocha", "Barbosa", "Araújo"];

export function randomCustomer(rng: () => number = Math.random) {
  const f = FIRST[Math.floor(rng() * FIRST.length)];
  const l = LAST[Math.floor(rng() * LAST.length)];
  const n = Math.floor(rng() * 900) + 100;
  const slug = `${f}.${l}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return { name: `${f} ${l}`, email: `${slug}${n}@gmail.com` };
}

export function fmtUTC(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

export function buildOrderBody(args: {
  orderId: string;
  step: FunnelStep;
  settings: GuruSettings;
  customer: { name: string; email: string };
  status: "waiting_payment" | "paid";
  createdAt: Date;
  approvedAt: Date | null;
}) {
  const { step, settings, customer } = args;
  const nul = (v: string) => (v && v.trim() ? v.trim() : null);
  return {
    orderId: args.orderId,
    platform: settings.platform || "Nebula",
    paymentMethod: settings.paymentMethod,
    status: args.status,
    createdAt: fmtUTC(args.createdAt),
    approvedDate: args.approvedAt ? fmtUTC(args.approvedAt) : null,
    refundedAt: null,
    customer: { name: customer.name, email: customer.email, phone: null, document: null, country: "BR" },
    products: [
      {
        id: step.id,
        name: step.name || "Produto",
        planId: null,
        planName: null,
        quantity: 1,
        priceInCents: step.priceCents,
      },
    ],
    trackingParameters: {
      src: null,
      sck: null,
      utm_source: nul(settings.utm_source),
      utm_campaign: nul(settings.utm_campaign),
      utm_medium: nul(settings.utm_medium),
      utm_content: nul(settings.utm_content),
      utm_term: nul(settings.utm_term),
    },
    commission: {
      totalPriceInCents: step.priceCents,
      gatewayFeeInCents: 0,
      userCommissionInCents: step.priceCents,
      currency: settings.currency,
    },
    isTest: settings.isTest,
  };
}

/** Próximo intervalo (s) entre compradores no disparo automático. */
export function nextDelaySec(job: { random_enabled: boolean; interval_sec: number; random_min_sec: number; random_max_sec: number }, rng: () => number = Math.random) {
  if (job.random_enabled) {
    const min = Math.min(job.random_min_sec, job.random_max_sec);
    const max = Math.max(job.random_min_sec, job.random_max_sec);
    return Math.max(1, min + rng() * (max - min));
  }
  return Math.max(1, job.interval_sec);
}
