import { useState, useEffect, useCallback } from "react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  GraduationCap,
  Users,
  Orbit,
  Bookmark,
  MessageSquare,
  StickyNote,
  GitBranch,
  Search,
} from "lucide-react";

interface TutorialWizardProps {
  open: boolean;
  onClose: () => void;
}

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  accentColor: string;
  content: React.ReactNode;
}

function FeatureRow({ icon: Icon, label, desc, color }: { icon: React.ElementType; label: string; desc: string; color: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors">
      <div className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
    </div>
  );
}

const STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Bem-vindo à plataforma",
    description: "Sua área exclusiva de aprendizado e comunidade.",
    icon: Orbit,
    accentColor: "bg-primary/10 text-primary",
    content: (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Aqui você encontra cursos, comunidade, fórum e ferramentas para acelerar seu aprendizado. Vamos te mostrar como navegar.
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-primary/[0.08] border border-primary/20 text-center">
            <GraduationCap className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-[10px] text-muted-foreground">Cursos</div>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/[0.08] border border-cyan-500/20 text-center">
            <Users className="h-5 w-5 mx-auto text-cyan-400 mb-1" />
            <div className="text-[10px] text-muted-foreground">Comunidade</div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 text-center">
            <StickyNote className="h-5 w-5 mx-auto text-amber-400 mb-1" />
            <div className="text-[10px] text-muted-foreground">Notas</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "sidebar",
    title: "Barra lateral",
    description: "Navegue entre as seções usando o menu à esquerda.",
    icon: LayoutDashboard,
    accentColor: "bg-blue-500/10 text-blue-400",
    content: (
      <div className="space-y-2">
        <FeatureRow icon={LayoutDashboard} label="Dashboard" desc="Visão geral do seu progresso e cursos" color="bg-primary/10 text-primary" />
        <FeatureRow icon={GraduationCap} label="Cursos" desc="Acesse todos os cursos disponíveis" color="bg-emerald-500/10 text-emerald-400" />
        <FeatureRow icon={Users} label="Comunidade" desc="Conecte-se com outros membros" color="bg-cyan-500/10 text-cyan-400" />
        <FeatureRow icon={MessageSquare} label="Fórum" desc="Tire dúvidas e participe de discussões" color="bg-violet-500/10 text-violet-400" />
        <FeatureRow icon={Bookmark} label="Salvos" desc="Aulas e conteúdos que você salvou" color="bg-pink-500/10 text-pink-400" />
      </div>
    ),
  },
  {
    id: "features",
    title: "Funcionalidades extras",
    description: "Ferramentas que vão te ajudar no dia a dia.",
    icon: Search,
    accentColor: "bg-amber-500/10 text-amber-400",
    content: (
      <div className="space-y-2">
        <FeatureRow icon={StickyNote} label="Notas" desc="Anote insights durante as aulas" color="bg-amber-500/10 text-amber-400" />
        <FeatureRow icon={GitBranch} label="Funis" desc="Visualize e crie funis de venda" color="bg-blue-500/10 text-blue-400" />
        <FeatureRow icon={Search} label="Busca rápida" desc="Use a barra de busca no topo para encontrar qualquer conteúdo" color="bg-muted text-muted-foreground" />
        <div className="mt-3 p-3 rounded-xl bg-primary/[0.06] border border-primary/20">
          <p className="text-xs text-muted-foreground">
            <span className="text-primary font-medium">Dica:</span> Você pode recolher a sidebar clicando na seta para ter mais espaço de tela.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "ready",
    title: "Tudo pronto!",
    description: "Você está preparado para começar.",
    icon: Orbit,
    accentColor: "bg-emerald-500/10 text-emerald-400",
    content: (
      <div className="space-y-4 text-center py-4">
        <div className="h-16 w-16 mx-auto rounded-2xl gradient-primary flex items-center justify-center shadow-[0_8px_32px_-8px_oklch(0.65_0.22_290/0.5)]">
          <Orbit className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">Bons estudos!</p>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto">
            Explore os cursos, participe da comunidade e aproveite ao máximo sua jornada de aprendizado.
          </p>
        </div>
      </div>
    ),
  },
];

export function TutorialWizard({ open, onClose }: TutorialWizardProps) {
  const [step, setStep] = useState(0);
  const [animDir, setAnimDir] = useState<"left" | "right">("right");
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(0);
      setAnimDir("right");
    }
  }, [open]);

  const goNext = useCallback(() => {
    if (step === STEPS.length - 1) {
      onClose();
      return;
    }
    setAnimDir("right");
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => s + 1);
      setAnimating(false);
    }, 150);
  }, [step, onClose]);

  const goPrev = useCallback(() => {
    if (step === 0) return;
    setAnimDir("left");
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => s - 1);
      setAnimating(false);
    }, 150);
  }, [step]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, goNext, goPrev, onClose]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-wizard-fade"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-[oklch(0.14_0.01_270)] shadow-2xl overflow-hidden animate-wizard-in">
        {/* Ambient glow */}
        <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-primary/20 blur-[50px] pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full bg-primary/10 blur-[50px] pointer-events-none" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Progress bar */}
        <div className="h-1 bg-white/[0.04]">
          <div
            className="h-full gradient-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="relative p-6 pt-7">
          {/* Step dots */}
          <div className="flex items-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setAnimDir(i > step ? "right" : "left");
                  setAnimating(true);
                  setTimeout(() => { setStep(i); setAnimating(false); }, 150);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-5 gradient-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-white/10"
                }`}
              />
            ))}
            <span className="ml-auto text-[10px] text-muted-foreground/50">{step + 1}/{STEPS.length}</span>
          </div>

          {/* Step content with transition */}
          <div
            className="transition-all duration-150 ease-out"
            style={{
              opacity: animating ? 0 : 1,
              transform: animating
                ? `translateX(${animDir === "right" ? "-12px" : "12px"})`
                : "translateX(0)",
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ring-1 ring-white/[0.08] ${current.accentColor}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">{current.title}</h2>
                <p className="text-xs text-muted-foreground">{current.description}</p>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[300px] overflow-y-auto pr-1">
              {current.content}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative border-t border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Pular
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={goPrev}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.05] transition-all"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Anterior
              </button>
            )}
            <button
              onClick={goNext}
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium gradient-primary text-primary-foreground shadow-[0_4px_16px_-4px_oklch(0.65_0.22_290/0.5)] hover:shadow-[0_6px_20px_-4px_oklch(0.65_0.22_290/0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {isLast ? "Começar" : "Próximo"}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
