import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CalendarDays, CalendarRange, Globe2, History, Megaphone, Receipt, ShoppingBag, Trophy, Wallet } from "lucide-react";
import { getStripeSalesHistory } from "@/lib/stripe-connect.functions";
import { toMajor, type DayPoint, type Ranked, type Sale } from "@/lib/stripe-sales";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { countryName, flag, money } from "./format";

type Preset = "today" | "7" | "30" | "90" | "month" | "custom";
const PRESETS: { id: Exclude<Preset, "custom">; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "7", label: "7d" },
  { id: "30", label: "30d" },
  { id: "90", label: "90d" },
  { id: "month", label: "Este mês" },
];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

function presetRange(p: Exclude<Preset, "custom">): { from: Date; to: Date } {
  const now = new Date();
  const to = endOfDay(now);
  if (p === "today") return { from: startOfDay(now), to };
  if (p === "month") return { from: new Date(now.getFullYear(), now.getMonth(), 1), to };
  const from = startOfDay(now);
  from.setDate(from.getDate() - (Number(p) - 1));
  return { from, to };
}

type History = {
  currency: string | null;
  revenue: number;
  orders: number;
  avgTicket: number;
  countries: Ranked[];
  campaigns: Ranked[];
  topCampaign: Ranked | null;
  withoutCampaign: number;
  series: DayPoint[];
  bestDay: DayPoint | null;
  recent: Sale[];
  truncated: boolean;
};

// Decorative data shown before the Stripe is connected (labelled "Prévia").
function previewHistory(): History {
  const series: DayPoint[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(2026, 0, 1 + i);
    const revenue = Math.round((420 + Math.sin(i / 3) * 180 + i * 22 + ((i * 37) % 90)) * 100);
    return { date: format(d, "yyyy-MM-dd"), revenue, orders: Math.max(1, Math.round(revenue / 9700)) };
  });
  const revenue = series.reduce((s, p) => s + p.revenue, 0);
  const orders = series.reduce((s, p) => s + p.orders, 0);
  const share = (k: string, f: number, o: number): Ranked => ({ key: k, revenue: Math.round(revenue * f), orders: Math.round(orders * o) });
  return {
    currency: "brl",
    revenue,
    orders,
    avgTicket: Math.round(revenue / orders),
    countries: [share("BR", 0.62, 0.6), share("PT", 0.14, 0.15), share("US", 0.11, 0.1), share("MX", 0.07, 0.08), share("AR", 0.06, 0.07)],
    campaigns: [share("black-friday-cbo", 0.38, 0.36), share("remarketing-7d", 0.24, 0.25), share("lookalike-1pct", 0.16, 0.17), share("advantage-plus", 0.12, 0.12), share("teste-criativo-03", 0.06, 0.06)],
    topCampaign: share("black-friday-cbo", 0.38, 0.36),
    withoutCampaign: 0,
    series,
    bestDay: series.reduce((b, p) => (p.revenue > b.revenue ? p : b), series[0]!),
    recent: [],
    truncated: false,
  };
}

