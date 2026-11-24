import { lazy, Suspense, useMemo, useState, type ReactNode } from "react";
import { ClientOnly, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowRight, Globe2, Megaphone, ShoppingBag, Receipt, Sparkles, Trophy } from "lucide-react";
import { getStripeSales } from "@/lib/stripe-connect.functions";
import { mockSummary } from "@/lib/mock-sales";
import { SALES_PERIODS, type SalesPeriod } from "@/lib/stripe-sales";
import { countryName, flag, money } from "./format";
import { COUNTRY_CENTROIDS } from "@/lib/country-centroids";
import type { GlobePoint } from "./SalesGlobe";

const SalesGlobe = lazy(() => import("./SalesGlobe"));

const GlobeFallback = () => <div className="w-full aspect-square max-w-[480px] mx-auto rounded-full dash-skel" />;

// Decorative preview routes shown before the Stripe is connected (labelled "Prévia").
const PREVIEW_HUB: [number, number] = [-14.24, -51.93];
const PREVIEW_POINTS: GlobePoint[] = [
  { location: PREVIEW_HUB, weight: 10 },
  { location: [39.4, -8.22], weight: 5 },
  { location: [37.09, -95.71], weight: 6 },
  { location: [23.63, -102.55], weight: 3 },
  { location: [-38.42, -63.62], weight: 3 },
  { location: [40.46, -3.75], weight: 2 },
];

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-70" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
    </span>
  );
}

function GlobeStage({ points, focus, children }: { points: GlobePoint[]; focus: [number, number] | null; children?: ReactNode }) {
  return (
    <div className="globe-stage relative flex items-center justify-center p-6 sm:p-10 border-b lg:border-b-0 lg:border-r border-border min-h-[320px]">
      <ClientOnly fallback={<GlobeFallback />}>
        <Suspense fallback={<GlobeFallback />}>
          <SalesGlobe points={points} focus={focus} />
        </Suspense>
      </ClientOnly>
      {children}
    </div>
  );
}

