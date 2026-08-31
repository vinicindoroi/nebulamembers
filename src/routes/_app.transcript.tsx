import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  Upload, RefreshCw, Eye, Copy, Trash2, Loader2, FileText, Download,
  CheckCircle2, AlertTriangle, Clock, Globe, Sparkles, Mic, Wand2, Zap,
  TrendingUp, TrendingDown, Hash, AlignLeft, Layers
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { analyzeCreativeCopyFn, transcribeAudioFn } from "@/lib/ai/functions";

export const Route = createFileRoute("/_app/transcript")({ component: Page });

const TRANSCRIPTION_COST = 20;

type ResultTab = "texto" | "analise" | "metricas";

interface StructureBlock {
  block: string;
  excerpt: string;
  purpose: string;
}

interface TranscriptionPayload {
  file_url?: string;
  model?: string;
  file_name?: string;
  text?: string;
  language?: string;
  duration_seconds?: number;
  word_count?: number;
  char_count?: number;
  confidence?: number;
  strengths?: string[];
  weaknesses?: string[];
  structure?: StructureBlock[];
  formula?: string;
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function langLabel(code: string): string {
  const map: Record<string, string> = {
    pt: "Português", portuguese: "Português", en: "English", english: "English",
    es: "Español", spanish: "Español", fr: "Français", french: "Français",
    de: "Deutsch", german: "Deutsch", it: "Italiano", italian: "Italiano",
    ja: "日本語", japanese: "日本語", ko: "한국어", korean: "한국어",
    zh: "中文", chinese: "中文", unknown: "Detectando...",
  };
  return map[code?.toLowerCase()] || code || "—";
}

/* ── Radial Gauge ── */
function ConfidenceGauge({ value }: { value: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(value, 0), 100);
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 75 ? "hsl(var(--primary))" : pct >= 50 ? "hsl(45 100% 60%)" : "hsl(var(--destructive))";

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="8" opacity="0.3" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white tracking-tight">{pct}</span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-bold">Score</span>
      </div>
    </div>
  );
}

/* ── Stat Pill ── */
function StatPill({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm px-4 py-3 transition-all hover:bg-card/80">
      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{label}</p>
        <p className="text-lg font-bold text-white truncate">{value}</p>
      </div>
    </div>
  );
}


