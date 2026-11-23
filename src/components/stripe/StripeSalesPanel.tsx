import { lazy, Suspense, useMemo, useState } from "react";
import { ClientOnly, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, ArrowRight, Globe2, Megaphone, ShoppingBag, Wallet, Receipt } from "lucide-react";
import { getStripeSales } from "@/lib/stripe-connect.functions";
import { SALES_PERIODS, toMajor, type SalesPeriod } from "@/lib/stripe-sales";
import { COUNTRY_CENTROIDS } from "@/lib/country-centroids";
import type { GlobePoint } from "./SalesGlobe";

const SalesGlobe = lazy(() => import("./SalesGlobe"));

function money(minor: number, currency: string | null) {
  if (!currency) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 2 }).format(toMajor(minor, currency));
}

let regionNames: Intl.DisplayNames | null = null;
function countryName(code: string) {
  try {
    regionNames ??= new Intl.DisplayNames(["pt-BR"], { type: "region" });
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

function flag(code: string) {
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

const GlobeFallback = () => <div className="w-full aspect-square max-w-[460px] mx-auto rounded-full bg-muted/40 animate-pulse" />;

export function StripeSalesPanel() {
  const [days, setDays] = useState<SalesPeriod>(30);
  const fetchSales = useServerFn(getStripeSales);
  const q = useQuery({
    queryKey: ["stripe-sales", days],
    queryFn: () => fetchSales({ data: { days } }),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const d = q.data;
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

  if (q.isLoading) return <section className="rounded-xl border border-border bg-card h-[420px] animate-pulse" />;

  if (q.isError) {
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
      <section className="rounded-xl border border-dashed border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Globe2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-medium">Veja suas vendas no mapa</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Conecte sua Stripe para ver faturamento, países e campanhas que mais vendem.</p>
        </div>
        <Link to="/settings" search={{ tab: "integrations" } as never} className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
          Conectar Stripe <ArrowRight className="h-3 w-3" />
        </Link>
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
    { label: "Faturamento", value: money(s.revenue, cur), icon: Wallet },
    { label: "Vendas", value: s.orders.toLocaleString("pt-BR"), icon: ShoppingBag },
    { label: "Ticket médio", value: money(s.avgTicket, cur), icon: Receipt },
  ];

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-border">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-medium flex items-center gap-2">
            Suas vendas
            {!d.livemode && <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">teste</span>}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{d.accountName ? `Stripe · ${d.accountName}` : "Stripe conectada"}</p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-muted/40" role="group" aria-label="Período">
          {SALES_PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setDays(p)}
              aria-pressed={days === p}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${days === p ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {p} dias
            </button>
          ))}
        </div>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="relative p-5 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-border">
          <ClientOnly fallback={<GlobeFallback />}>
            <Suspense fallback={<GlobeFallback />}>
              <SalesGlobe points={points} focus={focus} />
            </Suspense>
          </ClientOnly>
          {s.orders === 0 && (
            <p className="absolute bottom-5 inset-x-5 text-center text-xs text-muted-foreground">Nenhuma venda nos últimos {days} dias.</p>
          )}
        </div>

        <div className="p-5 space-y-5 min-w-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px rounded-lg overflow-hidden border border-border bg-border">
            {stats.map((st, i) => {
              const Icon = st.icon;
              return (
                <div key={st.label} className={`bg-card p-3 min-w-0 ${i === 0 ? "col-span-2 sm:col-span-1" : ""}`}>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-[11px] truncate">{st.label}</span>
                  </div>
                  <div className="mt-1.5 text-base sm:text-lg font-semibold tabular-nums tracking-tight truncate" title={st.value}>{st.value}</div>
                </div>
              );
            })}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Highlight
              icon={Globe2}
              label="País que mais vendeu"
              value={s.topCountry ? `${flag(s.topCountry.key)} ${countryName(s.topCountry.key)}` : "—"}
              hint={s.topCountry ? `${money(s.topCountry.revenue, cur)} · ${s.topCountry.orders} vendas` : "Sem país nas vendas"}
            />
            <Highlight
              icon={Megaphone}
              label="Campanha que mais vendeu"
              value={s.topCampaign?.key ?? "—"}
              hint={s.topCampaign ? `${money(s.topCampaign.revenue, cur)} · ${s.topCampaign.orders} vendas` : "Nenhuma venda com utm_campaign"}
            />
          </div>

          <RankList title="Países" rows={s.countries.slice(0, 5)} total={s.revenue} cur={cur} label={(k) => `${flag(k)} ${countryName(k)}`} />
          <RankList title="Campanhas" rows={s.campaigns.slice(0, 5)} total={s.revenue} cur={cur} label={(k) => k} />

          <div className="space-y-1 text-[11px] text-muted-foreground">
            {s.withoutCampaign > 0 && <p>{s.withoutCampaign} {s.withoutCampaign === 1 ? "venda sem" : "vendas sem"} utm_campaign.</p>}
            {s.otherCurrencies.length > 0 && (
              <p>Também em outras moedas: {s.otherCurrencies.map((c) => `${money(c.revenue, c.key)} (${c.orders})`).join(" · ")}</p>
            )}
            {d.truncated && <p>Muitas vendas no período: mostrando as 1.000 mais recentes.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

function Highlight({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-border p-3 min-w-0">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="text-[11px]">{label}</span>
      </div>
      <div className="mt-1.5 text-sm font-medium truncate" title={value}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{hint}</div>
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
            <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${total ? Math.max(2, (r.revenue / total) * 100) : 0}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
