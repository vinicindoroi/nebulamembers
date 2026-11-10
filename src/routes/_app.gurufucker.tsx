import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, Loader2, Plus, Play, Square, Trash2, Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CURRENCIES, CURRENCY_CODES, DEFAULT_SETTINGS, centsToInput, expectedTicketCents, formatMoney,
  normalizeFunnel, normalizeSettings, parsePriceToCents, reachChances,
  type CurrencyCode, type FunnelStep, type GuruSettings,
} from "@/lib/gurufucker/core";
import {
  clearGuruLogs, fireGuruNow, getGuruState, saveGuruConfig, startGuruJob, stopGuruJob,
} from "@/lib/gurufucker.functions";

export const Route = createFileRoute("/_app/gurufucker")({
  component: GurufuckerPage,
  head: () => ({
    meta: [
      { title: "Gurufucker — Nebula" },
      { name: "description", content: "Monte o funil, escolha valores e moeda e dispare vendas para a Utmify." },
      { property: "og:title", content: "Gurufucker — Nebula" },
      { property: "og:description", content: "Monte o funil, escolha valores e moeda e dispare vendas para a Utmify." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Row = FunnelStep & { priceInput: string };

const newId = () => Math.random().toString(36).slice(2, 9);
const newRow = (): Row => ({ id: newId(), name: "", priceCents: 0, priceInput: "", conv: 100 });
const stepLabel = (i: number) => (i === 0 ? "Produto principal" : `${i + 1}º produto`);

function GurufuckerPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const getState = useServerFn(getGuruState);
  const save = useServerFn(saveGuruConfig);
  const fire = useServerFn(fireGuruNow);
  const start = useServerFn(startGuruJob);
  const stop = useServerFn(stopGuruJob);
  const clear = useServerFn(clearGuruLogs);

  const { data, isLoading } = useQuery({
    queryKey: ["gurufucker", user?.id],
    queryFn: () => getState(),
    enabled: !!user?.id,
    refetchInterval: (q) => (q.state.data?.job?.active ? 3000 : 15000),
  });

  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [settings, setSettings] = useState<GuruSettings>(DEFAULT_SETTINGS);
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showUtm, setShowUtm] = useState(false);

  const [quantity, setQuantity] = useState("10");
  const [randomMode, setRandomMode] = useState(false);
  const [interval, setIntervalSec] = useState("10");
  const [rMin, setRMin] = useState("5");
  const [rMax, setRMax] = useState("30");
  const [firing, setFiring] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (hydrated || !data) return;
    const cfg = data.config;
    if (cfg) {
      setToken(cfg.api_token ?? "");
      setSettings(normalizeSettings(cfg.settings));
      const f = normalizeFunnel(cfg.funnel);
      if (f.length) setRows(f.map((s) => ({ ...s, priceInput: s.priceCents ? centsToInput(s.priceCents) : "" })));
    }
    const j = data.job;
    if (j) {
      setQuantity(String(j.total || 10));
      setRandomMode(!!j.random_enabled);
      setIntervalSec(String(j.interval_sec || 10));
      setRMin(String(j.random_min_sec || 5));
      setRMax(String(j.random_max_sec || 30));
    }
    setHydrated(true);
  }, [data, hydrated]);

  const funnel: FunnelStep[] = useMemo(
    () => rows.map(({ priceInput: _p, ...s }) => ({ ...s, name: s.name.trim() })),
    [rows],
  );

  const payload = useMemo(() => ({ apiToken: token, settings, funnel }), [token, settings, funnel]);
  const lastSaved = useRef<string>("");

  async function persist(force = false) {
    const json = JSON.stringify(payload);
    if (!force && json === lastSaved.current) return;
    setSaving(true);
    try {
      await save({ data: payload });
      lastSaved.current = json;
    } finally {
      setSaving(false);
    }
  }

  // Salva sozinho depois de parar de digitar.
  useEffect(() => {
    if (!hydrated) return;
    if (!lastSaved.current) {
      lastSaved.current = JSON.stringify(payload);
      return;
    }
    const t = setTimeout(() => {
      persist().catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar."));
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, hydrated]);

  const set = <K extends keyof GuruSettings>(k: K, v: GuruSettings[K]) => setSettings((s) => ({ ...s, [k]: v }));
  const updateRow = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const move = (i: number, dir: -1 | 1) =>
    setRows((rs) => {
      const j = i + dir;
      if (j < 0 || j >= rs.length) return rs;
      const copy = [...rs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const sellable = funnel.filter((s) => s.priceCents > 0);
  const chances = reachChances(funnel);
  const ticket = expectedTicketCents(funnel);
  const fullFunnel = sellable.reduce((s, x) => s + x.priceCents, 0);
  const currency = settings.currency;

  const job = data?.job;
  const active = !!job?.active;
  const sentBuyers = job ? Math.max(0, job.total - job.remaining) : 0;
  const progress = job && job.total > 0 ? (sentBuyers / job.total) * 100 : 0;

  const canFire = !!token.trim() && sellable.length > 0;
  const refresh = () => qc.invalidateQueries({ queryKey: ["gurufucker", user?.id] });

  async function handleFire() {
    if (!canFire) return toast.error(!token.trim() ? "Cole o token da Utmify." : "Coloque o valor de ao menos um produto.");
    setFiring(true);
    try {
      await persist(true);
      const r = await fire();
      if (r.ok) toast.success(`Venda enviada (${r.sent} produto${r.sent === 1 ? "" : "s"} do funil).`);
      else toast.error(r.error ?? "Falha ao enviar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar.");
    } finally {
      setFiring(false);
      refresh();
    }
  }

  async function handleStart() {
    if (!canFire) return toast.error(!token.trim() ? "Cole o token da Utmify." : "Coloque o valor de ao menos um produto.");
    const q = Math.floor(Number(quantity));
    if (!q || q < 1 || q > 5000) return toast.error("Quantidade entre 1 e 5000.");
    const iv = Math.max(1, Math.floor(Number(interval)) || 1);
    const mn = Math.max(1, Math.floor(Number(rMin)) || 1);
    const mx = Math.max(mn, Math.floor(Number(rMax)) || mn);
    setStarting(true);
    try {
      await persist(true);
      await start({ data: { quantity: q, intervalSec: iv, randomEnabled: randomMode, randomMinSec: mn, randomMaxSec: mx } });
      toast.success("Disparos iniciados. Pode fechar a página, eles continuam.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao iniciar.");
    } finally {
      setStarting(false);
      refresh();
    }
  }

  async function handleStop() {
    try {
      await stop();
      toast.success("Disparos parados.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao parar.");
    } finally {
      refresh();
    }
  }

  async function handleClear() {
    if (!confirm("Apagar todo o histórico de envios?")) return;
    await clear();
    refresh();
  }

  const logs = data?.logs ?? [];
  const today = new Date().toDateString();
  const todayOk = logs.filter((l) => l.ok && new Date(l.fired_at).toDateString() === today);
  const todayByCurrency = todayOk.reduce<Record<string, number>>((acc, l) => {
    acc[l.currency] = (acc[l.currency] ?? 0) + l.amount_cents;
    return acc;
  }, {});

  if (isLoading || !hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-4 pb-16 sm:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Gurufucker{" "}
            <span className="ml-1 rounded-md bg-primary/15 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-primary">BETA</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monte o funil e dispare vendas para a sua conta da Utmify.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {active && (
            <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-medium text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> disparando
            </span>
          )}
          <span>{saving ? "Salvando…" : "Salvo"}</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {/* Funil */}
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Funil</h2>
                  <p className="text-xs text-muted-foreground">
                    {rows.length} produto{rows.length === 1 ? "" : "s"}, na ordem em que o comprador passa.
                  </p>
                </div>
                <div className="w-48">
                  <Select value={currency} onValueChange={(v) => set("currency", v as CurrencyCode)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCY_CODES.map((c) => (
                        <SelectItem key={c} value={c}>{c} · {CURRENCIES[c].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mb-1 hidden gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1fr_140px_120px]">
                <span>Produto</span>
                <span>Preço ({currency})</span>
                <span className="text-right">% de compra</span>
              </div>

              <ol className="space-y-2">
                {rows.map((r, i) => {
                  const idx = sellable.findIndex((s) => s.id === r.id);
                  const reach = idx >= 0 ? chances[idx] : null;
                  return (
                    <li key={r.id} className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{i + 1}</span>
                          <span className="text-xs font-medium text-muted-foreground">{stepLabel(i)}</span>
                          {reach != null && i > 0 && (
                            <span className="text-[11px] text-muted-foreground">· {Math.round(reach * 100)}% dos compradores chegam aqui</span>
                          )}
                        </div>
                        <div className="flex items-center">
                          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Subir">
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Descer">
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" disabled={rows.length <= 1} onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))} aria-label="Remover">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-[1fr_140px_120px]">
                        <Input placeholder="Nome do produto" value={r.name} maxLength={120} onChange={(e) => updateRow(r.id, { name: e.target.value })} />
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{currency}</span>
                          <Input
                            className="pl-12 text-right tabular-nums"
                            inputMode="decimal"
                            placeholder="0,00"
                            value={r.priceInput}
                            onChange={(e) => updateRow(r.id, { priceInput: e.target.value, priceCents: parsePriceToCents(e.target.value) })}
                            onBlur={() => updateRow(r.id, { priceInput: r.priceCents ? centsToInput(r.priceCents) : "" })}
                          />
                        </div>
                        {i > 0 && (
                          <div className="relative" aria-label="% de compra" title="Chance de quem comprou o produto anterior comprar este">
                            <Input
                              className="pr-8 text-right tabular-nums"
                              inputMode="numeric"
                              value={String(r.conv)}
                              onChange={(e) => updateRow(r.id, { conv: Math.min(100, Math.max(0, Math.round(Number(e.target.value.replace(/\D/g, "")) || 0))) })}
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>

              <Button variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, newRow()])} disabled={rows.length >= 20}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar produto
              </Button>

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/30 p-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Funil completo</div>
                  <div className="font-semibold tabular-nums">{formatMoney(fullFunnel, currency)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Média por comprador</div>
                  <div className="font-semibold tabular-nums text-primary">{formatMoney(ticket, currency)}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Cada comprador sempre compra o produto principal. Os seguintes entram de acordo com a % de compra, e o funil para no primeiro que ele recusar. Cada produto vira um pedido separado na Utmify.
              </p>
            </CardContent>
          </Card>

          {/* Histórico */}
          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold">Envios recentes</h2>
                {logs.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleClear}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Limpar
                  </Button>
                )}
              </div>
              {logs.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Nenhum envio ainda.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {logs.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", l.ok ? "bg-primary" : "bg-destructive")} />
                        <span className="truncate">{l.product_name}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{stepLabel(l.step_index)}</span>
                        {l.source === "auto" && <span className="shrink-0 rounded bg-muted px-1 text-[10px] text-muted-foreground">auto</span>}
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-xs">
                        {!l.ok && <span className="max-w-[160px] truncate text-destructive" title={l.error ?? ""}>{l.status_code ? `erro ${l.status_code}` : "falhou"}</span>}
                        <span className="font-medium tabular-nums">{formatMoney(l.amount_cents, l.currency)}</span>
                        <span className="w-12 text-right text-muted-foreground tabular-nums">
                          {new Date(l.fired_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          {/* Disparo */}
          <Card className="lg:sticky lg:top-4">
            <CardContent className="space-y-4 p-5">
              <h2 className="text-base font-semibold">Disparar</h2>
              <Button className="w-full" onClick={handleFire} disabled={firing || !canFire}>
                {firing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                Disparar 1 venda agora
              </Button>

              <div className="h-px bg-border" />

              {active && job ? (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground">Compradores enviados</span>
                    <span className="font-semibold tabular-nums">{sentBuyers}/{job.total}</span>
                  </div>
                  <Progress value={progress} />
                  {job.last_status && <p className="truncate text-xs text-muted-foreground">Último: {job.last_status}</p>}
                  <Button variant="outline" className="w-full" onClick={handleStop}>
                    <Square className="mr-2 h-4 w-4" /> Parar
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Quantos compradores</Label>
                    <Input inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ""))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="gf-random" className="text-sm">Intervalo aleatório</Label>
                    <Switch id="gf-random" checked={randomMode} onCheckedChange={setRandomMode} />
                  </div>
                  {randomMode ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Mín. (seg)</Label>
                        <Input inputMode="numeric" value={rMin} onChange={(e) => setRMin(e.target.value.replace(/\D/g, ""))} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Máx. (seg)</Label>
                        <Input inputMode="numeric" value={rMax} onChange={(e) => setRMax(e.target.value.replace(/\D/g, ""))} />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label className="text-xs text-muted-foreground">A cada (segundos)</Label>
                      <Input inputMode="numeric" value={interval} onChange={(e) => setIntervalSec(e.target.value.replace(/\D/g, ""))} />
                    </div>
                  )}
                  <Button variant="secondary" className="w-full" onClick={handleStart} disabled={starting || !canFire}>
                    {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                    Iniciar disparos
                  </Button>
                  <p className="text-[11px] text-muted-foreground">Continua mesmo com a página fechada.</p>
                </div>
              )}

              <div className="rounded-xl bg-muted/30 p-3">
                <div className="text-xs text-muted-foreground">Enviado hoje</div>
                {Object.keys(todayByCurrency).length === 0 ? (
                  <div className="font-semibold">—</div>
                ) : (
                  Object.entries(todayByCurrency).map(([c, v]) => (
                    <div key={c} className="font-semibold tabular-nums">{formatMoney(v, c)}</div>
                  ))
                )}
                <div className="text-[11px] text-muted-foreground">{todayOk.length} pedido{todayOk.length === 1 ? "" : "s"}</div>
              </div>
            </CardContent>
          </Card>

          {/* Configuração */}
          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="text-base font-semibold">Utmify</h2>
              <div>
                <Label className="text-xs text-muted-foreground">Token da API</Label>
                <div className="relative">
                  <Input
                    type={showToken ? "text" : "password"}
                    autoComplete="off"
                    className="pr-10"
                    placeholder="Cole aqui o token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowToken((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showToken ? "Esconder token" : "Mostrar token"}>
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Utmify → Integrações → Webhooks → Credenciais de API.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Plataforma</Label>
                  <Input value={settings.platform} maxLength={60} onChange={(e) => set("platform", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Pagamento</Label>
                  <Select value={settings.paymentMethod} onValueChange={(v) => set("paymentMethod", v as GuruSettings["paymentMethod"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="credit_card">Cartão</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Espera entre produtos do funil (seg)</Label>
                <Input inputMode="numeric" value={String(settings.stepDelaySec)} onChange={(e) => set("stepDelaySec", Math.min(30, Number(e.target.value.replace(/\D/g, "")) || 0))} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="gf-cust" className="text-sm">Nome de cliente aleatório</Label>
                <Switch id="gf-cust" checked={settings.randomCustomer} onCheckedChange={(v) => set("randomCustomer", v)} />
              </div>
              {!settings.randomCustomer && (
                <div className="grid gap-2">
                  <Input placeholder="Nome do cliente" value={settings.customerName} onChange={(e) => set("customerName", e.target.value)} />
                  <Input placeholder="Email do cliente" value={settings.customerEmail} onChange={(e) => set("customerEmail", e.target.value)} />
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label htmlFor="gf-test" className="text-sm">Marcar como teste</Label>
                <Switch id="gf-test" checked={settings.isTest} onCheckedChange={(v) => set("isTest", v)} />
              </div>

              <button type="button" onClick={() => setShowUtm((v) => !v)} className="flex w-full items-center justify-between pt-1 text-sm text-muted-foreground hover:text-foreground">
                UTMs (opcional)
                <ChevronDown className={cn("h-4 w-4 transition-transform", showUtm && "rotate-180")} />
              </button>
              {showUtm && (
                <div className="grid gap-2">
                  {(["utm_source", "utm_campaign", "utm_medium", "utm_content", "utm_term"] as const).map((k) => (
                    <Input key={k} placeholder={k} value={settings[k]} onChange={(e) => set(k, e.target.value)} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