export function StripeSalesPanel({ mock = false }: { mock?: boolean }) {
  const [days, setDays] = useState<SalesPeriod>(30);
  const fetchSales = useServerFn(getStripeSales);
  const q = useQuery({
    queryKey: ["stripe-sales", days],
    queryFn: () => fetchSales({ data: { days } }),
    staleTime: 5 * 60_000,
    retry: false,
    enabled: !mock,
  });

  const d = mock
    ? { connected: true as const, livemode: false, accountName: "Conta de exemplo", summary: mockSummary(days), truncated: false }
    : q.data;
  const summary = d && d.connected && "summary" in d ? d.summary : null;

  const points = useMemo<GlobePoint[]>(
    () =>
      (summary?.countries ?? [])
        .filter((c) => COUNTRY_CENTROIDS[c.key])
        .map((c) => ({ location: COUNTRY_CENTROIDS[c.key]!, weight: c.revenue })),
    [summary],
  );
  const focus = useMemo<[number, number] | null>(
    () => (summary?.topCountry && COUNTRY_CENTROIDS[summary.topCountry.key]) || null,
    [summary],
  );

  if (!mock && q.isLoading) {
    return (
      <section className="relative rounded-2xl border border-border bg-card overflow-hidden grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-stretch">
        <div className="sales-hairline absolute inset-x-0 top-0 h-px" aria-hidden />
        <GlobeStage points={[]} focus={PREVIEW_HUB} />
        <div className="p-6 sm:p-8 flex flex-col justify-center gap-4" aria-busy="true">
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground"><LiveDot /> Buscando suas vendas na Stripe…</p>
          <div className="h-12 w-56 rounded-lg dash-skel" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 rounded-xl dash-skel" />
            <div className="h-20 rounded-xl dash-skel" />
          </div>
          <div className="h-16 rounded-xl dash-skel" />
        </div>
      </section>
    );
  }

  if (!mock && q.isError) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 flex items-center gap-3 text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="flex-1">{(q.error as Error).message || "Não foi possível carregar suas vendas."}</span>
        <button onClick={() => q.refetch()} className="text-xs text-foreground hover:underline">Tentar de novo</button>
      </section>
    );
  }

  if (!d || !d.connected) {
    return (
      <section className="relative rounded-2xl border border-border bg-card overflow-hidden grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-stretch">
        <div className="sales-hairline absolute inset-x-0 top-0 h-px" aria-hidden />
        <GlobeStage points={PREVIEW_POINTS} focus={PREVIEW_HUB}>
          <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 backdrop-blur px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <LiveDot /> Prévia
          </span>
        </GlobeStage>
        <div className="p-6 sm:p-10 flex flex-col justify-center gap-5">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-medium">
            <Sparkles className="h-3 w-3" /> Mapa de vendas
          </span>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight text-gradient-primary">Veja o mundo comprando de você</h2>
            <p className="text-sm text-muted-foreground max-w-md">Conecte sua Stripe e o globo acende nos países de onde vêm suas vendas.</p>
          </div>
          <ul className="space-y-2.5 text-sm">
            {[
              { icon: Receipt, text: "Faturamento, vendas e ticket médio" },
              { icon: Globe2, text: "País que mais vende" },
              { icon: Megaphone, text: "Campanha campeã (utm_campaign)" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-lg border border-border bg-muted/40 text-primary flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-foreground/90">{text}</span>
              </li>
            ))}
          </ul>
          <Link to="/settings" search={{ tab: "integrations" } as never} className="sales-glow-cta inline-flex w-fit items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            Conectar Stripe <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>
    );
  }

  if ("invalidKey" in d) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
        <p className="flex-1 text-sm text-muted-foreground">A Stripe não aceitou mais a sua chave. Ela pode ter sido apagada ou perdeu a permissão de leitura.</p>
        <Link to="/settings" search={{ tab: "integrations" } as never} className="text-xs text-foreground hover:underline">Conectar de novo</Link>
      </section>
    );
  }

  const s = summary!;
  const cur = s.currency;
  const stats = [
    { label: "Vendas", value: s.orders.toLocaleString("pt-BR"), icon: ShoppingBag },
    { label: "Ticket médio", value: money(s.avgTicket, cur), icon: Receipt },
  ];

  return (
    <section className="relative rounded-2xl border border-border bg-card overflow-hidden">
      <div className="sales-hairline absolute inset-x-0 top-0 h-px" aria-hidden />
      <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <GlobeStage points={points} focus={focus}>
          <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 backdrop-blur px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <LiveDot /> {mock ? "Dados fictícios" : d.livemode ? "Ao vivo" : "Modo teste"}
          </span>
          {s.topCountry && (
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto rounded-xl border border-border bg-background/70 backdrop-blur px-3.5 py-2.5 flex items-center gap-3">
              <span className="text-2xl leading-none">{flag(s.topCountry.key)}</span>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Top país</p>
                <p className="text-sm font-medium truncate">{countryName(s.topCountry.key)} · <span className="tabular-nums text-primary">{money(s.topCountry.revenue, cur)}</span></p>
              </div>
            </div>
          )}
          {s.orders === 0 && (
            <p className="absolute bottom-5 inset-x-5 text-center text-xs text-muted-foreground">Nenhuma venda nos últimos {days} dias.</p>
          )}
        </GlobeStage>

        <div className="p-6 sm:p-8 space-y-6 min-w-0">
          <header className="flex flex-wrap items-center gap-3">
            <p className="flex-1 min-w-0 text-xs text-muted-foreground truncate">{d.accountName ? `Stripe · ${d.accountName}` : "Stripe conectada"}</p>
            <div className="flex gap-1 p-1 rounded-full bg-muted/40 border border-border" role="group" aria-label="Período">
              {SALES_PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setDays(p)}
                  aria-pressed={days === p}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${days === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {p}d
                </button>
              ))}
            </div>
          </header>

          <div>
            <p className="text-xs text-muted-foreground">Faturamento · últimos {days} dias</p>
            <p className="mt-1 text-4xl sm:text-5xl font-semibold tracking-tight tabular-nums text-gradient-primary truncate" title={money(s.revenue, cur)}>
              {money(s.revenue, cur)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {stats.map((st) => {
              const Icon = st.icon;
              return (
                <div key={st.label} className="rounded-xl border border-border bg-muted/20 p-3.5 min-w-0">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[11px] truncate">{st.label}</span>
                  </div>
                  <div className="mt-1.5 text-lg font-semibold tabular-nums tracking-tight truncate" title={st.value}>{st.value}</div>
                </div>
              );
            })}
          </div>

          <Highlight
            icon={Trophy}
            label="Campanha que mais vendeu"
            value={s.topCampaign?.key ?? "—"}
            hint={s.topCampaign ? `${money(s.topCampaign.revenue, cur)} · ${s.topCampaign.orders} vendas` : "Nenhuma venda com utm_campaign"}
          />

          <div className="grid sm:grid-cols-2 gap-5">
            <RankList title="Países" rows={s.countries.slice(0, 5)} total={s.revenue} cur={cur} label={(k) => `${flag(k)} ${countryName(k)}`} />
            <RankList title="Campanhas" rows={s.campaigns.slice(0, 5)} total={s.revenue} cur={cur} label={(k) => k} />
          </div>

          <div className="space-y-1 text-[11px] text-muted-foreground">
            {s.withoutCampaign > 0 && <p>{s.withoutCampaign} {s.withoutCampaign === 1 ? "venda sem" : "vendas sem"} utm_campaign.</p>}
            {s.otherCurrencies.length > 0 && (
              <p>Também em outras moedas: {s.otherCurrencies.map((c) => `${money(c.revenue, c.key)} (${c.orders})`).join(" · ")}</p>
            )}
            {d.truncated && <p>Muitas vendas no período: alguns dias podem aparecer incompletos.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

function Highlight({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 min-w-0 flex items-center gap-3">
      <span className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="text-sm font-medium truncate" title={value}>{value}</div>
        <div className="text-[11px] text-muted-foreground truncate">{hint}</div>
      </div>
    </div>
  );
}

function RankList({ title, rows, total, cur, label }: { title: string; rows: { key: string; revenue: number; orders: number }[]; total: number; cur: string | null; label: (k: string) => string }) {
  if (!rows.length) return null;
  return (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground mb-2">{title}</h3>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.key} className="min-w-0">
            <div className="flex items-center gap-2 text-xs">
              <span className="flex-1 truncate" title={r.key}>{label(r.key)}</span>
              <span className="tabular-nums text-muted-foreground shrink-0">{money(r.revenue, cur)}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary shadow-[var(--shadow-glow)]" style={{ width: `${total ? Math.max(2, (r.revenue / total) * 100) : 0}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
