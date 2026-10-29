import React, { useState, useEffect, useRef } from "react";
import {
  Flame,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Zap,
  Globe,
  Coins,
  Sliders,
  Terminal,
  KeyRound,
  Eye,
  EyeOff,
  Activity,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  LogEntry,
  PixelEventName,
  PixelFeederConfig,
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

const ALL_EVENTS: { name: PixelEventName; label: string; desc: string }[] = [
  { name: "PageView", label: "PageView", desc: "Visualização de página" },
  { name: "ViewContent", label: "ViewContent", desc: "Visualização do produto" },
  { name: "AddToCart", label: "AddToCart", desc: "Adição ao carrinho" },
  { name: "InitiateCheckout", label: "InitiateCheckout", desc: "Início do checkout" },
  { name: "Purchase", label: "Purchase", desc: "Compra confirmada com valor" },
  { name: "Lead", label: "Lead", desc: "Cadastro de lead / formulário" },
  { name: "AddPaymentInfo", label: "AddPaymentInfo", desc: "Inserção de dados de pagamento" },
  { name: "CompleteRegistration", label: "CompleteRegistration", desc: "Registro completo" },
];

const STORAGE_KEY = "nebula_pixel_feeder_config";

export function PixelFeederView() {
  // Config state
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

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState({
    sent: 0,
    success: 0,
    error: 0,
  });

  const isRunningRef = useRef(false);
  isRunningRef.current = isRunning;

  // Load saved credentials
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
    } catch (e) {
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
      toast.success("Configurações salvas no seu navegador!");
    } catch {
      toast.error("Erro ao salvar configurações.");
    }
  };

  const toggleCountry = (code: SupportedCountry) => {
    if (selectedCountries.includes(code)) {
      if (selectedCountries.length === 1) {
        toast.info("Selecione pelo menos um país.");
        return;
      }
      setSelectedCountries(selectedCountries.filter((c) => c !== code));
    } else {
      const next = [...selectedCountries, code];
      setSelectedCountries(next);
      // Auto-adapt currency if single country selected
      if (next.length === 1) {
        const match = ALL_COUNTRIES.find((c) => c.code === code);
        if (match) setCurrency(match.defaultCurrency);
      }
    }
  };

  const toggleEvent = (eventName: PixelEventName) => {
    if (selectedEvents.includes(eventName)) {
      if (selectedEvents.length === 1) {
        toast.info("Selecione pelo menos um evento.");
        return;
      }
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
      toast.error("Preencha o Pixel ID da Meta.");
      return;
    }
    if (!accessToken.trim()) {
      toast.error("Preencha o Access Token do Conversions API (CAPI).");
      return;
    }
    if (selectedCountries.length === 0) {
      toast.error("Selecione pelo menos um país de destino.");
      return;
    }

    saveCredentials();
    setIsRunning(true);
    isRunningRef.current = true;
    toast.success("Aquecimento iniciado! Acompanhe o feed de eventos.");

    // Execution loop
    let localSent = stats.sent;
    let localSuccess = stats.success;
    let localError = stats.error;

    const totalSteps = totalRounds;

    for (let round = 1; round <= totalRounds; round++) {
      if (!isRunningRef.current) break;

      // Random country among selected
      const pickedCountry =
        selectedCountries[Math.floor(Math.random() * selectedCountries.length)];

      // Generate realistic persona
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
          timestamp: new Date().toLocaleTimeString(),
          eventName: evtName,
          status: "sending",
          country: pickedCountry,
          currency,
          value: evtName === "Purchase" || evtName === "AddToCart" ? orderValue : undefined,
          customerName: `${customer.firstName} ${customer.lastName}`,
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
        setStats({
          sent: localSent,
          success: localSuccess,
          error: localError,
        });

        // Delay between events
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      setCurrentProgress(Math.round((round / totalSteps) * 100));
    }

    setIsRunning(false);
    isRunningRef.current = false;
    toast.info("Ciclo de aquecimento finalizado.");
  };

  const handlePause = () => {
    setIsRunning(false);
    isRunningRef.current = false;
    toast.warning("Aquecimento pausado.");
  };

  const handleReset = () => {
    setIsRunning(false);
    isRunningRef.current = false;
    setCurrentProgress(0);
    setLogs([]);
    setStats({ sent: 0, success: 0, error: 0 });
    toast.info("Logs e estatísticas zeradas.");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 animate-fade-up pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 via-primary/20 to-orange-500/10 border border-primary/30 text-primary shadow-inner">
              <Flame className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight">Pixel Feeder</h1>
                <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-0.5">
                  Meta CAPI 9.8+ EMQ
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Aquecedor inteligente de Pixel Meta com hashing SHA-256 oficial, personas geolocalizadas e sessões de funil completas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button
              variant="destructive"
              onClick={handlePause}
              className="gap-2 font-medium shadow-md"
            >
              <Pause className="h-4 w-4" /> Pausar Aquecimento
            </Button>
          ) : (
            <Button
              onClick={handleStart}
              className="gap-2 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20"
            >
              <Play className="h-4 w-4 fill-current" /> Iniciar Aquecimento
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isRunning}
            className="gap-1.5"
            title="Resetar contadores e logs"
          >
            <RotateCcw className="h-4 w-4" /> Limpar
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total Enviados</p>
              <h3 className="text-2xl font-bold mt-1">{stats.sent}</h3>
            </div>
            <Activity className="h-7 w-7 text-primary/60" />
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-emerald-500/80 font-medium">Sucessos (200)</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-500">{stats.success}</h3>
            </div>
            <CheckCircle2 className="h-7 w-7 text-emerald-500/60" />
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-rose-500/80 font-medium">Erros / Rejeições</p>
              <h3 className="text-2xl font-bold mt-1 text-rose-500">{stats.error}</h3>
            </div>
            <XCircle className="h-7 w-7 text-rose-500/60" />
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-sm border-primary/20 bg-primary/5">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-primary font-medium">EMQ Score Estimado</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-primary">9.8</span>
                <span className="text-xs text-muted-foreground font-medium">/ 10.0</span>
              </div>
            </div>
            <ShieldCheck className="h-7 w-7 text-primary" />
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4 animate-fade-in">
          <div className="flex justify-between text-xs font-medium">
            <span className="flex items-center gap-1.5 text-primary">
              <Zap className="h-3.5 w-3.5 animate-spin" /> Processando disparos de alta correspondência...
            </span>
            <span className="text-muted-foreground">{currentProgress}% concluído</span>
          </div>
          <Progress value={currentProgress} className="h-2 bg-primary/20" />
        </div>
      )}

      {/* Main Grid: Form Left, Console Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Config */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Credenciais */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" /> Credenciais da Meta Graph API
              </CardTitle>
              <CardDescription>
                Pegue no Gerenciador de Eventos &gt; Configurações do seu Pixel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pixel-id" className="text-xs">Pixel ID <span className="text-rose-500">*</span></Label>
                <Input
                  id="pixel-id"
                  placeholder="Ex: 123456789012345"
                  value={pixelId}
                  onChange={(e) => setPixelId(e.target.value)}
                  disabled={isRunning}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="capi-token" className="text-xs">
                    Access Token (CAPI) <span className="text-rose-500">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {showToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showToken ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <Input
                  id="capi-token"
                  type={showToken ? "text" : "password"}
                  placeholder="EAAG..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  disabled={isRunning}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="test-code" className="text-xs">
                    Código de Teste (Opcional)
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Aba Eventos de Teste</span>
                </div>
                <Input
                  id="test-code"
                  placeholder="Ex: TEST12345"
                  value={testEventCode}
                  onChange={(e) => setTestEventCode(e.target.value)}
                  disabled={isRunning}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={saveCredentials}
                disabled={isRunning}
              >
                Salvar Credenciais no Navegador
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: Países & Gênero */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" /> Segmentação Geográfica & Gênero
              </CardTitle>
              <CardDescription>
                Selecione um ou múltiplos países. Nomes, CEPs, DDDs e IPs serão adaptados automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">País(es) de Destino ({selectedCountries.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {ALL_COUNTRIES.map((c) => {
                    const active = selectedCountries.includes(c.code);
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => toggleCountry(c.code)}
                        disabled={isRunning}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                          active
                            ? "bg-primary/15 border-primary text-primary shadow-sm"
                            : "bg-muted/30 border-border text-muted-foreground hover:border-foreground/30"
                        }`}
                      >
                        <span>{c.flag}</span>
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Gênero das Personas</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "all", label: "Misto / Ambos" },
                    { id: "female", label: "Feminino" },
                    { id: "male", label: "Masculino" },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGender(g.id as any)}
                      disabled={isRunning}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium text-center transition-all ${
                        gender === g.id
                          ? "bg-primary/15 border-primary text-primary"
                          : "bg-muted/30 border-border text-muted-foreground hover:border-foreground/30"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Valor & Moeda */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" /> Valor & Moeda da Compra
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Moeda</Label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                    disabled={isRunning}
                    aria-label="Moeda"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="BRL">BRL (R$ - Real)</option>
                    <option value="USD">USD ($ - Dólar)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="GBP">GBP (£ - Libra)</option>
                    <option value="MXN">MXN ($ - Peso MX)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Comportamento de Valor</Label>
                  <select
                    value={valueMode}
                    onChange={(e) => setValueMode(e.target.value as any)}
                    disabled={isRunning}
                    aria-label="Comportamento de Valor"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="range">Faixa Aleatória (Min - Max)</option>
                    <option value="fixed">Valor Fixo</option>
                  </select>
                </div>
              </div>

              {valueMode === "fixed" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor por Evento ({currency})</Label>
                  <Input
                    type="number"
                    value={valueFixed}
                    onChange={(e) => setValueFixed(Number(e.target.value))}
                    disabled={isRunning}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor Mínimo ({currency})</Label>
                    <Input
                      type="number"
                      value={valueMin}
                      onChange={(e) => setValueMin(Number(e.target.value))}
                      disabled={isRunning}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor Máximo ({currency})</Label>
                    <Input
                      type="number"
                      value={valueMax}
                      onChange={(e) => setValueMax(Number(e.target.value))}
                      disabled={isRunning}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 4: Estratégia de Disparo */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" /> Estratégia & Automação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Funnel simulation toggle */}
              <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-primary">
                    <Sparkles className="h-3.5 w-3.5" /> Modo Funil Completo (Recomendado)
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Simula a jornada orgânica completa conectada pelo mesmo cookie:
                    <span className="block font-medium text-foreground mt-0.5">
                      PageView → ViewContent → AddToCart → Checkout → Purchase
                    </span>
                  </p>
                </div>
                <Switch
                  checked={simulateFunnel}
                  onCheckedChange={setSimulateFunnel}
                  disabled={isRunning}
                />
              </div>

              {!simulateFunnel && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Eventos Avulsos</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_EVENTS.map((e) => {
                      const checked = selectedEvents.includes(e.name);
                      return (
                        <button
                          key={e.name}
                          type="button"
                          onClick={() => toggleEvent(e.name)}
                          disabled={isRunning}
                          className={`p-2 rounded-lg border text-left text-xs transition-all ${
                            checked
                              ? "bg-primary/10 border-primary text-foreground font-medium"
                              : "bg-muted/20 border-border text-muted-foreground"
                          }`}
                        >
                          <div className="font-semibold">{e.label}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{e.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Ciclos / Pessoas ({totalRounds})</Label>
                  <select
                    value={totalRounds}
                    onChange={(e) => setTotalRounds(Number(e.target.value))}
                    disabled={isRunning}
                    aria-label="Ciclos ou Pessoas"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value={10}>10 ciclos</option>
                    <option value={25}>25 ciclos</option>
                    <option value={50}>50 ciclos</option>
                    <option value={100}>100 ciclos</option>
                    <option value={200}>200 ciclos</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Intervalo entre Disparos</Label>
                  <select
                    value={delayMs}
                    onChange={(e) => setDelayMs(Number(e.target.value))}
                    disabled={isRunning}
                    aria-label="Intervalo entre Disparos"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value={500}>500 ms (Rápido)</option>
                    <option value={1000}>1 segundo (Normal)</option>
                    <option value={2000}>2 segundos (Seguro)</option>
                    <option value={3000}>3 segundos (Orgânico)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Console / Live Logs */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-border/80 shadow-sm flex flex-col h-[750px]">
            <CardHeader className="py-3 px-5 border-b border-border/60 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">Feed de Eventos em Tempo Real</CardTitle>
                <Badge variant="secondary" className="text-[10px] py-0 px-2 font-mono">
                  {logs.length} registros
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isRunning ? "bg-emerald-400" : "bg-muted-foreground"
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isRunning ? "bg-emerald-500" : "bg-muted-foreground/60"
                    }`}
                  />
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {isRunning ? "Disparando..." : "Standby"}
                </span>
              </div>
            </CardHeader>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 font-mono text-xs">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                  <Layers className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="font-sans font-medium text-sm text-foreground">
                    Nenhum evento disparado ainda
                  </p>
                  <p className="font-sans text-xs max-w-sm mt-1">
                    Configure seu Pixel ID e Access Token à esquerda e clique em{" "}
                    <strong className="text-primary">Iniciar Aquecimento</strong> para começar a alimentar o algoritmo.
                  </p>
                </div>
              ) : (
                logs.map((log) => {
                  const isSuccess = log.status === "success";
                  const isError = log.status === "error";
                  const isSending = log.status === "sending";

                  return (
                    <div
                      key={log.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isSuccess
                          ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-100"
                          : isError
                          ? "bg-rose-950/25 border-rose-500/40 text-rose-200"
                          : "bg-muted/30 border-border text-muted-foreground animate-pulse"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">{log.timestamp}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 font-bold ${
                              log.eventName === "Purchase"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                : log.eventName === "InitiateCheckout"
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                                : log.eventName === "AddToCart"
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                : "bg-muted text-foreground border-border"
                            }`}
                          >
                            {log.eventName}
                          </Badge>
                          <span className="font-semibold text-foreground">{log.customerName}</span>
                          <span className="text-[10px] text-muted-foreground">({log.country})</span>
                        </div>

                        <div className="flex items-center gap-2 text-right">
                          {log.value !== undefined && (
                            <span className="font-bold text-foreground">
                              {log.currency} {log.value.toFixed(2)}
                            </span>
                          )}
                          {isSuccess && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                              200 OK
                            </Badge>
                          )}
                          {isError && (
                            <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/40 text-[10px]">
                              Erro {log.httpCode || "CORS/Rede"}
                            </Badge>
                          )}
                          {isSending && (
                            <span className="text-[10px] text-amber-400">Enviando...</span>
                          )}
                        </div>
                      </div>

                      {/* Detail row */}
                      <div className="mt-2 pt-2 border-t border-border/30 flex flex-wrap items-center justify-between text-[11px] text-muted-foreground">
                        <span className="truncate max-w-[280px]">evt_id: {log.eventId}</span>
                        {log.fbtraceId && (
                          <span className="text-[10px] text-muted-foreground/80">
                            trace: {log.fbtraceId}
                          </span>
                        )}
                        <span className="text-emerald-400/90 font-medium">
                          EMQ Est.: {log.matchScoreEstimate}/10
                        </span>
                      </div>

                      {log.responseMessage && (
                        <div className="mt-1.5 text-[11px] text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-800/40">
                          {log.responseMessage}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
