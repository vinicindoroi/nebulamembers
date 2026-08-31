import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Play, Palette, Shield, BookOpen, Save, Eye, Monitor,
  Type, Image, Droplets, Lock, Gauge, Bookmark, StickyNote,
  SkipForward, RotateCcw, Maximize,
} from "lucide-react";
import { toast } from "sonner";
import { Field, inputClass } from "@/components/admin/Modal";
import { usePlayerSettings, useUpdatePlayerSettings, type PlayerSettings } from "@/hooks/use-player-settings";

export const Route = createFileRoute("/admin/player")({ component: Page });

type Tab = "branding" | "protection" | "features";

function Page() {
  const { data: saved, isLoading } = usePlayerSettings();
  const update = useUpdatePlayerSettings();
  const [tab, setTab] = useState<Tab>("branding");
  const [s, setS] = useState<Partial<PlayerSettings>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (saved) setS(saved);
  }, [saved]);

  const patch = (changes: Partial<PlayerSettings>) => {
    setS((prev) => ({ ...prev, ...changes }));
    setDirty(true);
  };

  const save = async () => {
    try {
      const { id, ...rest } = s as PlayerSettings;
      await update.mutateAsync(rest);
      setDirty(false);
      toast.success("Configurações do player salvas");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando configurações...</div>;
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof Palette }> = [
    { id: "branding", label: "Visual", icon: Palette },
    { id: "protection", label: "Proteção", icon: Shield },
    { id: "features", label: "Funcionalidades", icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Player de Vídeo</h1>
          <p className="text-sm text-muted-foreground mt-1">Personalize a aparência e comportamento do player.</p>
        </div>
        <button
          onClick={save}
          disabled={!dirty || update.isPending}
          className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm flex items-center gap-2 disabled:opacity-40 shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)]"
        >
          <Save className="h-4 w-4" />{update.isPending ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Tabs */}
        <aside className="lg:w-56 shrink-0">
          <nav className="rounded-2xl border border-white/5 bg-white/[0.02] p-2 space-y-0.5">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition ${
                    active
                      ? "bg-gradient-to-r from-primary/15 via-primary/5 to-transparent text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-6">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 max-w-2xl space-y-5">
            {tab === "branding" && <BrandingTab s={s} patch={patch} />}
            {tab === "protection" && <ProtectionTab s={s} patch={patch} />}
            {tab === "features" && <FeaturesTab s={s} patch={patch} />}
          </div>

          {/* Preview */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Preview do Player</span>
            </div>
            <PlayerPreview settings={s as PlayerSettings} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandingTab({ s, patch }: { s: Partial<PlayerSettings>; patch: (c: Partial<PlayerSettings>) => void }) {
  return (
    <>
      <Field label="Cor de destaque" icon={Palette}>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={s.accent_color || "#8b5cf6"}
            onChange={(e) => patch({ accent_color: e.target.value })}
            className="h-11 w-16 rounded-xl bg-white/[0.04] border border-white/10 cursor-pointer"
            style={{ colorScheme: "dark" }}
          />
          <input
            value={s.accent_color || "#8b5cf6"}
            onChange={(e) => patch({ accent_color: e.target.value })}
            className={`${inputClass} font-mono flex-1`}
          />
        </div>
      </Field>

      <Field label="Cor da barra de progresso" icon={Droplets}>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={s.progress_color || "#8b5cf6"}
            onChange={(e) => patch({ progress_color: e.target.value })}
            className="h-11 w-16 rounded-xl bg-white/[0.04] border border-white/10 cursor-pointer"
            style={{ colorScheme: "dark" }}
          />
          <input
            value={s.progress_color || "#8b5cf6"}
            onChange={(e) => patch({ progress_color: e.target.value })}
            className={`${inputClass} font-mono flex-1`}
          />
        </div>
      </Field>

      <Field label="Fundo dos controles" icon={Monitor}>
        <input
          value={s.controls_bg || "rgba(0,0,0,0.85)"}
          onChange={(e) => patch({ controls_bg: e.target.value })}
          placeholder="rgba(0,0,0,0.85)"
          className={`${inputClass} font-mono`}
        />
      </Field>

      <Field label="URL do logo" icon={Image}>
        <input
          value={s.logo_url || ""}
          onChange={(e) => patch({ logo_url: e.target.value || null })}
          placeholder="https://..."
          className={inputClass}
        />
      </Field>

      <Field label="Marca d'água" icon={Type}>
        <div className="space-y-3">
          <label className="flex items-center gap-3 h-[42px] px-3.5 rounded-xl bg-white/[0.04] border border-white/10 cursor-pointer">
            <input
              type="checkbox"
              checked={s.watermark_enabled ?? false}
              onChange={(e) => patch({ watermark_enabled: e.target.checked })}
              className="accent-primary"
            />
            <span className="text-sm">Exibir marca d'água</span>
          </label>
          {s.watermark_enabled && (
            <>
              <input
                value={s.watermark_text || ""}
                onChange={(e) => patch({ watermark_text: e.target.value })}
                placeholder="Texto da marca d'água"
                className={inputClass}
              />
              <div className="flex gap-3">
                <select
                  value={s.watermark_position || "top-right"}
                  onChange={(e) => patch({ watermark_position: e.target.value })}
                  className={`${inputClass} flex-1`}
                >
                  <option value="top-left">Superior esquerdo</option>
                  <option value="top-right">Superior direito</option>
                  <option value="bottom-left">Inferior esquerdo</option>
                  <option value="bottom-right">Inferior direito</option>
                </select>
                <input
                  type="number"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={s.watermark_opacity ?? 0.5}
                  onChange={(e) => patch({ watermark_opacity: parseFloat(e.target.value) })}
                  className={`${inputClass} w-24`}
                  title="Opacidade"
                />
              </div>
            </>
          )}
        </div>
      </Field>
    </>
  );
}

function ProtectionTab({ s, patch }: { s: Partial<PlayerSettings>; patch: (c: Partial<PlayerSettings>) => void }) {
  return (
    <>
      <div className="text-xs text-muted-foreground mb-2">
        Proteções para dificultar o download não autorizado do conteúdo.
      </div>
      <Toggle
        icon={Lock}
        label="Bloquear clique direito"
        description="Impede o menu de contexto sobre o player"
        checked={s.block_right_click ?? true}
        onChange={(v) => patch({ block_right_click: v })}
      />
      <Toggle
        icon={Shield}
        label="Bloquear download"
        description="Remove opção de download dos controles nativos"
        checked={s.block_download ?? true}
        onChange={(v) => patch({ block_download: v })}
      />
      <Toggle
        icon={Monitor}
        label="Bloquear DevTools"
        description="Tenta detectar e pausar quando DevTools está aberto (experimental)"
        checked={s.block_devtools ?? false}
        onChange={(v) => patch({ block_devtools: v })}
      />
    </>
  );
}

function FeaturesTab({ s, patch }: { s: Partial<PlayerSettings>; patch: (c: Partial<PlayerSettings>) => void }) {
  return (
    <>
      <div className="text-xs text-muted-foreground mb-2">
        Funcionalidades educacionais para melhorar a experiência do aluno.
      </div>
      <Toggle
        icon={Gauge}
        label="Controle de velocidade"
        description="Permite alterar a velocidade de reprodução (0.5x a 2x)"
        checked={s.speed_control ?? true}
        onChange={(v) => patch({ speed_control: v })}
      />
      <Toggle
        icon={Bookmark}
        label="Marcadores (bookmarks)"
        description="Alunos podem marcar momentos importantes do vídeo"
        checked={s.bookmarks_enabled ?? true}
        onChange={(v) => patch({ bookmarks_enabled: v })}
      />
      <Toggle
        icon={StickyNote}
        label="Anotações"
        description="Permite anotações vinculadas ao tempo do vídeo"
        checked={s.notes_enabled ?? true}
        onChange={(v) => patch({ notes_enabled: v })}
      />
      <Toggle
        icon={SkipForward}
        label="Autoplay próxima aula"
        description="Avança automaticamente para a próxima aula ao terminar"
        checked={s.autoplay_next ?? true}
        onChange={(v) => patch({ autoplay_next: v })}
      />
      <Toggle
        icon={RotateCcw}
        label="Retomar reprodução"
        description="Salva o progresso e retoma de onde o aluno parou"
        checked={s.resume_playback ?? true}
        onChange={(v) => patch({ resume_playback: v })}
      />
    </>
  );
}

function Toggle({ icon: Icon, label, description, checked, onChange }: {
  icon: typeof Lock; label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 cursor-pointer transition">
      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{description}</div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-primary mt-1.5 h-4 w-4"
      />
    </label>
  );
}

function PlayerPreview({ settings }: { settings: PlayerSettings }) {
  return (
    <div
      className="relative aspect-video w-full rounded-xl overflow-hidden bg-gradient-to-br from-gray-900 to-black border border-white/10"
      style={{ "--player-accent": settings?.accent_color, "--player-progress": settings?.progress_color } as React.CSSProperties}
    >
      {/* Fake video content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center mx-auto"
            style={{ background: `${settings?.accent_color || "#8b5cf6"}cc` }}
          >
            <Play className="h-6 w-6 text-white ml-0.5" fill="white" />
          </div>
          <div className="text-xs text-white/50 mt-3">Preview do player</div>
        </div>
      </div>

      {/* Watermark preview */}
      {settings?.watermark_enabled && settings?.watermark_text && (
        <div
          className={`absolute pointer-events-none text-sm font-medium text-white px-3 py-1 ${
            settings.watermark_position === "top-left" ? "top-3 left-3" :
            settings.watermark_position === "top-right" ? "top-3 right-3" :
            settings.watermark_position === "bottom-left" ? "bottom-14 left-3" :
            "bottom-14 right-3"
          }`}
          style={{ opacity: settings.watermark_opacity }}
        >
          {settings.logo_url && (
            <img src={settings.logo_url} alt="" className="h-5 inline-block mr-2 align-middle" />
          )}
          <span>{settings.watermark_text}</span>
        </div>
      )}

      {/* Fake controls */}
      <div className="absolute bottom-0 left-0 right-0" style={{ background: settings?.controls_bg || "rgba(0,0,0,0.85)" }}>
        <div className="mx-3 mt-2 h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full w-[35%] rounded-full" style={{ background: settings?.progress_color || "#8b5cf6" }} />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 text-white/80">
          <Play className="h-4 w-4" />
          <span className="text-[10px] tabular-nums">1:23 / 4:56</span>
          <div className="flex-1" />
          {settings?.speed_control && <span className="text-[10px]">1x</span>}
          {settings?.bookmarks_enabled && <Bookmark className="h-3.5 w-3.5" />}
          <Maximize className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
}