export function StripeSalesHistory() {
  const [preset, setPreset] = useState<Preset>("30");
  const [custom, setCustom] = useState<DateRange | undefined>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const fetchHistory = useServerFn(getStripeSalesHistory);

  const range = useMemo(() => {
    if (preset === "custom" && custom?.from) return { from: startOfDay(custom.from), to: endOfDay(custom.to ?? custom.from) };
    return presetRange(preset === "custom" ? "30" : preset);
  }, [preset, custom]);

  const fromUnix = Math.floor(range.from.getTime() / 1000);
  const toUnix = Math.floor(range.to.getTime() / 1000);

  const q = useQuery({
    queryKey: ["stripe-sales-history", fromUnix, toUnix],
    queryFn: () => fetchHistory({ data: { from: fromUnix, to: toUnix, offset: -new Date().getTimezoneOffset() } }),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const d = q.data;
  const preview = !q.isLoading && !q.isError && (!d || !d.connected);
  const invalidKey = d && d.connected && "invalidKey" in d;

  const h: History | null = useMemo(() => {
    if (preview) return previewHistory();
    if (!d || !d.connected || "invalidKey" in d) return null;
    const { summary, series, bestDay, recent, truncated } = d;
    return { ...summary, series, bestDay, recent, truncated };
  }, [d, preview]);

  if (invalidKey) return null; // the globe panel above already explains how to reconnect

  const rangeLabel =
    format(range.from, "dd MMM", { locale: ptBR }) +
    (format(range.from, "yyyy-MM-dd") === format(range.to, "yyyy-MM-dd") ? "" : ` – ${format(range.to, "dd MMM yyyy", { locale: ptBR })}`);

  return (
    <section className="dash-card p-5 sm:p-6 space-y-6">
      <header className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <span className="dash-icon-tile h-9 w-9 rounded-xl flex items-center justify-center shrink-0">
            <History className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-medium flex items-center gap-2">
              Histórico de vendas
              {preview && (
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Prévia</span>
              )}
            </h2>
            <p suppressHydrationWarning className="text-xs text-muted-foreground mt-0.5">
              {preview ? "Exemplo do que aparece com sua Stripe conectada" : rangeLabel}
            </p>
          </div>
        </div>

        <div className={`flex flex-wrap items-center gap-2 ${preview ? "pointer-events-none opacity-50" : ""}`}>
          <div className="flex gap-1 p-1 rounded-full bg-muted/40 border border-border" role="group" aria-label="Período">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                aria-pressed={preset === p.id}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${preset === p.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button
                aria-pressed={preset === "custom"}
                className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${preset === "custom" ? "border-primary/50 text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                <CalendarRange className="h-3.5 w-3.5" />
                {preset === "custom" && custom?.from ? rangeLabel : "Personalizado"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                locale={ptBR}
                numberOfMonths={2}
                selected={custom}
                defaultMonth={custom?.from ?? new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)}
                disabled={{ after: new Date() }}
                onSelect={(r) => {
                  setCustom(r);
                  if (r?.from) setPreset("custom");
                  if (r?.from && r?.to) setPickerOpen(false);
                }}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {q.isLoading ? (
        <div className="space-y-4" aria-busy="true">
          <p className="text-xs text-muted-foreground">Buscando vendas na Stripe…</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />)}
          </div>
          <div className="h-56 rounded-xl bg-muted/50 animate-pulse" />
        </div>
      ) : q.isError ? (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{(q.error as Error).message || "Não foi possível carregar o histórico."}</span>
          <button onClick={() => q.refetch()} className="text-xs text-foreground hover:underline">Tentar de novo</button>
        </div>
      ) : h ? (
        <div className={`space-y-6 ${preview ? "select-none" : ""}`}>
          <Kpis h={h} />
          <RevenueChart series={h.series} currency={h.currency} />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <CampaignBlock h={h} />
            <TopList
              icon={Globe2}
              title="Top 5 países"
              rows={h.countries.slice(0, 5)}
              total={h.revenue}
              cur={h.currency}
              label={(k) => `${flag(k)} ${countryName(k)}`}
              empty="Nenhuma venda com país identificado."
            />
            <RecentSales sales={h.recent} preview={preview} className="md:col-span-2 xl:col-span-1" />
          </div>
          {(h.withoutCampaign > 0 || h.truncated) && (
            <div className="space-y-1 text-[11px] text-muted-foreground">
              {h.withoutCampaign > 0 && <p>{h.withoutCampaign} {h.withoutCampaign === 1 ? "venda sem" : "vendas sem"} utm_campaign no período.</p>}
              {h.truncated && <p>Muitas vendas no período: alguns dias podem aparecer incompletos. Escolha um período menor para ver tudo.</p>}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function Kpis({ h }: { h: History }) {
  const items = [
    { label: "Faturamento", value: money(h.revenue, h.currency), icon: Wallet, accent: true },
    { label: "Vendas", value: h.orders.toLocaleString("pt-BR"), icon: ShoppingBag },
    { label: "Ticket médio", value: money(h.avgTicket, h.currency), icon: Receipt },
    {
      label: "Melhor dia",
      value: h.bestDay ? money(h.bestDay.revenue, h.currency) : "—",
      hint: h.bestDay ? format(new Date(`${h.bestDay.date}T12:00:00`), "dd 'de' MMM", { locale: ptBR }) : "sem vendas",
      icon: CalendarDays,
    },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div key={it.label} className={`rounded-xl border p-3.5 min-w-0 ${it.accent ? "border-primary/25 bg-primary/5" : "border-border bg-muted/20"}`}>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Icon className={`h-3.5 w-3.5 shrink-0 ${it.accent ? "text-primary" : ""}`} />
              <span className="text-[11px] truncate">{it.label}</span>
            </div>
            <div className={`mt-1.5 text-lg sm:text-xl font-semibold tabular-nums tracking-tight truncate ${it.accent ? "text-gradient-primary" : ""}`} title={it.value}>
              {it.value}
            </div>
            {"hint" in it && it.hint && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{it.hint}</div>}
          </div>
        );
      })}
    </div>
  );
}

function RevenueChart({ series, currency }: { series: DayPoint[]; currency: string | null }) {
  const data = series.map((p) => ({ ...p, major: currency ? toMajor(p.revenue, currency) : 0 }));
  // A line needs at least a few days; 1–3 days read better as bars.
  const few = data.length <= 3;
  const compact = (v: number) =>
    new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v);
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-3 sm:p-4">
      <p className="text-xs text-muted-foreground mb-3">Faturamento por dia</p>
      <div className="h-56 text-primary">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="salesHistoryFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: "var(--primary)", stopOpacity: 0.35 }} />
                <stop offset="100%" style={{ stopColor: "var(--primary)", stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" strokeOpacity={0.5} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              fontSize={10}
              minTickGap={24}
              tick={{ fill: "var(--muted-foreground)" }}
              tickFormatter={(v: string) => format(new Date(`${v}T12:00:00`), "dd/MM")}
            />
            <YAxis tickLine={false} axisLine={false} fontSize={10} width={48} tick={{ fill: "var(--muted-foreground)" }} tickFormatter={compact} />
            <Tooltip
              cursor={few ? { fill: "var(--muted)", fillOpacity: 0.3 } : { stroke: "var(--border)" }}
              content={({ active, payload }) => {
                const p = active ? (payload?.[0]?.payload as (DayPoint & { major: number }) | undefined) : undefined;
                if (!p) return null;
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="text-muted-foreground">{format(new Date(`${p.date}T12:00:00`), "EEE, dd 'de' MMM", { locale: ptBR })}</p>
                    <p className="font-medium tabular-nums mt-0.5">{money(p.revenue, currency)}</p>
                    <p className="text-muted-foreground">{p.orders} {p.orders === 1 ? "venda" : "vendas"}</p>
                  </div>
                );
              }}
            />
            {few ? (
              <Bar dataKey="major" fill="currentColor" fillOpacity={0.85} radius={[6, 6, 0, 0]} maxBarSize={56} />
            ) : (
              <Area type="monotone" dataKey="major" stroke="currentColor" strokeWidth={2} fill="url(#salesHistoryFill)" />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CampaignBlock({ h }: { h: History }) {
  return (
    <div className="space-y-4 min-w-0">
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 flex items-center gap-3 min-w-0">
        <span className="h-9 w-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Trophy className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground">Campanha que mais vendeu</div>
          <div className="text-sm font-medium truncate" title={h.topCampaign?.key}>{h.topCampaign?.key ?? "—"}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {h.topCampaign ? `${money(h.topCampaign.revenue, h.currency)} · ${h.topCampaign.orders} ${h.topCampaign.orders === 1 ? "venda" : "vendas"}` : "Nenhuma venda com utm_campaign"}
          </div>
        </div>
      </div>
      <TopList icon={Megaphone} title="Top 5 campanhas" rows={h.campaigns.slice(0, 5)} total={h.revenue} cur={h.currency} label={(k) => k} empty="Nenhuma campanha no período." />
    </div>
  );
}

function TopList({ icon: Icon, title, rows, total, cur, label, empty }: { icon: any; title: string; rows: Ranked[]; total: number; cur: string | null; label: (k: string) => string; empty: string }) {
  return (
    <div className="min-w-0">
      <h3 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ol className="space-y-2.5">
          {rows.map((r, i) => (
            <li key={r.key} className="min-w-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-4 text-muted-foreground tabular-nums">{i + 1}</span>
                <span className="flex-1 truncate" title={r.key}>{label(r.key)}</span>
                <span className="tabular-nums shrink-0">{money(r.revenue, cur)}</span>
              </div>
              <div className="mt-1 ml-6 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${total ? Math.max(2, (r.revenue / total) * 100) : 0}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums w-14 text-right">
                  {r.orders} {r.orders === 1 ? "venda" : "vendas"}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function RecentSales({ sales, preview, className = "" }: { sales: Sale[]; preview: boolean; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <h3 className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
        <ShoppingBag className="h-3.5 w-3.5" /> Últimas vendas
      </h3>
      {preview ? (
        <p className="text-xs text-muted-foreground">Suas vendas mais recentes aparecem aqui, com data, valor, país e campanha.</p>
      ) : sales.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma venda no período.</p>
      ) : (
        <ul className="divide-y divide-border">
          {sales.map((s, i) => (
            <li key={`${s.created}-${i}`} className="py-2 first:pt-0 flex items-center gap-3 text-xs min-w-0">
              <span className="text-base leading-none w-5 text-center shrink-0" title={s.country ? countryName(s.country) : "País desconhecido"}>
                {s.country ? flag(s.country) : "·"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="truncate">{s.campaign ?? <span className="text-muted-foreground">sem campanha</span>}</div>
                <div className="text-[10px] text-muted-foreground">{format(new Date(s.created * 1000), "dd/MM · HH:mm")}</div>
              </div>
              <span className="tabular-nums font-medium shrink-0">{money(s.amount, s.currency)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
