import React, { useState, useEffect, useRef } from "react";
import {
  Flame,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Activity,
  KeyRound,
  Eye,
  EyeOff,
  Globe,
  Coins,
  Sliders,
  Sparkles,
  ArrowRight,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  LogEntry,
  PixelEventName,
  SupportedCountry,
  SupportedCurrency,
} from "@/lib/pixel-feeder/types";
import {
  buildEventPayload,
  generateCustomer,
  hashCustomerData,
} from "@/lib/pixel-feeder/generator";
import { sendMetaEvent } from "@/lib/pixel-feeder/sender";

const ALL_COUNTRIES: { code: SupportedCountry; label: string; flag: string; defaultCurrency: SupportedCurrency }[] = [
  { code: "BR", label: "Brasil", flag: "🇧🇷", defaultCurrency: "BRL" },
  { code: "US", label: "Estados Unidos", flag: "🇺🇸", defaultCurrency: "USD" },
  { code: "PT", label: "Portugal", flag: "🇵🇹", defaultCurrency: "EUR" },
  { code: "ES", label: "Espanha", flag: "🇪🇸", defaultCurrency: "EUR" },
  { code: "GB", label: "Reino Unido", flag: "🇬🇧", defaultCurrency: "GBP" },
  { code: "FR", label: "França", flag: "🇫🇷", defaultCurrency: "EUR" },
  { code: "MX", label: "México", flag: "🇲🇽", defaultCurrency: "MXN" },
];

const ALL_EVENTS: { name: PixelEventName; label: string }[] = [
  { name: "PageView", label: "PageView" },
  { name: "ViewContent", label: "ViewContent" },
  { name: "AddToCart", label: "AddToCart" },
  { name: "InitiateCheckout", label: "InitiateCheckout" },
  { name: "Purchase", label: "Purchase" },
  { name: "Lead", label: "Lead" },
  { name: "AddPaymentInfo", label: "AddPaymentInfo" },
  { name: "CompleteRegistration", label: "CompleteRegistration" },
];

const STORAGE_KEY = "nebula_pixel_feeder_config";

