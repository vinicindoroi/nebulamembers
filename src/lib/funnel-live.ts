// Pure helpers: live visitors and funnel ranking from funnel_events rows.
export type FunnelEventRow = {
  funnel_id: string | null;
  event_type: string;
  visitor_id: string | null;
  session_id: string | null;
  country: string | null;
  created_at: string;
};

export const LIVE_WINDOW_MS = 5 * 60 * 1000;

const who = (e: FunnelEventRow) => e.visitor_id || e.session_id || null;

/** Visitors seen in the last 5 minutes: total, per funnel and per country (each visitor counted once). */
export function liveVisitors(rows: FunnelEventRow[], now = Date.now()) {
  const since = now - LIVE_WINDOW_MS;
  const last = new Map<string, FunnelEventRow>();
  for (const e of rows) {
    const id = who(e);
    if (!id || Date.parse(e.created_at) < since) continue;
    const prev = last.get(id);
    if (!prev || prev.created_at < e.created_at) last.set(id, e);
  }
  const byFunnel = new Map<string, number>();
  const byCountry = new Map<string, number>();
  for (const e of last.values()) {
    if (e.funnel_id) byFunnel.set(e.funnel_id, (byFunnel.get(e.funnel_id) ?? 0) + 1);
    const c = (e.country || "").toUpperCase();
    if (c) byCountry.set(c, (byCountry.get(c) ?? 0) + 1);
  }
  return { total: last.size, byFunnel, byCountry };
}

export type FunnelRank = { funnelId: string; visitors: number; sales: number };

/** Per funnel: unique visitors and sales ("purchased" events) in the given rows. */
export function rankFunnels(rows: FunnelEventRow[]): FunnelRank[] {
  const m = new Map<string, { v: Set<string>; sales: number }>();
  for (const e of rows) {
    if (!e.funnel_id) continue;
    const s = m.get(e.funnel_id) ?? { v: new Set<string>(), sales: 0 };
    const id = who(e);
    if (id) s.v.add(id);
    if (e.event_type === "purchased") s.sales++;
    m.set(e.funnel_id, s);
  }
  return [...m].map(([funnelId, s]) => ({ funnelId, visitors: s.v.size, sales: s.sales }));
}

export function topBy(ranks: FunnelRank[], key: "visitors" | "sales"): FunnelRank | null {
  const best = [...ranks].sort((a, b) => b[key] - a[key])[0];
  return best && best[key] > 0 ? best : null;
}