function Page() {
  const { user } = useAuth();

  const [file, setFile] = useState<File | null>(null);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lastResult, setLastResult] = useState<TranscriptionPayload | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>("texto");
  const [history, setHistory] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadHistory = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "transcription")
        .order("created_at", { ascending: false })
        .limit(30);

      if (!error && data) {
        setHistory(data);
      } else {
        const cached = localStorage.getItem(`nebula_transcriptions_${user.id}`);
        if (cached) setHistory(JSON.parse(cached));
      }
    } catch (_) {
      const cached = localStorage.getItem(`nebula_transcriptions_${user.id}`);
      if (cached) setHistory(JSON.parse(cached));
    }
  };

  useEffect(() => { loadHistory(); }, [user]);

  const saveToHistory = async (payload: TranscriptionPayload) => {
    if (!user) return;
    const newGen = {
      id: crypto.randomUUID(),
      user_id: user.id,
      type: "transcription",
      model_id: "universal",
      status: "completed",
      credits_used: TRANSCRIPTION_COST,
      payload,
      created_at: new Date().toISOString()
    };
    try { await supabase.from("generations").insert(newGen as any); } catch (_) {}
    const updated = [newGen, ...history];
    setHistory(updated);
    localStorage.setItem(`nebula_transcriptions_${user.id}`, JSON.stringify(updated));
  };

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("audio/") && !f.type.startsWith("video/")) {
      toast.error("Formato não suportado. Use MP3, WAV, MP4 ou similares.");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Limite de 25MB.");
      return;
    }
    setFile(f);
    setInputText("");
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleTranscribeAndAnalyze = async () => {
    if (!user) return;

    let textToAnalyze = inputText.trim();
    let detectedLanguage = "pt";
    let detectedDuration = 0;
    const currentFile = file;

    if (currentFile) {
      setIsProcessing(true);
      setLastResult(null);
      toast.info("Fazendo upload e transcrevendo com Whisper AI...");

      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(currentFile);
        });

        const transcriptionRes = await transcribeAudioFn({
          data: { base64Data, mimeType: currentFile.type, fileName: currentFile.name },
        });

        if (!transcriptionRes.success || !transcriptionRes.text) {
          throw new Error(transcriptionRes.error || "Falha ao transcrever o áudio.");
        }

        textToAnalyze = transcriptionRes.text;
        detectedLanguage = transcriptionRes.language || "pt";
        detectedDuration = Math.round(transcriptionRes.duration || 0);
        toast.info("Transcrição concluída! Analisando copy com IA...");
      } catch (err: any) {
        toast.error(err.message || "Erro ao transcrever o arquivo.");
        setIsProcessing(false);
        return;
      }
    }

    if (!textToAnalyze) {
      toast.error("Por favor, digite uma copy ou selecione um arquivo.");
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    setLastResult(null);
    setActiveTab("texto");

    try {
      const res = await analyzeCreativeCopyFn({ data: { text: textToAnalyze } });

      if (!res.success || !res.analysis) throw new Error(res.error || "Falha ao auditar copy.");

      const analysis = res.analysis;
      const payload: TranscriptionPayload = {
        file_name: currentFile ? currentFile.name : "Análise Direta de Roteiro",
        text: textToAnalyze,
        language: detectedLanguage,
        duration_seconds: detectedDuration,
        word_count: textToAnalyze.split(/\s+/).filter(Boolean).length,
        char_count: textToAnalyze.length,
        confidence: analysis.confidence,
        strengths: analysis.strengths,
        weaknesses: analysis.weaknesses,
        structure: analysis.structure,
        formula: analysis.formula,
      };

      setLastResult(payload);
      await saveToHistory(payload);
      toast.success("Transcrição & Análise de Copy concluída!");
      setFile(null);
      setInputText("");
    } catch (err: any) {
      toast.error(err.message || "Erro durante o processamento da IA.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReanalyze = async () => {
    if (!currentResult?.text || !user || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const res = await analyzeCreativeCopyFn({ data: { text: currentResult.text } });
      if (!res.success || !res.analysis) throw new Error(res.error);
      const updated = {
        ...currentResult,
        confidence: res.analysis.confidence,
        strengths: res.analysis.strengths,
        weaknesses: res.analysis.weaknesses,
        structure: res.analysis.structure,
        formula: res.analysis.formula,
      };
      setLastResult(updated);
      toast.success("Análise atualizada!");
    } catch (err: any) {
      toast.error("Erro ao reanalisar copy.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try { await supabase.from("generations").delete().eq("id", id as any); } catch (_) {}
    const updated = history.filter((g) => g.id !== id);
    setHistory(updated);
    if (user) localStorage.setItem(`nebula_transcriptions_${user.id}`, JSON.stringify(updated));
    toast.success("Análise apagada");
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Texto copiado!");
  };

  const handleDownload = (text: string, name?: string) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name ? `${name}.txt` : "copy_transcrita.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo baixado!");
  };

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Agora";
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const getPayload = (gen: any): TranscriptionPayload | null => {
    if (!gen?.payload) return null;
    try { return typeof gen.payload === "string" ? JSON.parse(gen.payload) : gen.payload; }
    catch (_) { return null; }
  };

  const firstCompleted = useMemo(() => {
    const c = history.find(h => h.status === "completed" && getPayload(h));
    return c ? getPayload(c) : null;
  }, [history]);

  const currentResult = lastResult || firstCompleted;

  const wordCount = useMemo(() =>
    currentResult?.word_count ?? currentResult?.text?.trim().split(/\s+/).filter(Boolean).length ?? 0,
    [currentResult]
  );
  const charCount = useMemo(() =>
    currentResult?.char_count ?? currentResult?.text?.length ?? 0,
    [currentResult]
  );

  const resultTabs: { key: ResultTab; label: string; icon: any }[] = [
    { key: "texto", label: "Texto", icon: AlignLeft },
    { key: "analise", label: "Análise IA", icon: Wand2 },
    { key: "metricas", label: "Métricas", icon: Zap },
  ];

  return (
    <div className="relative flex flex-col lg:h-[calc(100vh-64px)] lg:overflow-hidden">
      {/* ─── Header ─── */}
      <div className="p-4 md:p-6 lg:p-8 pb-0 shrink-0 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shadow-[0_0_24px_-4px_hsl(var(--primary)/0.4)]">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary animate-pulse border-2 border-background" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Nebula <span className="text-gradient">Transcript</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Transcrição inteligente com análise de copywriting por IA</p>
          </div>
        </div>
      </div>

      {/* ─── Scrollable Content ─── */}
      <div className="flex-1 lg:min-h-0 overflow-y-auto px-4 md:px-6 lg:px-8 py-6 max-w-[1440px] mx-auto w-full">

        {/* ─── Top Section: Upload + Controls ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,1fr] gap-4 mb-8">
          {/* Upload Area */}
          <div>
            <input ref={inputRef} type="file" accept="audio/*,video/*" className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)} />

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => !file && inputRef.current?.click()}
              className={cn(
                "h-full min-h-[180px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all duration-300 cursor-pointer relative overflow-hidden",
                isDragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border/40 hover:border-primary/30 hover:bg-card/40",
                file && "border-primary/30 bg-primary/5"
              )}
            >
              {file ? (
                <div className="flex flex-col items-center gap-2 p-6 animate-fade-up">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <FileText className="h-7 w-7 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-white">{file.name}</span>
                  <span className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="mt-1 text-xs text-muted-foreground hover:text-destructive underline transition cursor-pointer">Remover</button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 p-6">
                  <div className="h-14 w-14 rounded-2xl border border-border/40 bg-card/50 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">Arraste um arquivo de áudio ou vídeo</span>
                  <span className="text-[11px] text-muted-foreground/40">MP3 · WAV · MP4 · até 25MB</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Textarea + Model + Submit */}
          <div className="flex flex-col gap-4">
            {/* Paste Script */}
            <div className="flex flex-col flex-1">
              <textarea
                value={inputText}
                onChange={(e) => { setInputText(e.target.value); if (file) setFile(null); }}
                placeholder="Ou cole o roteiro/copy do seu anúncio aqui para auditar com IA..."
                className="flex-1 min-h-[90px] w-full rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-4 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40 resize-none text-white leading-relaxed transition-all"
              />
            </div>

            {/* Submit */}
            <button onClick={handleTranscribeAndAnalyze}
              disabled={isProcessing || (!file && !inputText.trim())}
              className={cn(
                "min-h-[56px] rounded-2xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer",
                isProcessing || (!file && !inputText.trim())
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "gradient-primary text-primary-foreground hover:opacity-90 shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.4)]"
              )}>
              {isProcessing
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Processando com IA...</>
                : <><Sparkles className="h-4 w-4" /> Transcrever & Analisar</>
              }
            </button>

            {/* Credits Info */}
            <p className="text-[11px] text-muted-foreground/50 text-center">
              Custo: {TRANSCRIPTION_COST} créditos · Análise avançada com GPT-4o
            </p>
          </div>
        </div>

        {/* ─── Result Section ─── */}
        {currentResult?.text && (
          <div className="mb-8 animate-fade-up">
            {/* Tab Navigation */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-1 rounded-xl border border-border/30 bg-card/40 p-1">
                {resultTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer",
                      activeTab === tab.key
                        ? "bg-primary/15 text-primary shadow-sm"
                        : "text-muted-foreground hover:text-white hover:bg-muted/50"
                    )}>
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => handleCopy(currentResult.text!)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/30 text-[11px] font-medium text-muted-foreground hover:text-white hover:bg-muted/50 transition cursor-pointer">
                  <Copy className="h-3 w-3" /> Copiar
                </button>
                <button onClick={() => handleDownload(currentResult.text!)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/30 text-[11px] font-medium text-muted-foreground hover:text-white hover:bg-muted/50 transition cursor-pointer">
                  <Download className="h-3 w-3" /> .txt
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === "texto" && (
              <div className="rounded-2xl border border-border/30 bg-card/40 backdrop-blur-sm p-6 relative overflow-hidden animate-fade-up">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary via-primary/50 to-transparent rounded-l-2xl" />
                <p className="text-sm text-white/90 whitespace-pre-wrap leading-[1.8] pl-4 selection:bg-primary/20">{currentResult.text}</p>
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/20 pl-4">
                  <span className="text-[11px] text-muted-foreground/60">
                    {langLabel(currentResult.language || "")} · {formatDuration(currentResult.duration_seconds)} · {wordCount} palavras
                  </span>
                </div>
              </div>
            )}

            {activeTab === "analise" && (
              <div className="space-y-4 animate-fade-up">
                {(!currentResult.confidence && !(currentResult.strengths?.length) && !(currentResult.structure?.length)) ? (
                  <div className="rounded-2xl border border-border/30 bg-card/40 p-10 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Wand2 className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white mb-1">Análise não disponível</h3>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        Esta transcrição foi feita antes do recurso de análise. Clique abaixo para analisar a copy com IA.
                      </p>
                    </div>
                    <button
                      onClick={handleReanalyze}
                      disabled={isAnalyzing}
                      className="px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition disabled:opacity-50 cursor-pointer">
                      {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin" /> Analisando...</> : <><Wand2 className="h-4 w-4" /> Analisar Copy Agora</>}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-[200px,1fr] gap-6">
                      {/* Confidence Gauge */}
                      <div className="rounded-2xl border border-border/30 bg-card/40 p-6 flex flex-col items-center justify-center">
                        <ConfidenceGauge value={currentResult.confidence ?? 0} />
                        <p className="text-xs text-muted-foreground mt-2 text-center">Qualidade da Copy</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Strengths */}
                        {(currentResult.strengths?.length ?? 0) > 0 && (
                          <div className="rounded-2xl border border-primary/15 bg-primary/[0.03] p-5 space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-white block">Por que funciona</span>
                                <span className="text-[10px] text-muted-foreground">Pontos fortes da sua copy</span>
                              </div>
                            </div>
                            <ul className="space-y-2.5">
                              {currentResult.strengths!.map((s, i) => (
                                <li key={i} className="flex items-start gap-2.5 text-xs text-white/80 leading-relaxed">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Weaknesses */}
                        {(currentResult.weaknesses?.length ?? 0) > 0 && (
                          <div className="rounded-2xl border border-border/30 bg-card/30 p-5 space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-white block">O que melhorar</span>
                                <span className="text-[10px] text-muted-foreground">Oportunidades de otimização</span>
                              </div>
                            </div>
                            <ul className="space-y-2.5">
                              {currentResult.weaknesses!.map((w, i) => (
                                <li key={i} className="flex items-start gap-2.5 text-xs text-white/70 leading-relaxed">
                                  <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                  <span>{w}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Estrutura Invisível */}
                    {(currentResult.structure?.length ?? 0) > 0 && (
                      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent p-5 space-y-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                              <Layers className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-white">Estrutura Invisível</h3>
                              <p className="text-[10px] text-muted-foreground">A anatomia da copy — para você replicar em outros vídeos</p>
                            </div>
                          </div>
                          {currentResult.formula && (
                            <div className="text-[10px] text-muted-foreground max-w-md text-right">
                              <span className="uppercase tracking-wider font-semibold text-primary/80">Framework: </span>
                              {currentResult.formula}
                            </div>
                          )}
                        </div>

                        <ol className="space-y-3">
                          {currentResult.structure!.map((b, i) => (
                            <li key={i} className="relative pl-10">
                              <div className="absolute left-0 top-0 h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[11px] font-bold text-primary">
                                {i + 1}
                              </div>
                              <div className="rounded-xl border border-border/30 bg-card/50 p-3 space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">{b.block}</span>
                                  {b.purpose && <span className="text-[10px] text-muted-foreground">· {b.purpose}</span>}
                                </div>
                                <p className="text-xs text-white/85 italic leading-relaxed border-l-2 border-primary/30 pl-2.5">
                                  "{b.excerpt}"
                                </p>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Re-analisar */}
                    <div className="flex justify-end">
                      <button
                        onClick={handleReanalyze}
                        disabled={isAnalyzing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/30 text-[11px] font-medium text-muted-foreground hover:text-white hover:bg-muted/50 transition disabled:opacity-50 cursor-pointer">
                        {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Re-analisar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "metricas" && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-up">
                <StatPill icon={AlignLeft} label="Palavras" value={wordCount} />
                <StatPill icon={Hash} label="Caracteres" value={charCount} />
                <StatPill icon={Clock} label="Duração" value={formatDuration(currentResult.duration_seconds)} />
                <StatPill icon={Globe} label="Idioma" value={langLabel(currentResult.language || "")} />
              </div>
            )}
          </div>
        )}

        {/* ─── History Section ─── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Transcrições Anteriores
            </h2>
            <button onClick={loadHistory} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-muted-foreground hover:text-white hover:bg-muted/50 transition font-medium cursor-pointer">
              <RefreshCw className="h-3 w-3" /> Atualizar
            </button>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-16">
              <Mic className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground/60">Nenhuma transcrição realizada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {history.map((gen: any, idx: number) => {
                const p = getPayload(gen);
                if (!p) return null;
                const isCompleted = gen.status === "completed";
                const isError = gen.status === "error" || gen.status === "failed";
                const text = p.text || "";
                const isActive = currentResult?.text === p.text;

                return (
                  <div
                    key={gen.id}
                    style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                    onClick={() => { setLastResult(p); setActiveTab("texto"); }}
                    className={cn(
                      "group rounded-2xl border bg-card/30 hover:bg-card/60 transition-all overflow-hidden cursor-pointer",
                      isActive ? "border-primary/30" : isError ? "border-destructive/20" : "border-border/30"
                    )}
                  >
                    {/* Card Header */}
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          isCompleted ? "bg-primary" : isError ? "bg-destructive" : "bg-amber-500 animate-pulse"
                        )} />
                        <span className="text-xs font-medium text-white truncate">
                          {p.file_name || "Transcrição"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground/60">{timeAgo(gen.created_at)}</span>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(gen.id); }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all cursor-pointer">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Preview Text */}
                    {text && (
                      <div className="px-4 pb-3">
                        <p className="text-[11px] text-muted-foreground/70 leading-relaxed line-clamp-3">{text}</p>
                      </div>
                    )}

                    {/* Mini Stats */}
                    {isCompleted && (
                      <div className="px-4 pb-2 flex items-center gap-3 text-[10px] text-muted-foreground/50">
                        <span>{langLabel(p.language || "")}</span>
                        {p.duration_seconds ? <span>· {formatDuration(p.duration_seconds)}</span> : null}
                        {p.confidence ? <span className="font-semibold text-primary">· {p.confidence}%</span> : null}
                      </div>
                    )}

                    {/* Actions */}
                    {text && (
                      <div className="flex border-t border-border/20">
                        <button onClick={(e) => { e.stopPropagation(); setLastResult(p); setActiveTab("texto"); }}
                          className="flex-1 py-2 text-[11px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition flex items-center justify-center gap-1 cursor-pointer">
                          <Eye className="h-3 w-3" /> Ver
                        </button>
                        <div className="w-px bg-border/20" />
                        <button onClick={(e) => { e.stopPropagation(); handleCopy(text); }}
                          className="flex-1 py-2 text-[11px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition flex items-center justify-center gap-1 cursor-pointer">
                          <Copy className="h-3 w-3" /> Copiar
                        </button>
                        <div className="w-px bg-border/20" />
                        <button onClick={(e) => { e.stopPropagation(); handleDownload(text, p.file_name); }}
                          className="py-2 px-3 text-[11px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition flex items-center justify-center cursor-pointer">
                          <Download className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