export function PixelFeederView() {
  const [pixelId, setPixelId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [testEventCode, setTestEventCode] = useState("");
  const [selectedCountries, setSelectedCountries] = useState<SupportedCountry[]>(["BR"]);
  const [currency, setCurrency] = useState<SupportedCurrency>("BRL");
  const [valueMode, setValueMode] = useState<"fixed" | "range">("range");
  const [valueFixed, setValueFixed] = useState(197);
  const [valueMin, setValueMin] = useState(97);
  const [valueMax, setValueMax] = useState(497);
  const [gender, setGender] = useState<"all" | "female" | "male">("all");
  const [simulateFunnel, setSimulateFunnel] = useState(true);
  const [selectedEvents, setSelectedEvents] = useState<PixelEventName[]>([
    "PageView",
    "ViewContent",
    "AddToCart",
    "InitiateCheckout",
    "Purchase",
  ]);
  const [totalRounds, setTotalRounds] = useState(25);
  const [delayMs, setDelayMs] = useState(1000);

  // Runtime state
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({ sent: 0, success: 0, error: 0 });

  const isRunningRef = useRef(false);
  isRunningRef.current = isRunning;

  // Load saved config
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.pixelId) setPixelId(parsed.pixelId);
        if (parsed.accessToken) setAccessToken(parsed.accessToken);
        if (parsed.testEventCode) setTestEventCode(parsed.testEventCode);
        if (parsed.selectedCountries?.length) setSelectedCountries(parsed.selectedCountries);
        if (parsed.currency) setCurrency(parsed.currency);
      }
    } catch {
      // ignore
    }
  }, []);

  const saveCredentials = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          pixelId,
          accessToken,
          testEventCode,
          selectedCountries,
          currency,
        }),
      );
      toast.success("Credenciais salvas.");
    } catch {
      toast.error("Erro ao salvar.");
    }
  };

  const toggleCountry = (code: SupportedCountry) => {
    if (selectedCountries.includes(code)) {
      if (selectedCountries.length === 1) return;
      setSelectedCountries(selectedCountries.filter((c) => c !== code));
    } else {
      const next = [...selectedCountries, code];
      setSelectedCountries(next);
      if (next.length === 1) {
        const match = ALL_COUNTRIES.find((c) => c.code === code);
        if (match) setCurrency(match.defaultCurrency);
      }
    }
  };

  const toggleEvent = (eventName: PixelEventName) => {
    if (selectedEvents.includes(eventName)) {
      if (selectedEvents.length === 1) return;
      setSelectedEvents(selectedEvents.filter((e) => e !== eventName));
    } else {
      setSelectedEvents([...selectedEvents, eventName]);
    }
  };

  const getEffectiveValue = () => {
    if (valueMode === "fixed") return Number(valueFixed);
    const min = Number(valueMin);
    const max = Number(valueMax);
    const randomVal = Math.random() * (max - min) + min;
    return Math.round(randomVal * 100) / 100;
  };

  const handleStart = async () => {
    if (!pixelId.trim()) {
      toast.error("Informe o Pixel ID.");
      return;
    }
    if (!accessToken.trim()) {
      toast.error("Informe o Access Token do CAPI.");
      return;
    }
    if (selectedCountries.length === 0) {
      toast.error("Selecione ao menos um país.");
      return;
    }

    saveCredentials();
    setIsRunning(true);
    isRunningRef.current = true;
    toast.success("Disparos iniciados.");

    let localSent = stats.sent;
    let localSuccess = stats.success;
    let localError = stats.error;

    for (let round = 1; round <= totalRounds; round++) {
      if (!isRunningRef.current) break;

      const pickedCountry =
        selectedCountries[Math.floor(Math.random() * selectedCountries.length)];

      const customer = generateCustomer(pickedCountry, gender);
      const hashedUser = await hashCustomerData(customer);

      const eventsToRun: PixelEventName[] = simulateFunnel
        ? ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"]
        : selectedEvents;

      const orderValue = getEffectiveValue();

      for (const evtName of eventsToRun) {
        if (!isRunningRef.current) break;

        const eventPayload = buildEventPayload(evtName, hashedUser, currency, orderValue);
        const logId = Math.random().toString(36).substring(2, 9);

        const newLog: LogEntry = {
          id: logId,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          eventName: evtName,
          status: "sending",
          country: pickedCountry,
          currency,
          value: evtName === "Purchase" || evtName === "AddToCart" ? orderValue : undefined,
          customerName: `${customer.firstName} ${customer.lastName}`,
          eventId: eventPayload.event_id,
          matchScoreEstimate: 9.8,
        };

        setLogs((prev) => [newLog, ...prev.slice(0, 149)]);

        const res = await sendMetaEvent(
          pixelId,
          accessToken,
          eventPayload,
          testEventCode || undefined,
        );

        localSent++;
        if (res.ok) {
          localSuccess++;
          newLog.status = "success";
          newLog.httpCode = 200;
          newLog.fbtraceId = res.fbtraceId;
        } else {
          localError++;
          newLog.status = "error";
          newLog.httpCode = res.httpStatus;
          newLog.responseMessage = res.errorMessage;
          newLog.fbtraceId = res.fbtraceId;
        }

        setLogs((prev) => prev.map((l) => (l.id === logId ? { ...newLog } : l)));
        setStats({ sent: localSent, success: localSuccess, error: localError });

        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    setIsRunning(false);
    isRunningRef.current = false;
  };

  const handlePause = () => {
    setIsRunning(false);
    isRunningRef.current = false;
    toast.info("Pausado.");
  };

  const handleReset = () => {
    setIsRunning(false);
    isRunningRef.current = false;
    setLogs([]);
    setStats({ sent: 0, success: 0, error: 0 });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Pixel Feeder</h1>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
              BETA
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-border text-muted-foreground bg-muted/30">
              EMQ 9.8+
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Aquecedor de Pixel Meta Conversions API com SHA-256 e personas geolocalizadas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handlePause}
              className="gap-2 text-rose-400 border-rose-500/40 hover:bg-rose-500/10"
            >
              <Pause className="h-3.5 w-3.5" /> Pausar
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleStart}
              className="gap-2 bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Iniciar
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            disabled={isRunning}
            className="text-muted-foreground hover:text-foreground h-9 px-3"
            title="Limpar logs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* Stats row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl overflow-hidden border border-border bg-border">
        <div className="bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            <span className="text-xs">Total enviados</span>
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{stats.sent}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">eventos CAPI</div>
        </div>

        <div className="bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-xs">Sucessos</span>
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-emerald-500">
            {stats.success}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">HTTP 200 recebidos</div>
        </div>

        <div className="bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <XCircle className="h-3.5 w-3.5 text-rose-500" />
            <span className="text-xs">Rejeições</span>
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-rose-500">
            {stats.error}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">erros ou rate-limit</div>
        </div>

        <div className="bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs">EMQ Estimado</span>
          </div>
          <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-primary">
            9.8 <span className="text-xs text-muted-foreground font-normal">/ 10</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">qualidade de dados</div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Parameters */}
        <div className="lg:col-span-5 space-y-4">
          {/* Box 1: Conexão */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" /> Conexão Meta
              </h2>
              <button
                type="button"
                onClick={saveCredentials}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Salvar
              </button>
            </div>

            <div className="space-y-1">
              <Label htmlFor="pf-id" className="text-xs text-muted-foreground">Pixel ID</Label>
              <Input
                id="pf-id"
                placeholder="Ex: 123456789012345"
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                disabled={isRunning}
                className="h-8 text-xs bg-background/50 font-mono"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="pf-token" className="text-xs text-muted-foreground">Access Token (CAPI)</Label>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  {showToken ? "Ocultar" : "Ver"}
                </button>
              </div>
              <Input
                id="pf-token"
                type={showToken ? "text" : "password"}
                placeholder="EAAG..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                disabled={isRunning}
                className="h-8 text-xs bg-background/50 font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="pf-test" className="text-xs text-muted-foreground">
                Test Event Code <span className="text-[10px] opacity-60">(opcional)</span>
              </Label>
              <Input
                id="pf-test"
                placeholder="Ex: TEST12345"
                value={testEventCode}
                onChange={(e) => setTestEventCode(e.target.value)}
                disabled={isRunning}
                className="h-8 text-xs bg-background/50 font-mono"
              />
            </div>
          </div>

          {/* Box 2: Segmentação & Moeda */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Audiência & Moeda
            </h2>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">País de destino</Label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_COUNTRIES.map((c) => {
                  const active = selectedCountries.includes(c.code);
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => toggleCountry(c.code)}
                      disabled={isRunning}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1.5 ${
                        active
                          ? "bg-primary/10 border-primary/50 text-foreground font-medium"
                          : "border-border bg-background/40 text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                    >
                      <span>{c.flag}</span>
                      <span>{c.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Moeda</Label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                  disabled={isRunning}
                  aria-label="Moeda"
                  className="w-full h-8 rounded-md border border-border bg-background/50 px-2 text-xs focus:outline-none"
                >
                  <option value="BRL">BRL (R$)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="MXN">MXN ($)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Gênero</Label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  disabled={isRunning}
                  aria-label="Gênero"
                  className="w-full h-8 rounded-md border border-border bg-background/50 px-2 text-xs focus:outline-none"
                >
                  <option value="all">Misto / Ambos</option>
                  <option value="female">Feminino</option>
                  <option value="male">Masculino</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Valor por compra ({currency})</span>
                <button
                  type="button"
                  onClick={() => setValueMode(valueMode === "range" ? "fixed" : "range")}
                  className="text-[10px] hover:text-foreground"
                >
                  {valueMode === "range" ? "Mudar p/ fixo" : "Mudar p/ faixa"}
                </button>
              </div>

              {valueMode === "fixed" ? (
                <Input
                  type="number"
                  value={valueFixed}
                  onChange={(e) => setValueFixed(Number(e.target.value))}
                  disabled={isRunning}
                  className="h-8 text-xs bg-background/50 font-mono"
                />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={valueMin}
                    onChange={(e) => setValueMin(Number(e.target.value))}
                    disabled={isRunning}
                    className="h-8 text-xs bg-background/50 font-mono"
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={valueMax}
                    onChange={(e) => setValueMax(Number(e.target.value))}
                    disabled={isRunning}
                    className="h-8 text-xs bg-background/50 font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Box 3: Estratégia */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3.5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5" /> Disparos & Funil
            </h2>

            <div className="flex items-center justify-between py-1">
              <div>
                <div className="text-xs font-medium">Funil Completo</div>
                <div className="text-[11px] text-muted-foreground">
                  PageView → ViewContent → Cart → Checkout → Purchase
                </div>
              </div>
              <Switch
                checked={simulateFunnel}
                onCheckedChange={setSimulateFunnel}
                disabled={isRunning}
              />
            </div>

            {!simulateFunnel && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ALL_EVENTS.map((e) => {
                  const active = selectedEvents.includes(e.name);
                  return (
                    <button
                      key={e.name}
                      type="button"
                      onClick={() => toggleEvent(e.name)}
                      disabled={isRunning}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                        active
                          ? "bg-primary/10 border-primary/50 text-foreground font-medium"
                          : "border-border bg-background/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {e.label}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ciclos</Label>
                <select
                  value={totalRounds}
                  onChange={(e) => setTotalRounds(Number(e.target.value))}
                  disabled={isRunning}
                  aria-label="Ciclos"
                  className="w-full h-8 rounded-md border border-border bg-background/50 px-2 text-xs focus:outline-none"
                >
                  <option value={10}>10 pessoas</option>
                  <option value={25}>25 pessoas</option>
                  <option value={50}>50 pessoas</option>
                  <option value={100}>100 pessoas</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Delay</Label>
                <select
                  value={delayMs}
                  onChange={(e) => setDelayMs(Number(e.target.value))}
                  disabled={isRunning}
                  aria-label="Delay"
                  className="w-full h-8 rounded-md border border-border bg-background/50 px-2 text-xs focus:outline-none"
                >
                  <option value={500}>0.5s</option>
                  <option value={1000}>1.0s</option>
                  <option value={2000}>2.0s</option>
                  <option value={3000}>3.0s</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Clean Minimalist Event Feed */}
        <div className="lg:col-span-7">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 min-h-[580px] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Feed de Eventos
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${isRunning ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/40"}`} />
                <span className="text-[11px] text-muted-foreground font-mono">
                  {isRunning ? "disparando" : "parado"}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-[11px] pr-1">
              {logs.length === 0 ? (
                <div className="h-96 flex flex-col items-center justify-center text-center text-muted-foreground">
                  <Flame className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-foreground font-medium">Aguardando início</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                    Preencha o Pixel ID e Token e clique em Iniciar para disparar os eventos.
                  </p>
                </div>
              ) : (
                logs.map((log) => {
                  const isSuccess = log.status === "success";
                  const isError = log.status === "error";

                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-background/40 hover:bg-muted/30 border border-border/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-muted-foreground/70 shrink-0 text-[10px]">{log.timestamp}</span>
                        <span
                          className={`shrink-0 font-medium ${
                            log.eventName === "Purchase"
                              ? "text-emerald-400"
                              : log.eventName === "InitiateCheckout"
                              ? "text-blue-400"
                              : log.eventName === "AddToCart"
                              ? "text-amber-400"
                              : "text-foreground/90"
                          }`}
                        >
                          {log.eventName}
                        </span>
                        <span className="text-muted-foreground truncate max-w-[140px] hidden sm:inline">
                          {log.customerName}
                        </span>
                        <span className="text-muted-foreground/60 text-[10px]">
                          [{log.country}]
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {log.value !== undefined && (
                          <span className="text-foreground/90 tabular-nums">
                            {log.currency} {log.value.toFixed(2)}
                          </span>
                        )}

                        {isSuccess && (
                          <span className="text-emerald-500 text-[10px]">200 OK</span>
                        )}
                        {isError && (
                          <span className="text-rose-500 text-[10px]" title={log.responseMessage}>
                            {log.httpCode ? `Erro ${log.httpCode}` : "Falha"}
                          </span>
                        )}
                        {log.status === "sending" && (
                          <span className="text-amber-400 text-[10px]">...</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
