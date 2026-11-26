import { format } from "date-fns";
import { summarizeDeclines, summarizeSales, windowStartUnix, type DayPoint, type Decline, type DeclineSummary, type Sale, type SalesSummary, type SalesWindow } from "./stripe-sales";

// Deterministic fake sales for the dev-only "</>" toggle on the dashboard.
// Same date always yields the same sales, so the globe and the history agree.

const COUNTRIES = ["BR", "US", "PT", "MX", "AR", "ES", "GB", "AU", "CA", "DE"];
const CAMPAIGNS = [
  "[CBO]-[GROK]-[13/11] CTV 018 LEVA 09/11",
  "remarketing-7d",
  "lookalike-1pct",
  "advantage-plus",
  "teste-criativo-03",
];
const PRICES = [9700, 14700, 19700, 29700, 49700];

function seed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mockSalesForRange(fromUnix: number, toUnix: number): Sale[] {
  const sales: Sale[] = [];
  const DAY = 86400;
  for (let t = fromUnix - (fromUnix % DAY); t <= toUnix; t += DAY) {
    const date = format(new Date(t * 1000), "yyyy-MM-dd");
    const n = 2 + (seed(date) % 9);
    for (let i = 0; i < n; i++) {
      const si = seed(`${date}#${i}`);
      sales.push({
        amount: PRICES[si % PRICES.length]!,
        currency: "usd",
        country: COUNTRIES[si % COUNTRIES.length]!,
        campaign: si % 4 === 0 ? null : CAMPAIGNS[si % CAMPAIGNS.length]!,
        created: t + (si % 86000),
      });
    }
  }
  return sales;
}

export function mockSummary(period: SalesWindow): SalesSummary {
  const to = Math.floor(Date.now() / 1000);
  const from = windowStartUnix(period, to, -new Date().getTimezoneOffset());
  return summarizeSales(mockSalesForRange(from, to));
}

export function mockHistory(fromUnix: number, toUnix: number) {
  const sales = mockSalesForRange(fromUnix, toUnix);
  const byDay = new Map<string, DayPoint>();
  for (const s of sales) {
    const d = format(new Date(s.created * 1000), "yyyy-MM-dd");
    const p = byDay.get(d) ?? { date: d, revenue: 0, orders: 0 };
    p.revenue += s.amount;
    p.orders += 1;
    byDay.set(d, p);
  }
  const series = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
  return {
    summary: summarizeSales(sales),
    series,
    bestDay: series.reduce<DayPoint | null>((b, p) => (!b || p.revenue > b.revenue ? p : b), null),
    recent: [...sales].sort((a, b) => b.created - a.created).slice(0, 8),
    truncated: false,
    declines: mockDeclines(sales),
  };
}

const MOCK_REASONS = ["Saldo insuficiente", "Saldo insuficiente", "Saldo insuficiente", "Recusado pelo banco", "Recusado pelo banco", "CVC incorreto", "Cartão vencido", "Autenticação 3DS necessária", "Suspeita de fraude"];

function mockDeclines(sales: Sale[]): DeclineSummary & { truncated: boolean } {
  const declines: Decline[] = sales
    .filter((_, i) => i % 6 === 2)
    .map((s, i) => ({ ...s, created: s.created - 90, reason: MOCK_REASONS[i % MOCK_REASONS.length]! }));
  return { ...summarizeDeclines(declines, sales.length), truncated: false };
}
