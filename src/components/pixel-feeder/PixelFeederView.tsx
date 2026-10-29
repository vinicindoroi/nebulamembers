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
  Sliders,
  Sparkles,
  Terminal,
  HelpCircle,
  Check,
  Send,
  Zap,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
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
import { generateEventId } from "@/lib/pixel-feeder/crypto";
import { sendMetaEvent } from "@/lib/pixel-feeder/sender";
import { CountrySelectDropdown } from "./CountrySelectDropdown";
import { NICHE_PRESETS } from "@/lib/pixel-feeder/niches";
import { getCountryCurrency, convertCurrency } from "@/lib/pixel-feeder/currency";
import { COUNTRIES_CATALOG } from "@/lib/pixel-feeder/countries";

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
  const [nicheId, setNicheId] = useState("general");
  const [customCategory, setCustomCategory] = useState("");
  const [productName, setProductName] = useState("");
  const [autoConvertCurrency, setAutoConvertCurrency] = useState(true);
  const [valueMode, setValueMode] = useState<"fixed" | "range">("fixed");
  const [valueFixed, setValueFixed] = useState(97);
  const [valueMin, setValueMin] = useState(97);
  const [valueMax, setValueMax] = useState(497);
  const [gender, setGender] = useState<"all" | "female" | "male">("all");
  const [simulateFunnel, setSimulateFunnel] = useState(true);
  const [timeDistribution, setTimeDistribution] = useState<"realtime" | "3days" | "7days">("7days");
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
  const [isTestingSingle, setIsTestingSingle] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentStepInfo, setCurrentStepInfo] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({ sent: 0, success: 0, error: 0 });
  const [showHelpModal, setShowHelpModal] = useState(false);

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
        if (parsed.nicheId) setNicheId(parsed.nicheId);
        if (parsed.customCategory) setCustomCategory(parsed.customCategory);
        if (parsed.productName) setProductName(parsed.productName);
        if (typeof parsed.autoConvertCurrency === "boolean") setAutoConvertCurrency(parsed.autoConvertCurrency);
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
          nicheId,
          customCategory,
          productName,
          autoConvertCurrency,
        }),
      );
      toast.success("Credenciais salvas no seu navegador!");
    } catch {
      toast.error("Erro ao salvar.");
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

  // Quick single test event
  const handleTestSingle = async () => {
    if (!pixelId.trim()) {
      toast.error("Preencha o Pixel ID.");
      return;
    }
    if (!accessToken.trim()) {
      toast.error("Preencha o Access Token.");
      return;
    }
    setIsTestingSingle(true);
    saveCredentials();

    try {
      const pickedCountry = selectedCountries[0] || "BR";
      const customer = generateCustomer(pickedCountry, gender);
      const hashedUser = await hashCustomerData(customer);
      const baseOrderValue = getEffectiveValue();
      const { value: orderValue, currency: eventCurrency } = autoConvertCurrency
        ? convertCurrency(baseOrderValue, currency, getCountryCurrency(pickedCountry))
        : { value: baseOrderValue, currency };

      const payload = buildEventPayload(
        "Purchase",
        hashedUser,
        eventCurrency,
        orderValue,
        generateEventId(),
        undefined,
        {
          nicheId,
          customCategory,
          productName,
        },
      );

      const logId = Math.random().toString(36).substring(2, 9);
      const newLog: LogEntry = {
        id: logId,
        timestamp: "Agora",
        eventName: "Purchase",
        status: "sending",
        country: pickedCountry,
        currency: eventCurrency,
        value: orderValue,
        customerName: `${customer.firstName} ${customer.lastName}`,
        productName: payload.custom_data?.content_name,
        category: payload.custom_data?.content_category,
        eventId: payload.event_id,
        matchScoreEstimate: 9.8,
      };

      setLogs((prev) => [newLog, ...prev]);

      const res = await sendMetaEvent(pixelId, accessToken, payload, testEventCode || undefined);
      if (res.ok) {
        newLog.status = "success";
        newLog.httpCode = 200;
        newLog.fbtraceId = res.fbtraceId;
        setStats((s) => ({ ...s, sent: s.sent + 1, success: s.success + 1 }));
        toast.success("Disparo de teste realizado com sucesso! (HTTP 200)");
      } else {
        newLog.status = "error";
        newLog.httpCode = res.httpStatus;
        newLog.responseMessage = res.errorMessage;
        newLog.fbtraceId = res.fbtraceId;
        setStats((s) => ({ ...s, sent: s.sent + 1, error: s.error + 1 }));
        toast.error(`Falha: ${res.errorMessage}`);
      }
      setLogs((prev) => prev.map((l) => (l.id === logId ? { ...newLog } : l)));
    } finally {
      setIsTestingSingle(false);
    }
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
    setProgressPercent(0);
    toast.success("Aquecimento iniciado! Acompanhe o feed de eventos.");

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

      const baseOrderValue = getEffectiveValue();
      const { value: orderValue, currency: eventCurrency } = autoConvertCurrency
        ? convertCurrency(baseOrderValue, currency, getCountryCurrency(pickedCountry))
        : { value: baseOrderValue, currency };

      // Retroactive time distribution
      let windowSeconds = 0;
      if (timeDistribution === "7days") {
        windowSeconds = 6 * 86400 + Math.floor(Math.random() * 86400);
      } else if (timeDistribution === "3days") {
        windowSeconds = 2 * 86400 + Math.floor(Math.random() * 86400);
      }

      const nowSec = Math.floor(Date.now() / 1000);
      const sessionBaseTime = windowSeconds > 0
        ? nowSec - Math.floor(Math.random() * windowSeconds)
        : nowSec;

      let stepOffset = 0;

      setCurrentStepInfo(`Pessoa ${round} de ${totalRounds}: ${customer.firstName} ${customer.lastName} (${pickedCountry})`);

      for (const evtName of eventsToRun) {
        if (!isRunningRef.current) break;

        if (evtName === "PageView") stepOffset = 0;
        else if (evtName === "ViewContent") stepOffset += Math.floor(20 + Math.random() * 40);
        else if (evtName === "AddToCart") stepOffset += Math.floor(30 + Math.random() * 60);
        else if (evtName === "InitiateCheckout") stepOffset += Math.floor(40 + Math.random() * 80);
        else if (evtName === "Purchase") stepOffset += Math.floor(50 + Math.random() * 100);

        const eventTime = Math.min(nowSec, sessionBaseTime + stepOffset);
        const eventPayload = buildEventPayload(
          evtName,
          hashedUser,
          eventCurrency,
          orderValue,
          generateEventId(),
          eventTime,
          {
            nicheId,
            customCategory,
            productName,
          },
        );
        const logId = Math.random().toString(36).substring(2, 9);

        const eventDate = new Date(eventTime * 1000);
        const isToday = eventDate.toDateString() === new Date().toDateString();
        const timeFormatted = isToday
          ? eventDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          : `${eventDate.getDate().toString().padStart(2, "0")}/${(eventDate.getMonth() + 1).toString().padStart(2, "0")} ${eventDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

        const newLog: LogEntry = {
          id: logId,
          timestamp: timeFormatted,
          eventName: evtName,
          status: "sending",
          country: pickedCountry,
          currency: eventCurrency,
          value: evtName === "Purchase" || evtName === "AddToCart" ? orderValue : undefined,
          customerName: `${customer.firstName} ${customer.lastName}`,
          productName: eventPayload.custom_data?.content_name,
          category: eventPayload.custom_data?.content_category,
          eventId: eventPayload.event_id,
          matchScoreEstimate: 9.8,
        };

        setLogs((prev) => [newLog, ...prev.slice(0, 199)]);

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

      setProgressPercent(Math.round((round / totalRounds) * 100));
    }

    setIsRunning(false);
    isRunningRef.current = false;
    setCurrentStepInfo(null);
    toast.success("Aquecimento concluído com sucesso!");
  };

  const handlePause = () => {
    setIsRunning(false);
    isRunningRef.current = false;
    setCurrentStepInfo(null);
    toast.info("Pausado.");
  };

  const handleReset = () => {
    setIsRunning(false);
    isRunningRef.current = false;
    setProgressPercent(0);
    setCurrentStepInfo(null);
    setLogs([]);
    setStats({ sent: 0, success: 0, error: 0 });
    toast.info("Logs e estatísticas zeradas.");
  };

  const totalCalculatedEvents = (simulateFunnel ? 5 : selectedEvents.length) * totalRounds;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
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
            Aquecedor de Pixel Meta Conversions API com hashing SHA-256 e personas geolocalizadas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowHelpModal(true)}
            className="text-xs gap-1.5 h-8 text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="h-3.5 w-3.5" /> Como pegar o Token
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            disabled={isRunning}
            className="text-muted-foreground hover:text-foreground h-8 px-2.5"
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
          <div className="text-[11px] text-muted-foreground mt-0.5">qualidade máxima</div>
        </div>
      </section>

      {/* Active Running Progress Banner */}
      {isRunning && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-2 animate-fade-in shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-medium text-primary">
              <Zap className="h-4 w-4 animate-spin text-primary" />
              {currentStepInfo || "Disparando eventos no Meta..."}
            </span>
            <span className="font-mono text-muted-foreground">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-primary/20" />
        </div>
      )}

      {/* Main Grid: Settings Left, Console Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Parameters + Primary Action Button */}
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
                Test Event Code <span className="text-[10px] opacity-60">(opcional para ver ao vivo)</span>
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
              <CountrySelectDropdown
                selectedCountries={selectedCountries}
                onChange={setSelectedCountries}
                disabled={isRunning}
              />
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
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                  <option value="ARS">ARS ($)</option>
                  <option value="CLP">CLP ($)</option>
                  <option value="COP">COP ($)</option>
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

            {/* Auto currency conversion toggle & preview */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-background/40 border border-border/50">
                <div className="space-y-0.5">
                  <div className="text-xs font-medium flex items-center gap-1.5">
                    <span>Converter para moeda local</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-mono">
                      Câmbio real
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {autoConvertCurrency
                      ? `Converte ${currency} ${valueFixed} para a moeda oficial do país sorteado (ex: EUA = USD, Europa = EUR, Colômbia = COP).`
                      : `Todos os países receberão o valor fixo em ${currency}.`}
                  </div>
                </div>
                <Switch
                  checked={autoConvertCurrency}
                  onCheckedChange={setAutoConvertCurrency}
                  disabled={isRunning}
                />
              </div>

              {autoConvertCurrency && selectedCountries.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-muted-foreground bg-muted/20 p-2 rounded-md border border-border/30">
                  <span className="text-muted-foreground/70">Prévia cambial:</span>
                  {selectedCountries.slice(0, 4).map((code) => {
                    const targetCurr = getCountryCurrency(code);
                    const sampleVal = convertCurrency(valueFixed, currency, targetCurr);
                    return (
                      <span key={code} className="px-1.5 py-0.5 rounded bg-background/60 border border-border/50 text-foreground">
                        {code}: {sampleVal.currency} {sampleVal.value.toLocaleString("pt-BR")}
                      </span>
                    );
                  })}
                  {selectedCountries.length > 4 && (
                    <span className="text-muted-foreground/50">+{selectedCountries.length - 4} países</span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Valor por compra {autoConvertCurrency ? `(${currency} base)` : `(${currency})`}
                </Label>
                <div className="flex items-center gap-1 p-0.5 rounded-lg border border-border bg-background/40">
                  <button
                    type="button"
                    onClick={() => setValueMode("fixed")}
                    className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                      valueMode === "fixed"
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Fixo
                  </button>
                  <button
                    type="button"
                    onClick={() => setValueMode("range")}
                    className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                      valueMode === "range"
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Faixa aleatória
                  </button>
                </div>
              </div>

              {valueMode === "fixed" ? (
                <div className="space-y-1">
                  <Input
                    type="number"
                    placeholder="Valor da compra (ex: 97)"
                    value={valueFixed}
                    onChange={(e) => setValueFixed(Number(e.target.value))}
                    disabled={isRunning}
                    className="h-8 text-xs bg-background/50 font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    Todas as compras serão enviadas com o valor exato de {currency} {valueFixed}.
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground block">Mínimo ({currency})</span>
                      <Input
                        type="number"
                        placeholder="Mínimo"
                        value={valueMin}
                        onChange={(e) => setValueMin(Number(e.target.value))}
                        disabled={isRunning}
                        className="h-8 text-xs bg-background/50 font-mono"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground block">Máximo ({currency})</span>
                      <Input
                        type="number"
                        placeholder="Máximo"
                        value={valueMax}
                        onChange={(e) => setValueMax(Number(e.target.value))}
                        disabled={isRunning}
                        className="h-8 text-xs bg-background/50 font-mono"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    Valores sorteados aleatoriamente entre {currency} {valueMin} e {currency} {valueMax}.
                  </span>
                </div>
              )}
            </div>
          </div>

                    {/* Box 3: Nicho & Segmentação do Produto */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Nicho & Segmentação
              </h2>
              <span className="text-[10px] text-primary/80 font-mono">content_category & name</span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Nicho / Categoria de Interesse</Label>
              <select
                value={nicheId}
                onChange={(e) => setNicheId(e.target.value)}
                disabled={isRunning}
                className="w-full h-8 rounded-md border border-border bg-background/50 px-2 text-xs focus:outline-none"
              >
                {NICHE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {nicheId === "custom" && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nome da Categoria Personalizada</Label>
                <Input
                  placeholder="Ex: Cripto, Pets, Imóveis, etc."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  disabled={isRunning}
                  className="h-8 text-xs bg-background/50"
                />
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Nome do Produto</Label>
                <span className="text-[10px] text-muted-foreground/60">(opcional — gera do nicho)</span>
              </div>
              <Input
                placeholder={`Ex: ${
                  NICHE_PRESETS.find((p) => p.id === nicheId)?.sampleProducts[0] || "Nome do produto..."
                }`}
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                disabled={isRunning}
                className="h-8 text-xs bg-background/50"
              />
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed">
              O Meta CAPI enviará estes dados em <code className="text-primary/90 font-mono">content_category</code> e{" "}
              <code className="text-primary/90 font-mono">content_name</code>, associando os compradores ao nicho do seu produto.
            </p>
          </div>

{/* Box 4: Estratégia */}
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
                <Label className="text-xs text-muted-foreground">Ciclos (Pessoas)</Label>
                <select
                  value={totalRounds}
                  onChange={(e) => setTotalRounds(Number(e.target.value))}
                  disabled={isRunning}
                  aria-label="Ciclos"
                  className="w-full h-8 rounded-md border border-border bg-background/50 px-2 text-xs focus:outline-none"
                >
                  <option value={10}>10 pessoas (~50 evts)</option>
                  <option value={25}>25 pessoas (~125 evts)</option>
                  <option value={50}>50 pessoas (~250 evts)</option>
                  <option value={100}>100 pessoas (~500 evts)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Delay entre disparos</Label>
                <select
                  value={delayMs}
                  onChange={(e) => setDelayMs(Number(e.target.value))}
                  disabled={isRunning}
                  aria-label="Delay"
                  className="w-full h-8 rounded-md border border-border bg-background/50 px-2 text-xs focus:outline-none"
                >
                  <option value={500}>0.5s (Rápido)</option>
                  <option value={1000}>1.0s (Normal)</option>
                  <option value={2000}>2.0s (Seguro)</option>
                  <option value={3000}>3.0s (Ultra)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <Label className="text-xs text-muted-foreground">Distribuição Temporal</Label>
              <select
                value={timeDistribution}
                onChange={(e) => setTimeDistribution(e.target.value as any)}
                disabled={isRunning}
                aria-label="Distribuição Temporal"
                className="w-full h-8 rounded-md border border-border bg-background/50 px-2 text-xs focus:outline-none"
              >
                <option value="7days">Últimos 7 dias (Retroativo inteligente)</option>
                <option value="3days">Últimos 3 dias (Retroativo)</option>
                <option value="realtime">Tempo Real (Hoje / Agora)</option>
              </select>
              <span className="text-[10px] text-muted-foreground block">
                {timeDistribution === "realtime"
                  ? "Eventos marcados com o horário exato de agora."
                  : "Distribui os eventos ao longo dos últimos dias para criar histórico orgânico natural."}
              </span>
            </div>
          </div>

          {/* Primary Action Button Box */}
          <div className="space-y-2 pt-1">
            {isRunning ? (
              <Button
                size="lg"
                variant="destructive"
                onClick={handlePause}
                className="w-full gap-2 text-sm font-semibold shadow-md h-11"
              >
                <Pause className="h-4 w-4" /> Pausar Aquecimento ({progressPercent}%)
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleStart}
                className="w-full gap-2 bg-primary text-primary-foreground hover:opacity-90 font-semibold shadow-md shadow-primary/20 h-11"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Iniciar Aquecimento ({totalCalculatedEvents} eventos)</span>
              </Button>
            )}

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestSingle}
                disabled={isRunning || isTestingSingle}
                className="flex-1 text-xs text-muted-foreground hover:text-foreground h-8 gap-1.5 border-border/80"
              >
                <Send className="h-3 w-3" />
                {isTestingSingle ? "Enviando teste..." : "Disparar 1 Teste Rápido"}
              </Button>
            </div>
          </div>
        </div>

        {/* Right column: Clean Minimalist Event Feed with internal scroll */}
        <div className="lg:col-span-7">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3 h-[640px] max-h-[640px] flex flex-col sticky top-6">
            <div className="flex items-center justify-between pb-2 border-b border-border/50 shrink-0">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Feed de Eventos
                </h2>
                <span className="text-[10px] text-muted-foreground/60 font-mono">
                  ({logs.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${isRunning ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/40"}`} />
                <span className="text-[11px] text-muted-foreground font-mono">
                  {isRunning ? "disparando" : "parado"}
                </span>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 font-mono text-[11px] pr-1.5">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground px-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                    <Flame className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-sm text-foreground font-medium">Pronto para aquecer</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Configure os parâmetros à esquerda e clique em <strong>Iniciar Aquecimento</strong> para elevar a nota do pixel ao máximo.
                  </p>

                  <div className="mt-4 p-3 rounded-lg border border-border/60 bg-background/50 text-[11px] text-left space-y-1.5 max-w-xs w-full">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Meta prevista:</span>
                      <span className="font-semibold text-emerald-400">EMQ 9.8 / 10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Volume previsto:</span>
                      <span className="font-mono text-foreground">{totalCalculatedEvents} eventos</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tempo estimado:</span>
                      <span className="font-mono text-foreground">~{Math.round((totalCalculatedEvents * delayMs) / 1000)}s</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestSingle}
                    disabled={isTestingSingle}
                    className="mt-4 text-xs gap-1.5"
                  >
                    <Send className="h-3 w-3" /> Testar 1 Evento Agora
                  </Button>
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
                        <span className="text-muted-foreground truncate max-w-[130px] hidden sm:inline">
                          {log.customerName}
                        </span>
                        {log.productName && (
                          <span className="text-muted-foreground/60 text-[10px] truncate max-w-[120px] hidden md:inline" title={log.productName}>
                            • {log.productName}
                          </span>
                        )}
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

      {/* Help Modal */}
      {showHelpModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowHelpModal(false)}
        >
          <div
            className="rounded-2xl border border-border bg-card p-6 max-w-lg w-full space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-base">Onde pegar o Token e Pixel ID?</h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <div className="p-3 rounded-xl border border-border/60 bg-background/50 space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-mono">1</span>
                  Acesse o Gerenciador de Eventos
                </div>
                <p className="pl-6">Abra o Meta Business Suite &gt; Gerenciador de Eventos e selecione o seu Pixel.</p>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-background/50 space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-mono">2</span>
                  Copie o Pixel ID
                </div>
                <p className="pl-6">Na aba <strong>Configurações</strong>, você verá o campo <strong>Identificação do Conjunto de Dados (Pixel ID)</strong>.</p>
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-background/50 space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-mono">3</span>
                  Gere o Access Token do CAPI
                </div>
                <p className="pl-6">
                  Ainda em <strong>Configurações</strong>, desça até a seção <strong>API de Conversões</strong> e clique no link azul <strong>"Gerar token de acesso"</strong>. Cole o token aqui no Pixel Feeder.
                </p>
              </div>
            </div>

            <Button
              className="w-full text-xs h-9 font-medium"
              onClick={() => setShowHelpModal(false)}
            >
              Entendi, vamos aquecer!
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
