import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseStepList } from "@/lib/funnel-tracker/steps-parse";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowDown, ArrowUp, Filter, GitBranch, Info, Lightbulb, Plus, RefreshCw, Settings2, Trash2, Copy, Check, Pencil, Bot } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { money, num } from "@/lib/funnel-tracker/utils-format";
import { cn } from "@/lib/utils";
import {
  getFunnelReport,
  getFunnelLive,
  getFunnelTrafficQuality,
  getFunnelSteps,
  saveFunnelSteps,
  listRecentFunnelEvents,
  listFunnels,
  createFunnel,
  renameFunnel,
  deleteFunnel,
} from "@/lib/funnel-tracker.functions";
import { FunnelChart } from "@/components/funnel-tracker/funnel-chart";
import { FunnelCanvas } from "@/components/funnel-tracker/funnel-canvas";
import { HourlyAccessChart } from "@/components/funnel-tracker/hourly-access-chart";
import type { FunnelReport } from "@/lib/funnel-tracker/types";
import { exportCsv } from "@/lib/funnel-tracker/csv";
import { supabase } from "@/integrations/supabase/client";
import type { OfferScope } from "@/lib/funnel-tracker/offer-scope";

export const Route = createFileRoute("/_app/funnel-tracker")({
  head: () => ({
    meta: [
      { title: "Funnel Tracker — Nebula Members" },
      { name: "description", content: "Funil etapa por etapa, gargalos, conversão por criativo e por origem." },
      { property: "og:title", content: "Funnel Tracker — Nebula Members" },
      { property: "og:description", content: "Funil etapa por etapa, gargalos, conversão por criativo e por origem." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FunnelsPage,
});

type Period = "today" | "yesterday" | "7d" | "30d" | "custom";

const FUNNEL_PUBLIC_ORIGIN = "https://nebulamembers.online";

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

function ranges(period: Period, customFrom: string, customTo: string) {
  const now = new Date();
  if (period === "custom" && customFrom && customTo) {
    const from = new Date(`${customFrom}T00:00:00`);
    const to = new Date(`${customTo}T23:59:59.999`);
    return { from: from.toISOString(), to: to.toISOString(), compare: null as null | { from: string; to: string } };
  }
  if (period === "today") {
    const from = startOfDay(now);
    // comparação justa: ontem até a MESMA hora do dia
    const cFrom = new Date(from); cFrom.setDate(cFrom.getDate() - 1);
    const cTo = new Date(now); cTo.setDate(cTo.getDate() - 1);
    return { from: from.toISOString(), to: now.toISOString(), compare: { from: cFrom.toISOString(), to: cTo.toISOString() } };
  }
  if (period === "yesterday") {
    const from = startOfDay(now); from.setDate(from.getDate() - 1);
    const to = new Date(from.getTime() + 86_399_999);
    const cFrom = new Date(from); cFrom.setDate(cFrom.getDate() - 1);
    const cTo = new Date(cFrom.getTime() + 86_399_999);
    return { from: from.toISOString(), to: to.toISOString(), compare: { from: cFrom.toISOString(), to: cTo.toISOString() } };
  }
  const days = period === "7d" ? 7 : 30;
  const from = startOfDay(now); from.setDate(from.getDate() - (days - 1));
  const cFrom = new Date(from); cFrom.setDate(cFrom.getDate() - days);
  const cTo = new Date(from.getTime() - 1);
  return { from: from.toISOString(), to: now.toISOString(), compare: { from: cFrom.toISOString(), to: cTo.toISOString() } };
}

function Delta({ current, previous, suffix = "" }: { current: number; previous: number | undefined; suffix?: string }) {
  if (previous === undefined) return null;
  const diff = current - previous;
  const rel = previous > 0 ? (diff / previous) * 100 : null;
  const up = diff >= 0;
  return (
    <span className={cn("text-xs font-medium", up ? "text-emerald-400" : "text-destructive")}>
      {up ? "▲" : "▼"} {rel === null ? `${num(Math.abs(diff), 0)}${suffix}` : `${num(Math.abs(rel), 1)}%`}
    </span>
  );
}

function FunnelsPage() {
  const { user } = useAuth();
  const workspaceId = user?.id ?? "";
  const [period, setPeriod] = useState<Period>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [minSales, setMinSales] = useState(false);
  const [view, setView] = useState<"canvas" | "chart" | "bars" | "hourly">("canvas");
  const [funnelId, setFunnelId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("funnel");
  const [source, setSource] = useState<string>("all");
  const [offer, setOffer] = useState<OfferScope>("all");
  const checkoutActive = activeTab === "checkout";

  const funnelsFn = useServerFn(listFunnels);
  const { data: funnels } = useQuery({
    queryKey: ["funnels", workspaceId],
    queryFn: () => funnelsFn({ data: { workspaceId } }),
    enabled: !!workspaceId,
  });

  useEffect(() => {
    if (!funnels?.length) return;
    const stored = localStorage.getItem(`trkly:funnel:${workspaceId}`);
    const valid = funnels.some((f) => f.id === funnelId);
    if (valid) return;
    const pick = funnels.find((f) => f.id === stored)?.id ?? funnels[0]!.id;
    setFunnelId(pick);
  }, [funnels, funnelId, workspaceId]);

  useEffect(() => {
    if (funnelId) localStorage.setItem(`trkly:funnel:${workspaceId}`, funnelId);
  }, [funnelId, workspaceId]);

  const r = useMemo(() => ranges(period, customFrom, customTo), [period, customFrom, customTo]);

  const reportFn = useServerFn(getFunnelReport);
  const { data, isFetching, refetch } = useQuery<FunnelReport>({
    queryKey: ["funnel-report", workspaceId, funnelId, period, customFrom, customTo, source, offer],
    queryFn: () => {
      const currentRange = ranges(period, customFrom, customTo);
      return reportFn({
        data: {
          workspaceId,
          funnelId,
          from: currentRange.from,
          to: currentRange.to,
          compareFrom: currentRange.compare?.from ?? null,
          compareTo: currentRange.compare?.to ?? null,
          source: source === "all" ? null : source,
          offer,
        },
      });
    },
    refetchInterval: 3_000,
    refetchIntervalInBackground: false,
    enabled: !!funnelId && !!workspaceId && !checkoutActive,
  });

  const trafficFn = useServerFn(getFunnelTrafficQuality);
  const { data: traffic } = useQuery({
    queryKey: ["funnel-traffic", funnelId, period, customFrom, customTo, offer, source],
    queryFn: () => {
      const cr = ranges(period, customFrom, customTo);
      return trafficFn({ data: { funnelId, from: cr.from, to: cr.to, offer, source: source === "all" ? null : source } });
    },
    refetchInterval: 3_000,
    refetchIntervalInBackground: false,
    enabled: !!funnelId && !!workspaceId && !checkoutActive,
  });

  const liveFn = useServerFn(getFunnelLive);
  const { data: live } = useQuery({
    queryKey: ["funnel-live", funnelId, offer, source],
    queryFn: () => liveFn({ data: { funnelId, windowMinutes: 5, offer, source: source === "all" ? null : source } }),
    refetchInterval: 3_000,
    refetchIntervalInBackground: false,
    enabled: !!funnelId && !!workspaceId && !checkoutActive,
  });

  useEffect(() => {
    if (!funnelId || checkoutActive) return;
    const channel = supabase
      .channel(`funnel-live-${workspaceId}-${funnelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tracker_funnel_events",
          filter: funnelId ? `funnel_id=eq.${funnelId}` : `workspace_id=eq.${workspaceId}`,
        },
        () => {
          void refetch();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [workspaceId, funnelId, refetch, checkoutActive]);

  const currency = data?.currency ?? "BRL";
  const fmt = (n: number) => money(n, currency);
  const s = data?.summary;
  const cmp = data?.compare ?? undefined;

  const maxSessions = Math.max(1, data?.steps?.[0]?.sessions ?? 1);

  const creatives = useMemo(() => {
    const list = data?.byCreative ?? [];
    return minSales ? list.filter((c) => c.sales >= 5) : list;
  }, [data, minSales]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">
              <GitBranch className="h-5 w-5 text-primary" /> Funnel Tracker
              <span className="rounded-md border border-cyan-500/30 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                Beta
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">Cada passagem do funil, o gargalo e quem paga — por criativo e origem.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              title="Sessões com atividade nos últimos 5 minutos"
              className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              {live?.total ?? 0} ao vivo
            </span>
            <FunnelPicker
              workspaceId={workspaceId}
              funnels={funnels ?? []}
              funnelId={funnelId}
              onChange={setFunnelId}
            />
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="7d">7 dias</SelectItem>
                <SelectItem value="30d">30 dias</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as origens</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="fb">Facebook / Meta</SelectItem>
                <SelectItem value="ig">Instagram</SelectItem>
              </SelectContent>
            </Select>
            <Select value={offer} onValueChange={(value) => setOffer(value as OfferScope)}>
              <SelectTrigger className="w-[150px]" aria-label="Oferta do funil"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ofertas</SelectItem>
                <SelectItem value="SPY">SPY + UncoverAI</SelectItem>
                <SelectItem value="Outras">SPOT2 e demais</SelectItem>
              </SelectContent>
            </Select>
            {period === "custom" && (
              <>
                <Input type="date" className="w-[150px]" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                <Input type="date" className="w-[150px]" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => funnelId && refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
            <StepsDialog workspaceId={workspaceId} funnelId={funnelId} onSaved={() => funnelId && refetch()} />
          </div>
        </div>

        {period === "today" && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" /> Comparando com ontem até a mesma hora — dia parcial vs dia fechado engana.
          </p>
        )}

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi label="Chegou" value={num(s?.arrived ?? 0, 0)} delta={<Delta current={s?.arrived ?? 0} previous={cmp?.arrived} />} />
          <Kpi label="Pagou" value={num(s?.paid ?? 0, 0)} delta={<Delta current={s?.paid ?? 0} previous={cmp?.paid} />} />
          <Kpi label="Vendas recusadas" value={num(s?.refused ?? 0, 0)} delta={<Delta current={s?.refused ?? 0} previous={cmp?.refused} />} />
          <Kpi label="Conversão geral" value={`${num(s?.convOverall ?? 0, 2)}%`} delta={<Delta current={s?.convOverall ?? 0} previous={cmp?.convOverall} />} />
          <Kpi label="Gerado → pago" value={`${num(s?.payRate ?? 0, 2)}%`} delta={<Delta current={s?.payRate ?? 0} previous={cmp?.payRate} />} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="funnel">Funil</TabsTrigger>
            <TabsTrigger value="creatives">Criativos</TabsTrigger>
            <TabsTrigger value="sources">Origem</TabsTrigger>
            <TabsTrigger value="setup">Instrumentação</TabsTrigger>
          </TabsList>

          <TabsContent value="funnel" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">Etapa por etapa</CardTitle>
                  <TrafficQualityBadge traffic={traffic} />
                </div>
                <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
                  <Button variant={view === "canvas" ? "secondary" : "ghost"} size="sm" onClick={() => setView("canvas")}>
                    Canvas
                  </Button>
                  <Button variant={view === "chart" ? "secondary" : "ghost"} size="sm" onClick={() => setView("chart")}>
                    Gráfico
                  </Button>
                  <Button variant={view === "bars" ? "secondary" : "ghost"} size="sm" onClick={() => setView("bars")}>
                    Barras
                  </Button>
                  <Button variant={view === "hourly" ? "secondary" : "ghost"} size="sm" onClick={() => setView("hourly")}>
                    Por hora
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {view === "hourly" ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">Sessões únicas na hora da primeira entrada.</p>
                      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-chart-1" /> Humanos</span>
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-chart-3" /> Robôs</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <HourlyAccessChart points={traffic?.hourly ?? []} />
                    </div>
                  </div>
                ) : (
                  <>
                {(data?.steps ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma etapa configurada.</p>
                )}
                {view === "canvas" && <FunnelCanvas steps={data?.steps ?? []} workspaceId={workspaceId} funnelId={funnelId} live={live?.byStep} />}
                {view === "chart" && <FunnelChart steps={data?.steps ?? []} />}
                {view === "bars" && (data?.steps ?? []).map((step) => (
                  <div key={step.key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">{step.label}</span>
                        {step.bottleneck && <Badge variant="destructive" className="shrink-0 text-[10px]">gargalo</Badge>}
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                        <span className="text-foreground">{num(step.sessions, 0)}</span>
                        <span>{step.retention === null ? "—" : `${num(step.retention, 1)}%`}</span>
                        <span className="hidden sm:inline">-{num(step.dropped, 0)}</span>
                      </div>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all", step.bottleneck ? "bg-destructive" : "bg-primary")}
                        style={{ width: `${Math.max(1, (step.sessions / maxSessions) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/30">
              <CardContent className="space-y-2 py-4 text-sm">
                <div className="flex items-center gap-2 font-medium"><Lightbulb className="h-4 w-4 text-primary" /> Regras de decisão</div>
                <p className="text-muted-foreground">
                  • Antes de culpar o funil, veja <strong>gerado → pago ({num(s?.payRate ?? 0, 1)}%)</strong>: se essa taxa caiu e as
                  etapas estão normais, o problema é o gateway, não o funil.
                </p>
                <p className="text-muted-foreground">• Só escale ou mate criativo com <strong>5+ vendas</strong> — abaixo disso é ruído.</p>
                <p className="text-muted-foreground">
                  • Faturamento no período: <strong>{fmt(s?.revenue ?? 0)}</strong> em {num(s?.paid ?? 0, 0)} pagamentos.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="creatives" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base">Por criativo (utm_content)</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant={minSales ? "default" : "outline"} size="sm" onClick={() => setMinSales((v) => !v)}>
                    <Filter className="mr-1.5 h-3.5 w-3.5" /> 5+ vendas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportCsv("criativos-funil", creatives, [
                        { header: "Criativo", value: (c) => c.label },
                        { header: "ID", value: (c) => c.sublabel ?? "" },
                        { header: "utm_campaign", value: (c) => c.campaign ?? "" },
                        { header: "utm_content", value: (c) => c.content ?? "" },
                        { header: "Visitas", value: (c) => c.sessions },
                        { header: "Vendas", value: (c) => c.sales },
                        { header: "Conversão %", value: (c) => c.conv.toFixed(2) },
                      ])
                    }
                  >
                    CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <BreakdownTable rows={creatives} firstLabel="Criativo" showCampaign showContent />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources" className="mt-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Por campanha / origem</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <BreakdownTable rows={data?.bySource ?? []} firstLabel="Campanha" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="setup" className="mt-4">
            <SetupTab workspaceId={workspaceId} funnelId={funnelId} />
          </TabsContent>

        </Tabs>
      </div>
    </>
  );
}

function FunnelPicker({
  workspaceId,
  funnels,
  funnelId,
  onChange,
}: {
  workspaceId: string;
  funnels: { id: string; name: string }[];
  funnelId: string;
  onChange: (id: string) => void;
}) {
  const qc = useQueryClient();
  const createFn = useServerFn(createFunnel);
  const renameFn = useServerFn(renameFunnel);
  const deleteFn = useServerFn(deleteFunnel);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "rename">("create");
  const [name, setName] = useState("");
  const [copySteps, setCopySteps] = useState(true);

  const current = funnels.find((f) => f.id === funnelId);
  const reload = () => qc.invalidateQueries({ queryKey: ["funnels", workspaceId] });

  const create = useMutation({
    mutationFn: () =>
      createFn({ data: { workspaceId, name: name.trim(), copyStepsFromFunnelId: copySteps ? funnelId || null : null } }),
    onSuccess: async (f) => {
      toast.success("Funil criado");
      setOpen(false);
      setName("");
      await reload();
      onChange(f.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rename = useMutation({
    mutationFn: () => renameFn({ data: { funnelId, name: name.trim() } }),
    onSuccess: async () => { toast.success("Funil renomeado"); setOpen(false); await reload(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => deleteFn({ data: { funnelId } }),
    onSuccess: async () => {
      toast.success("Funil excluído");
      await reload();
      const next = funnels.find((f) => f.id !== funnelId);
      onChange(next?.id ?? "");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex items-center gap-1">
      <Select value={funnelId} onValueChange={onChange}>
        <SelectTrigger className="w-[190px]">
          <SelectValue placeholder="Selecione o funil" />
        </SelectTrigger>
        <SelectContent>
          {funnels.map((f) => (
            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          variant="outline"
          size="icon"
          title="Novo funil"
          onClick={() => { setMode("create"); setName(""); setOpen(true); }}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Renomear funil"
          disabled={!funnelId}
          onClick={() => { setMode("rename"); setName(current?.name ?? ""); setOpen(true); }}
        >
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Excluir funil"
          disabled={!funnelId || funnels.length < 2 || remove.isPending}
          onClick={() => {
            if (confirm(`Excluir "${current?.name}"? Os eventos desse funil serão removidos.`)) remove.mutate();
          }}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>

        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Novo funil" : "Renomear funil"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              placeholder="Ex.: Oferta Black — VSL"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {mode === "create" && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" checked={copySteps} onChange={(e) => setCopySteps(e.target.checked)} />
                Copiar as etapas do funil atual
              </label>
            )}
            <p className="text-xs text-muted-foreground">
              Cada funil tem etapas, script e métricas próprios — use um por oferta.
            </p>
          </div>
          <DialogFooter>
            <Button
              disabled={!name.trim() || create.isPending || rename.isPending}
              onClick={() => (mode === "create" ? create.mutate() : rename.mutate())}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value, delta }: { label: string; value: string; delta?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <div className="font-display text-2xl font-semibold">{value}</div>
          {delta}
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownTable({
  rows,
  firstLabel,
  showCampaign = false,
  showContent = false,
}: {
  rows: {
    key: string;
    label: string;
    sublabel: string | null;
    campaign?: string | null;
    content?: string | null;
    source?: string | null;
    sessions: number;
    sales: number;
    conv: number;
  }[];
  firstLabel: string;
  showCampaign?: boolean;
  showContent?: boolean;
}) {
  if (!rows.length) return <p className="py-6 text-sm text-muted-foreground">Sem dados no período.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{firstLabel}</TableHead>
          {showCampaign && <TableHead>Campanha (utm_campaign)</TableHead>}
          {showContent && <TableHead>Criativo (utm_content)</TableHead>}
          <TableHead className="text-right">Visitas</TableHead>
          <TableHead className="text-right">Vendas</TableHead>
          <TableHead className="text-right">Conversão</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell className="max-w-[260px]">
              <div className="truncate font-medium">{row.label}</div>
              {row.sublabel && <div className="truncate text-xs text-muted-foreground">{row.sublabel}</div>}
            </TableCell>
            {showCampaign && (
              <TableCell className="max-w-[260px]">
                <div className="truncate text-sm" title={row.campaign ?? ""}>{row.campaign || "(sem campanha)"}</div>
                {row.source && <div className="truncate text-xs text-muted-foreground">{row.source}</div>}
              </TableCell>
            )}
            {showContent && (
              <TableCell className="max-w-[280px]">
                <div className="truncate font-mono text-xs" title={row.content ?? ""}>{row.content || "(sem utm_content)"}</div>
              </TableCell>
            )}
            <TableCell className="text-right">{num(row.sessions, 0)}</TableCell>
            <TableCell className="text-right">
              <span className={cn(row.sales >= 5 ? "font-semibold text-foreground" : "text-muted-foreground")}>{num(row.sales, 0)}</span>
            </TableCell>
            <TableCell className="text-right">{num(row.conv, 2)}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function CopyBox({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-2">
      <code className="min-w-0 flex-1 break-all text-xs">{value}</code>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => { void navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

function PromptBox({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-md border border-border bg-muted/40">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs text-muted-foreground">Prompt gerado com as suas etapas</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { void navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        >
          {copied ? <Check className="mr-2 h-3.5 w-3.5 text-emerald-400" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
          {copied ? "Copiado" : "Copiar prompt"}
        </Button>
      </div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap p-3 text-xs">{value}</pre>
    </div>
  );
}

function SetupTab({ workspaceId, funnelId }: { workspaceId: string; funnelId: string }) {
  // Snippets precisam de uma origem pública: o preview exige login e não carrega no site do cliente.
  const origin = FUNNEL_PUBLIC_ORIGIN;
  const eventUrl = `${origin}/api/public/tracker-event/${workspaceId}`;
  const payUrl = `${origin}/api/public/funnel-payment/${workspaceId}`;
  const autoScript = `<script src="${origin}/funnel-tracker.js?w=${workspaceId}&f=${funnelId}" data-auto="true" defer></script>`;
  const manualScript = `<script src="${origin}/funnel-tracker.js?w=${workspaceId}&f=${funnelId}" data-step="chegou" defer></script>`;
  const listFn = useServerFn(listRecentFunnelEvents);
  const stepsFn = useServerFn(getFunnelSteps);
  const { data: recent, refetch: refetchRecent } = useQuery({
    queryKey: ["funnel-recent", funnelId],
    queryFn: () => listFn({ data: { funnelId } }),
    refetchInterval: 30_000,
    enabled: !!funnelId && !!workspaceId,
  });
  const { data: stepList } = useQuery({
    queryKey: ["funnel-steps-setup", funnelId],
    queryFn: () => stepsFn({ data: { funnelId } }),
    enabled: !!funnelId && !!workspaceId,
  });

  const steps = stepList?.length ? stepList : [{ key: "chegou", label: "Chegou", id: "", position: 1 }];
  const [stepKey, setStepKey] = useState<string>("");
  const active = steps.find((s) => s.key === stepKey) ?? steps[0];
  const k = active?.key ?? "chegou";

  const gen = {
    botao: `<button data-funnel-step="${k}">Seu botão</button>`,
    secao: `<section data-funnel-view="${k}"> ... </section>`,
    form: `<form data-funnel-submit="${k}"> ... </form>`,
    js: `trkFunnel.step('${k}');`,
    typebot: `${eventUrl}?f=${funnelId}&step=${k}&sessionId={{sessionId}}&utm_content={{utm_content}}&utm_campaign={{utm_campaign}}&utm_source={{utm_source}}`,
  };

  const stepLines = steps.map((s, i) => `${i + 1}. "${s.label}" -> chave: ${s.key}`).join("\n");
  const aiPrompt = `Implemente o rastreamento de funil nesta página/site.

1) Adicione este script uma única vez dentro da tag <head> de TODAS as páginas do funil:
${autoScript}

2) Marque as etapas abaixo, na ordem, usando os atributos HTML (não crie um script próprio, não invente endpoints):
${stepLines}

Regras de marcação:
- Botão/link que leva à etapa: adicione o atributo data-funnel-step="CHAVE" no elemento que já existe.
- Bloco/seção que, ao aparecer na tela, significa que o visitante chegou na etapa: data-funnel-view="CHAVE".
- Formulário cujo envio conclui a etapa: data-funnel-submit="CHAVE".
- Se a etapa acontecer dentro de código JavaScript (callback, evento, SPA), chame: trkFunnel.step('CHAVE').
- Nunca renomeie as chaves; use exatamente as chaves listadas acima.
- Não remova nem altere parâmetros de URL (utm_*, sessionId, src, xcod, fbclid) — o script os repassa para o checkout automaticamente.
- Se um link levar para checkout/Typebot em outro domínio, deixe o href normal: o script já injeta a sessão.

3) A última etapa da lista é o pagamento aprovado e a penúltima é o pagamento iniciado; se elas acontecerem no gateway (fora do site), não marque no HTML — elas chegam pelo webhook.

Ao final, liste em qual elemento você colocou cada chave.`;

  const [testing, setTesting] = useState<"event" | "payment" | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function runTest(kind: "event" | "payment") {
    setTesting(kind);
    setTestResult(null);
    const sid = `TEST-${Date.now().toString(36)}`;
    try {
      const url = kind === "event" ? eventUrl : payUrl;
      const body =
        kind === "event"
          ? { step: k, f: funnelId, sessionId: sid, utm_source: "teste", utm_campaign: "teste", utm_content: "teste" }
          : { transaction_id: sid, funnel_id: funnelId, status: "paid", sessionId: sid, amount: 0, utm_source: "teste" };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      const ok = res.ok;
      setTestResult({ ok, text: `HTTP ${res.status}\n${text}` });
      toast[ok ? "success" : "error"](ok ? "Teste enviado com sucesso" : "Falha no teste");
      if (ok) setTimeout(() => void refetchRecent(), 800);
    } catch (e) {
      setTestResult({ ok: false, text: String(e) });
      toast.error("Falha ao chamar o endpoint");
    } finally {
      setTesting(null);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4 text-sm">
          <p className="text-muted-foreground">
            <strong>Modo automático:</strong> cole 1 linha na sua página e o rastreio começa sozinho — chegada, engajamento
            (scroll/clique) e saída para o checkout. Use o gerador abaixo só quando quiser marcar uma etapa específica.
          </p>
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader className="pb-2"><CardTitle className="text-base">1. Cole este código no &lt;head&gt; do site</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <CopyBox value={autoScript} />
          <p className="text-xs text-muted-foreground">
            Já registra sozinho: <code>chegou</code> ao abrir, <code>engajou</code> no primeiro scroll/clique e{" "}
            <code>checkout</code> ao clicar num link externo (checkout/Typebot). Também repassa a sessão e os UTMs.
          </p>
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Quero controlar manualmente</summary>
            <div className="mt-2"><CopyBox value={manualScript} /></div>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">2. Gerador de código por etapa (opcional)</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Etapa:</span>
            <Select value={k} onValueChange={setStepKey}>
              <SelectTrigger className="h-9 w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {steps.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="botao">
            <TabsList>
              <TabsTrigger value="botao">Botão</TabsTrigger>
              <TabsTrigger value="secao">Seção</TabsTrigger>
              <TabsTrigger value="form">Formulário</TabsTrigger>
              <TabsTrigger value="js">JavaScript</TabsTrigger>
              <TabsTrigger value="typebot">Typebot</TabsTrigger>
            </TabsList>
            <TabsContent value="botao" className="mt-3"><CopyBox value={gen.botao} /></TabsContent>
            <TabsContent value="secao" className="mt-3"><CopyBox value={gen.secao} /></TabsContent>
            <TabsContent value="form" className="mt-3"><CopyBox value={gen.form} /></TabsContent>
            <TabsContent value="js" className="mt-3"><CopyBox value={gen.js} /></TabsContent>
            <TabsContent value="typebot" className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                No Typebot: bloco <strong>HTTP request</strong> → método <strong>GET</strong> → cole a URL abaixo. Nada de JSON.
              </p>
              <CopyBox value={gen.typebot} />
              <p className="text-xs text-muted-foreground">
                Se o Typebot não tiver a variável <code>sessionId</code>, troque <code>{"{{sessionId}}"}</code> por{" "}
                <code>{"{{email}}"}</code> ou <code>{"{{telefone}}"}</code> — agrupamos pelo mesmo identificador.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">3. Prompt para IA (Lovable, Cursor, v0…)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Copie e cole na ferramenta onde o site/página foi criado. Ela vai instalar o script e marcar cada etapa do
            funil automaticamente, seguindo exatamente as etapas salvas aqui.
          </p>
          <PromptBox value={aiPrompt} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Testar integração</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Dispara um evento fake (sessão <code>TEST-…</code>) para conferir se o endpoint responde.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={testing !== null} onClick={() => void runTest("event")}>
              {testing === "event" ? <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              Enviar evento de teste ({k})
            </Button>
          </div>
          {testResult ? (
            <pre
              className={cn(
                "overflow-x-auto rounded-md border p-3 text-xs",
                testResult.ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5",
              )}
            >
              {testResult.text}
            </pre>
          ) : null}
        </CardContent>
      </Card>


      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Últimos eventos recebidos</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {!recent?.length ? (
            <p className="py-4 text-sm text-muted-foreground">
              Nenhum evento ainda. Dispare um bloco do Typebot ou clique em um botão marcado no HTML para testar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Sessão</TableHead>
                  <TableHead>Criativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap text-xs">{new Date(e.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-xs">{e.step}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-xs">{e.session_id}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">{e.utm_content ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StepCard({ number, title, desc, children }: { number: number; title: string; desc: string; children?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-3 py-4 text-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground">
            {number}
          </div>
          <div>
            <div className="font-semibold">{title}</div>
            <p className="text-muted-foreground">{desc}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

type StepDraft = { key: string; label: string; manualKey?: boolean };

const slug = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);

const PRESETS: { id: string; name: string; hint: string; steps: StepDraft[] }[] = [
  {
    id: "generic",
    name: "Genérico (qualquer pagamento)",
    hint: "Serve para cartão, PIX, boleto ou gateway gringo.",
    steps: [
      { key: "chegou", label: "Chegou" },
      { key: "engajou", label: "Engajou" },
      { key: "dados", label: "Deu dados" },
      { key: "viu_oferta", label: "Viu oferta" },
      { key: "checkout", label: "Checkout" },
      { key: "pagamento_iniciado", label: "Pagamento iniciado" },
      { key: "pagamento_aprovado", label: "Pagamento aprovado" },
    ],
  },
  {
    id: "card",
    name: "Cartão / internacional",
    hint: "Checkout com cartão: inclui dados do cartão e aprovação.",
    steps: [
      { key: "chegou", label: "Chegou" },
      { key: "viu_oferta", label: "Viu oferta" },
      { key: "checkout", label: "Checkout" },
      { key: "dados_cartao", label: "Preencheu cartão" },
      { key: "pagamento_iniciado", label: "Tentou pagar" },
      { key: "pagamento_aprovado", label: "Pagamento aprovado" },
    ],
  },
  {
    id: "pix",
    name: "PIX / boleto (Brasil)",
    hint: "Cobrança gerada e depois paga.",
    steps: [
      { key: "chegou", label: "Chegou" },
      { key: "engajou", label: "Engajou" },
      { key: "dados", label: "Deu dados" },
      { key: "viu_oferta", label: "Viu oferta" },
      { key: "checkout", label: "Checkout" },
      { key: "cobranca_gerada", label: "Cobrança gerada" },
      { key: "cobranca_paga", label: "Cobrança paga" },
    ],
  },
  {
    id: "lead",
    name: "Lead → call",
    hint: "Funil de agendamento com venda no fim.",
    steps: [
      { key: "chegou", label: "Chegou" },
      { key: "assistiu_vsl", label: "Assistiu VSL" },
      { key: "formulario", label: "Preencheu formulário" },
      { key: "agendou", label: "Agendou call" },
      { key: "compareceu", label: "Compareceu" },
      { key: "proposta", label: "Recebeu proposta" },
      { key: "pagamento_aprovado", label: "Pagamento aprovado" },
    ],
  },
];

function StepsDialog({ workspaceId, funnelId, onSaved }: { workspaceId: string; funnelId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const stepsFn = useServerFn(getFunnelSteps);
  const saveFn = useServerFn(saveFunnelSteps);
  const { data } = useQuery({
    queryKey: ["funnel-steps", funnelId],
    queryFn: () => stepsFn({ data: { funnelId } }),
    enabled: open && !!funnelId,
  });
  const [draft, setDraft] = useState<StepDraft[] | null>(null);
  const [bulk, setBulk] = useState("");
  const rows: StepDraft[] = draft ?? (data ?? []).map((s) => ({ key: s.key, label: s.label, manualKey: true }));
  const set = (next: StepDraft[]) => setDraft(next);
  const bulkParsed = parseStepList(bulk, rows);
  const applyBulk = (mode: "replace" | "append") => {
    if (bulkParsed.length === 0) return;
    if (mode === "replace") set(bulkParsed.slice(0, 20));
    else {
      const used = new Set(rows.map((r) => r.key));
      const extra = bulkParsed.map((s) => {
        let k = s.key;
        let n = 2;
        while (used.has(k)) k = `${s.key}_${n++}`;
        used.add(k);
        return { ...s, key: k };
      });
      set([...rows, ...extra].slice(0, 20));
    }
    setBulk("");
    toast.success(`${bulkParsed.length} etapa(s) organizada(s) — revise e salve`);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    const a = next[i]!;
    next[i] = next[j]!;
    next[j] = a;
    set(next);
  };

  const dupKeys = rows.filter((r, i) => r.key && rows.findIndex((x) => x.key === r.key) !== i).map((r) => r.key);
  const invalid = rows.length < 2 || rows.some((r) => !r.key || !r.label) || dupKeys.length > 0;

  const save = useMutation({
    mutationFn: () => saveFn({ data: { workspaceId, funnelId, steps: rows } }),
    onSuccess: () => { toast.success("Etapas salvas"); setOpen(false); setDraft(null); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setDraft(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Settings2 className="mr-1.5 h-4 w-4" /> Etapas</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Etapas do funil</DialogTitle></DialogHeader>

        <div className="space-y-3">
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Modelos</div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button key={p.id} variant="outline" size="sm" title={p.hint} onClick={() => set(p.steps.map((s) => ({ ...s })))}>
                  {p.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Criar rápido</div>
            <Textarea
              rows={2}
              placeholder="Seleção do Alvo, Avaliação, Telefone, VSL, Oferta, checkout, upsell_1, Obrigado"
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" disabled={bulkParsed.length === 0} onClick={() => applyBulk("replace")}>
                Organizar (substituir)
              </Button>
              <Button size="sm" variant="outline" disabled={bulkParsed.length === 0} onClick={() => applyBulk("append")}>
                Adicionar ao final
              </Button>
              <span className="text-xs text-muted-foreground">
                Separe por vírgula, na ordem do funil. Nomes iguais aos atuais mantêm a chave. Use "Nome = chave" para fixar.
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
                <Input
                  className="flex-1"
                  placeholder="Rótulo (ex.: Viu oferta)"
                  value={row.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    set(
                      rows.map((r, j) =>
                        j === i ? { ...r, label, key: r.manualKey ? r.key : slug(label) } : r,
                      ),
                    );
                  }}
                  onBlur={() => set(rows.map((r, j) => (j === i ? { ...r, key: r.key || slug(r.label) } : r)))}
                />
                <Input
                  className={cn("w-44 font-mono text-xs", dupKeys.includes(row.key) && "border-destructive")}
                  placeholder="chave (automática)"
                  value={row.key}
                  onChange={(e) =>
                    set(rows.map((r, j) => (j === i ? { ...r, key: slug(e.target.value), manualKey: true } : r)))
                  }
                />
                <Button variant="ghost" size="icon" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => set(rows.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => set([...rows, { key: "", label: "" }])}>
              <Plus className="mr-1.5 h-4 w-4" /> Adicionar etapa
            </Button>
          </div>

          {dupKeys.length > 0 && <p className="text-xs text-destructive">Chaves duplicadas: {[...new Set(dupKeys)].join(", ")}</p>}
          <p className="text-xs text-muted-foreground">
            A ordem define o funil (2 a 20 etapas). A <strong>última</strong> etapa é o pagamento aprovado e a{" "}
            <strong>penúltima</strong> é o pagamento iniciado — vale para cartão, PIX, boleto ou gateway internacional.
            Use a chave nos eventos (<code>data-funnel-step</code> / webhook do Typebot).
          </p>
        </div>

        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending || invalid}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TrafficQualityBadge({
  traffic,
}: {
  traffic?: {
    humanSessions: number;
    botSessions: number;
    botRate: number;
    platforms: { platform: string; human: number; bot: number }[];
  };
}) {
  const human = traffic?.humanSessions ?? 0;
  const bot = traffic?.botSessions ?? 0;
  const total = human + bot;
  const humanPct = total > 0 ? (human / total) * 100 : 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-muted"
        >
          <Bot className="h-3.5 w-3.5 text-primary" />
          <span className="text-emerald-400">{num(human, 0)} humanos</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-amber-400">{num(bot, 0)} robôs</span>
          <span className="flex h-1.5 w-12 overflow-hidden rounded-full bg-muted">
            <span className="h-full bg-emerald-500" style={{ width: `${humanPct}%` }} />
            <span className="h-full bg-amber-500" style={{ width: `${100 - humanPct}%` }} />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Bot className="h-4 w-4 text-primary" /> Tráfego real x robôs
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="font-display text-lg font-semibold text-emerald-400">{num(human, 0)}</p>
            <p className="text-[10px] text-muted-foreground">humanos ({num(humanPct, 2)}%)</p>
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-amber-400">{num(bot, 0)}</p>
            <p className="text-[10px] text-muted-foreground">robôs ({num(traffic?.botRate ?? 0, 2)}%)</p>
          </div>
          <div>
            <p className="font-display text-lg font-semibold">{num(total, 0)}</p>
            <p className="text-[10px] text-muted-foreground">capturados</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">Robôs das plataformas de anúncio não entram nas métricas do funil.</p>
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Por origem</p>
          {(traffic?.platforms ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum acesso no período.</p>
          )}
          {(traffic?.platforms ?? []).map((p) => (
            <div key={p.platform} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium">{p.platform}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-emerald-400">{num(p.human, 0)}</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-amber-400">{num(p.bot, 0)}</span>
              </span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
