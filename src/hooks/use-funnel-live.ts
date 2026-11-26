import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { LIVE_WINDOW_MS, liveVisitors, rankFunnels, topBy, type FunnelEventRow } from "@/lib/funnel-live";
import { windowStartUnix, type SalesWindow } from "@/lib/stripe-sales";

// "Hoje" precisa começar à meia-noite do fuso do aluno, não à meia-noite em UTC.
const sinceIso = (w: SalesWindow) =>
  new Date(windowStartUnix(w, Math.floor(Date.now() / 1000), -new Date().getTimezoneOffset()) * 1000).toISOString();

const COLS = "funnel_id, event_type, visitor_id, session_id, country, created_at";

async function fetchEvents(ids: string[], sinceIso: string, cap: number) {
  const out: FunnelEventRow[] = [];
  for (let page = 0; out.length < cap; page++) {
    const { data, error } = await supabase
      .from("funnel_events")
      .select(COLS)
      .in("funnel_id", ids)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .range(page * 1000, page * 1000 + 999);
    if (error) throw error;
    out.push(...((data ?? []) as FunnelEventRow[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const MOCK_COUNTRIES = ["BR", "US", "PT", "MX", "DE", "ES", "AR"];

export function useFunnelLive(salesWindow: SalesWindow, mock = false) {
  const { user } = useAuth();
  const funnels = useQuery({
    queryKey: ["dash-funnels", user?.id],
    enabled: !!user && !mock,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("funnels").select("id, name").eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
  const ids = (funnels.data ?? []).map((f) => f.id);
  const names = new Map((funnels.data ?? []).map((f) => [f.id, f.name] as const));

  const live = useQuery({
    queryKey: ["dash-funnel-live", ids.join(",")],
    enabled: ids.length > 0 && !mock,
    refetchInterval: 15_000,
    queryFn: () => fetchEvents(ids, new Date(Date.now() - LIVE_WINDOW_MS).toISOString(), 5000),
  });
  const period = useQuery({
    queryKey: ["dash-funnel-period", ids.join(","), String(salesWindow)],
    enabled: ids.length > 0 && !mock,
    staleTime: 60_000,
    queryFn: () => fetchEvents(ids, sinceIso(salesWindow), 20000),
  });

  if (mock) {
    const t = Math.floor(Date.now() / 15000);
    const byCountry = new Map(MOCK_COUNTRIES.map((c, i) => [c, 1 + ((t + i * 7) % (i === 0 ? 14 : 5))] as const));
    const total = [...byCountry.values()].reduce((a, b) => a + b, 0);
    return {
      hasFunnels: true,
      liveTotal: total,
      liveByCountry: byCountry,
      topSales: { name: "Funil VSL Principal", visitors: 1840, sales: 63 },
      topVisitors: { name: "Funil Quiz", visitors: 3120, sales: 41 },
    };
  }

  const l = liveVisitors(live.data ?? []);
  const ranks = rankFunnels(period.data ?? []);
  const named = (r: ReturnType<typeof topBy>) => (r ? { name: names.get(r.funnelId) ?? "Funil", visitors: r.visitors, sales: r.sales } : null);
  return {
    hasFunnels: ids.length > 0,
    liveTotal: l.total,
    liveByCountry: l.byCountry,
    topSales: named(topBy(ranks, "sales")),
    topVisitors: named(topBy(ranks, "visitors")),
  };
}
