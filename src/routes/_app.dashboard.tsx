import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp, Clock, Award, Flame, Play, ArrowRight, BookOpen, Zap, Target, Trophy, Lock, Rocket, Compass, Check, Sparkles, Activity, ChevronRight } from "lucide-react";
import { useCourses } from "@/hooks/use-courses";
import { useAuth } from "@/hooks/use-auth";
import { useMemberProgress } from "@/hooks/use-member-progress";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect, useRef } from "react";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Membros" }] }),
});

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

const DAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

const ACHIEVEMENT_ICONS: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bg: string;
    glow: string;
    border: string;
    unlockedBorder: string;
    unlockedBg: string;
    animate?: string;
  }
> = {
  first_lesson: {
    icon: Target,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    glow: "shadow-[0_0_20px_rgba(244,63,94,0.2)]",
    border: "border-pink-500/20",
    unlockedBorder: "hover:border-pink-500/40 border-pink-500/15",
    unlockedBg: "bg-pink-500/[0.02] hover:bg-pink-500/[0.04]",
  },
  five_lessons: {
    icon: BookOpen,
    color: "text-teal-400",
    bg: "bg-teal-500/10",
    glow: "shadow-[0_0_20px_rgba(20,184,166,0.2)]",
    border: "border-teal-500/20",
    unlockedBorder: "hover:border-teal-500/40 border-teal-500/15",
    unlockedBg: "bg-teal-500/[0.02] hover:bg-teal-500/[0.04]",
  },
  twenty_lessons: {
    icon: Rocket,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    glow: "shadow-[0_0_20px_rgba(99,102,241,0.2)]",
    border: "border-indigo-500/20",
    unlockedBorder: "hover:border-indigo-500/40 border-indigo-500/15",
    unlockedBg: "bg-indigo-500/[0.02] hover:bg-indigo-500/[0.04]",
    animate: "group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform duration-300",
  },
  streak_3: {
    icon: Flame,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]",
    border: "border-amber-500/20",
    unlockedBorder: "hover:border-amber-500/40 border-amber-500/15",
    unlockedBg: "bg-amber-500/[0.02] hover:bg-amber-500/[0.04]",
    animate: "group-hover:scale-110 transition-transform duration-300",
  },
  streak_7: {
    icon: Zap,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    glow: "shadow-[0_0_20px_rgba(234,179,8,0.2)]",
    border: "border-yellow-500/20",
    unlockedBorder: "hover:border-yellow-500/40 border-yellow-500/15",
    unlockedBg: "bg-yellow-500/[0.02] hover:bg-yellow-500/[0.04]",
    animate: "group-hover:scale-110 transition-transform duration-300",
  },
  explorer: {
    icon: Compass,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    glow: "shadow-[0_0_20px_rgba(6,182,212,0.2)]",
    border: "border-cyan-500/20",
    unlockedBorder: "hover:border-cyan-500/40 border-cyan-500/15",
    unlockedBg: "bg-cyan-500/[0.02] hover:bg-cyan-500/[0.04]",
    animate: "group-hover:rotate-45 transition-transform duration-500",
  },
};

interface LocalSubtask {
  id: string;
  text: string;
  completed: boolean;
}

interface LocalTask {
  id: string;
  title: string;
  description: string;
  priority: "alta" | "media" | "baixa";
  column: string;
  category: string;
  date?: string;
  urgente?: boolean;
  importante?: boolean;
  subtasks?: LocalSubtask[];
}

function Dashboard() {
  const { user } = useAuth();
  const { data: courses = [], isLoading } = useCourses();
  const { data: memberProgress, isLoading: isProgressLoading } = useMemberProgress();
  const name = ((user?.user_metadata as any)?.full_name || user?.email?.split("@")[0] || "Membro").split(" ")[0];

  const totalLessons = courses.reduce((s, c) => s + c.totalLessons, 0);
  const completedLessons = courses.reduce((s, c) => s + c.completedLessons, 0);
  const overall = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const inProgress = courses.filter((c) => c.progress > 0 && c.progress < 100);
  const completed = courses.filter((c) => c.progress === 100).length;
  const notStarted = courses.filter((c) => c.progress === 0);

  const streak = memberProgress?.streak;
  const achievements = memberProgress?.achievements ?? [];
  const lastLesson = memberProgress?.lastLesson;

  // --- GAMIFICATION / XP SYSTEM ---
  const xpPerLesson = 100;
  const currentXP = completedLessons * xpPerLesson;
  const xpNeededPerLevel = 300;
  const level = Math.floor(completedLessons / 3) + 1;
  const xpInCurrentLevel = currentXP % xpNeededPerLevel;
  const xpProgressPct = Math.round((xpInCurrentLevel / xpNeededPerLevel) * 100);

  const getPatentName = (lvl: number) => {
    if (lvl === 1) return "Recruta de Órbita 🧑‍🚀";
    if (lvl === 2) return "Navegador Cósmico 🧭";
    if (lvl === 3) return "Piloto de Estrelas 🚀";
    if (lvl === 4) return "Comandante Estelar 👑";
    return "Mestre da Nebulosa 🌌";
  };

  // --- LOCAL TASKS (KANKAN INTEGRATION) ---
  const [localTasks, setLocalTasks] = useState<LocalTask[]>([]);
  const [localColumns, setLocalColumns] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nebula_kanban_columns");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (_) {}
      }
    }
    return [
      { id: "todo", title: "A Fazer" },
      { id: "in_progress", title: "Em Andamento" },
      { id: "done", title: "Concluído" }
    ];
  });

  useEffect(() => {
    const saved = localStorage.getItem("nebula_kanban_tasks");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setLocalTasks(parsed);
        }
      } catch (e) {
        console.error("Error loading dashboard local tasks:", e);
      }
    }

    const savedCols = localStorage.getItem("nebula_kanban_columns");
    if (savedCols) {
      try {
        const parsed = JSON.parse(savedCols);
        if (Array.isArray(parsed)) {
          setLocalColumns(parsed);
        }
      } catch (_) {}
    }

    const handleStorageChange = () => {
      const updated = localStorage.getItem("nebula_kanban_tasks");
      if (updated) {
        try {
          const parsed = JSON.parse(updated);
          if (Array.isArray(parsed)) {
            setLocalTasks(parsed);
          }
        } catch (e) {
          console.error("Error updating dashboard local tasks:", e);
        }
      }
      const updatedCols = localStorage.getItem("nebula_kanban_columns");
      if (updatedCols) {
        try {
          const parsed = JSON.parse(updatedCols);
          if (Array.isArray(parsed)) {
            setLocalColumns(parsed);
          }
        } catch (_) {}
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const doneColId = localColumns.find(c => c.id === "done" || c.title?.toLowerCase().includes("conclu"))?.id || localColumns[localColumns.length - 1]?.id || "done";
  const todoColId = localColumns.find(c => c.id === "todo" || c.title?.toLowerCase().includes("fazer"))?.id || localColumns[0]?.id || "todo";

  const handleToggleLocalTask = (taskId: string) => {
    const updated = localTasks.map((t) => {
      if (t.id === taskId) {
        const isCurrentlyDone = t.column === doneColId;
        const newColumn = isCurrentlyDone ? todoColId : doneColId;
        return {
          ...t,
          column: newColumn,
          subtasks: t.subtasks?.map((sub) => ({ ...sub, completed: !isCurrentlyDone })) || [],
        };
      }
      return t;
    });
    setLocalTasks(updated);
    localStorage.setItem("nebula_kanban_tasks", JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
  };

  const dashboardPendingTasks = localTasks
    .filter((t) => t.column !== doneColId)
    .sort((a, b) => {
      const priorityWeight = { alta: 3, media: 2, baixa: 1 };
      const wA = priorityWeight[a.priority] || 0;
      const wB = priorityWeight[b.priority] || 0;
      return wB - wA;
    })
    .slice(0, 3);

  // --- DYNAMIC AI RECOMMENDATION MESSAGES ---
  const getMentorMessage = () => {
    if (streak && streak.currentStreak > 0) {
      return `Incrível, ${name}! Sua Ofensiva Estelar está ativa há ${streak.currentStreak} dias! Mantenha essa energia de aceleração hoje. ⚡`;
    }
    if (completedLessons > 10) {
      return `Parabéns pela dedicação, Comandante! Você já concluiu ${completedLessons} aulas. Continue dominando novos territórios de conhecimento. 🛸`;
    }
    if (completedLessons === 0) {
      return `Sua cabine de pilotagem está pronta para a decolagem. Dê o seu primeiro passo escolhendo um curso abaixo e inicie sua jornada espacial! 🌌`;
    }
    return `Pronto para a sua próxima órbita de conhecimento? A persistência diária é o segredo para construir resultados sólidos. 🪐`;
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(t); }, []);

  const recommendedCourse = inProgress[0] || notStarted[0] || courses[0];

  const stats = [
    { label: "Progresso geral", value: `${overall}%`, icon: TrendingUp, hint: `${completedLessons} de ${totalLessons} aulas`, accent: "primary" as const, to: "/courses" as const },
    { label: "Aulas concluídas", value: completedLessons, icon: Clock, hint: "no total", accent: "cyan" as const, to: "/courses" as const },
    { label: "Cursos completos", value: completed, icon: Award, hint: completed === 1 ? "concluído" : "concluídos", accent: "emerald" as const, to: "/courses" as const },
    { label: "Em andamento", value: inProgress.length, icon: Flame, hint: "continue!", accent: "amber" as const, to: "/courses" as const },
  ];

  return (
    <div className="space-y-6 stagger-enter">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-primary/[0.08] via-white/[0.02] to-transparent p-6 md:p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/[0.12] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 animate-[ambient-pulse_12s_ease-in-out_infinite]" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-primary/[0.06] rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4 animate-[ambient-pulse_15s_ease-in-out_infinite_2s]" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary/80 mb-2">
              <Compass className="h-3 w-3" />Visão geral
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {getGreeting()}, {name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
              {inProgress.length > 0
                ? `Você tem ${inProgress.length} ${inProgress.length === 1 ? "curso" : "cursos"} em andamento. Continue de onde parou.`
                : "Comece um novo curso e construa o hábito de aprender todo dia."}
            </p>
            {lastLesson && (
              <Link
                to="/courses/$courseId"
                params={{ courseId: lastLesson.courseId }}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)] hover:shadow-[0_12px_32px_-8px_oklch(0.65_0.22_290/0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <Play className="h-3.5 w-3.5" fill="currentColor" />
                Continuar "{lastLesson.lessonTitle}"
              </Link>
            )}
            {!lastLesson && inProgress[0] && (
              <Link
                to="/courses/$courseId"
                params={{ courseId: inProgress[0].id }}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)] hover:shadow-[0_12px_32px_-8px_oklch(0.65_0.22_290/0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <Play className="h-3.5 w-3.5" fill="currentColor" />
                Continuar "{inProgress[0].title}"
              </Link>
            )}
          </div>

          {/* Gamification Level Status Card */}
          <div className="shrink-0 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 min-w-[240px] backdrop-blur-md relative overflow-hidden flex flex-col justify-between self-start md:self-auto">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-xl" />
            <div>
              <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground/60">Licença de Voo</span>
              <div className="text-base font-bold text-foreground mt-1 flex items-center gap-2">
                <Rocket className="h-4.5 w-4.5 text-primary animate-[bounce_2.5s_infinite]" />
                <span>Nível {level}</span>
              </div>
              <div className="text-[10px] text-primary/80 font-medium mt-0.5">{getPatentName(level)}</div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-white/[0.06]">
              <div className="flex justify-between text-[9px] text-muted-foreground font-medium mb-1.5">
                <span>XP de Aprendizado</span>
                <span className="font-semibold">{xpInCurrentLevel} / {xpNeededPerLevel} XP</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden p-[1px] border border-white/[0.06]">
                <div
                  className="h-full rounded-full gradient-primary shadow-[0_0_12px_rgba(139,92,246,0.6)] transition-all duration-1000"
                  style={{ width: mounted ? `${xpProgressPct}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          const accentStyles = {
            primary: { bg: "bg-primary/10", text: "text-primary", glow: "group-hover:shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.3)]" },
            cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", glow: "group-hover:shadow-[0_8px_24px_-8px_oklch(0.7_0.15_200/0.3)]" },
            emerald: { bg: "bg-emerald-500/10", text: "text-emerald-400", glow: "group-hover:shadow-[0_8px_24px_-8px_oklch(0.7_0.15_160/0.3)]" },
            amber: { bg: "bg-amber-500/10", text: "text-amber-400", glow: "group-hover:shadow-[0_8px_24px_-8px_oklch(0.7_0.15_80/0.3)]" },
          }[s.accent];
          return (
            <Link
              key={s.label}
              to={s.to}
              className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 active:scale-[0.98] ${accentStyles.glow}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`absolute -top-8 -right-8 w-20 h-20 rounded-full ${accentStyles.bg} blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-500`} />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${accentStyles.bg} ring-1 ring-white/[0.06]`}>
                    <Icon className={`h-4 w-4 ${accentStyles.text}`} />
                  </div>
                  <div className={`h-1.5 w-1.5 rounded-full ${accentStyles.bg} ${accentStyles.text} animate-pulse`} />
                </div>
                <div className="mt-3 text-2xl font-bold tabular-nums tracking-tight">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</div>
                <div className="text-[10px] text-muted-foreground/50 mt-0.5">{s.hint}</div>
              </div>
            </Link>
          );
        })}
      </section>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (Academic & Focus Centers) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          
          {/* Cosmic Mentor Recommendation Banner */}
          {recommendedCourse && (
            <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-violet-950/20 via-black/30 to-cyan-950/20 p-5 hover:border-primary/30 transition-all duration-300 shadow-[0_8px_32px_-16px_rgba(139,92,246,0.15)]">
              <div className="absolute -top-12 -left-12 w-24 h-24 bg-primary/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 relative z-10">
                <div className="h-12 w-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 animate-[pulse_3s_infinite] shadow-[0_0_15px_rgba(139,92,246,0.25)]">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-primary mb-1">Recomendação do Mentor</div>
                  <p className="text-xs italic text-muted-foreground leading-relaxed">
                    "{getMentorMessage()}"
                  </p>
                  <div className="mt-2.5 flex items-center gap-2 text-xs">
                    <span className="font-semibold text-foreground truncate max-w-[200px]">{recommendedCourse.title}</span>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="text-[10px] text-muted-foreground bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-md">
                      {recommendedCourse.completedLessons} / {recommendedCourse.totalLessons} concluídas
                    </span>
                  </div>
                </div>
                <Link
                  to="/courses/$courseId"
                  params={{ courseId: recommendedCourse.id }}
                  className="shrink-0 w-full md:w-auto text-center px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(139,92,246,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Play className="h-3.5 w-3.5" fill="currentColor" />
                  <span>Iniciar Órbita</span>
                </Link>
              </div>
            </section>
          )}

          {/* Mini-Kanban Quick Focus Widget */}
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.08] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <Target className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Foco Imediato</h2>
                  <p className="text-[10px] text-muted-foreground/60">Suas tarefas pendentes mais importantes</p>
                </div>
              </div>
              {dashboardPendingTasks.length > 0 && (
                <span className="text-[10px] text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded-full">
                  {dashboardPendingTasks.length} pendentes
                </span>
              )}
            </div>
            
            {dashboardPendingTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/[0.06] bg-white/[0.01] p-5 text-center flex flex-col items-center">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2.5">
                  <Check className="h-5 w-5" />
                </div>
                <div className="text-xs font-semibold">Sistemas Operacionais Limpos</div>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-[250px] leading-normal">
                  Nenhuma tarefa pendente de alta prioridade. Agende novas metas no seu quadro de organização.
                </p>
                <Link 
                  to="/organizer" 
                  className="mt-3.5 inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary-hover font-semibold transition-colors"
                >
                  Acessar Organização <ArrowRight className="h-2.5 w-2.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {dashboardPendingTasks.map((task) => {
                  const priorityColors = {
                    alta: "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.15)]",
                    media: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                    baixa: "bg-slate-500/10 text-slate-400 border-slate-500/20"
                  };
                  return (
                    <div 
                      key={task.id}
                      className="flex items-center gap-3.5 p-3 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] hover:border-white/[0.08] transition-all duration-300 group"
                    >
                      <button
                        onClick={() => handleToggleLocalTask(task.id)}
                        className="h-5 w-5 shrink-0 rounded-md border border-white/[0.15] bg-white/[0.02] hover:border-primary flex items-center justify-center text-primary-foreground group-hover:scale-105 active:scale-95 transition-all duration-200"
                      >
                        <div className="h-2.5 w-2.5 rounded-sm bg-primary/0 group-hover:bg-primary/20 transition-all flex items-center justify-center">
                          <Check className="h-3 w-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                        </div>
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-semibold ${priorityColors[task.priority]}`}>
                            {task.priority}
                          </span>
                          {task.category && (
                            <span className="text-[8px] text-muted-foreground/60 font-medium">
                              {task.category}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-foreground/90 truncate">{task.title}</div>
                        {task.description && (
                          <div className="text-[10px] text-muted-foreground/50 truncate mt-0.5 leading-snug">
                            {task.description}
                          </div>
                        )}
                      </div>
                      
                      <Link
                        to="/organizer"
                        className="shrink-0 text-muted-foreground/30 hover:text-primary transition-colors p-1"
                        title="Acessar Organizador"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  );
                })}
                
                <div className="flex items-center justify-between pt-1 text-[10px]">
                  <span className="text-muted-foreground/40">Sincronizado com o Workspace Pessoal</span>
                  <Link 
                    to="/organizer" 
                    className="text-primary hover:underline font-semibold flex items-center gap-0.5 transition-all"
                  >
                    Ir para Organização <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* Continue where you left off */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <BookOpen className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <h2 className="text-sm font-semibold">Cursos em andamento</h2>
              </div>
              <Link to="/courses" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors group">
                Ver todos <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            {isLoading ? (
              <SkeletonGrid />
            ) : inProgress.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-10 text-center">
                <div className="h-14 w-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-primary/60" />
                </div>
                <div className="text-sm font-medium">Nenhum curso em andamento</div>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-xs mx-auto">Explore o catálogo e comece sua jornada de aprendizado.</p>
                <Link to="/courses" className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-xs font-medium shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Explorar cursos <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {inProgress.slice(0, 4).map((c, i) => (
                  <CourseProgressCard key={c.id} course={c} index={i} />
                ))}
              </div>
            )}
          </section>

          {/* Start a new course */}
          {notStarted.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Target className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <h2 className="text-sm font-semibold">Comece um novo curso</h2>
                </div>
                <Link to="/courses" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 group">
                  Ver todos <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {notStarted.slice(0, 3).map((c, i) => (
                  <NewCourseCard key={c.id} course={c} index={i} />
                ))}
              </div>
            </section>
          )}

        </div>

        {/* Right Column (Gamification & Side Charts) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">

          {isProgressLoading && (
            <>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse space-y-3">
                <div className="h-4 w-32 bg-white/[0.06] rounded" />
                <div className="h-3 w-48 bg-white/[0.04] rounded" />
                <div className="flex gap-2 mt-4">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="flex-1 h-9 bg-white/[0.04] rounded-xl" />
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 animate-pulse space-y-3">
                <div className="h-4 w-36 bg-white/[0.06] rounded" />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-28 bg-white/[0.04] rounded-xl" />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Upgraded Ofensiva Cósmica Grid */}
          {streak && (
            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.08] transition-all duration-300">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Flame className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">Ofensiva Cósmica</h2>
                    <p className="text-[10px] text-muted-foreground/60">Seu ritmo de aprendizado</p>
                  </div>
                </div>
                <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider text-center">
                  {streak.currentStreak} dias ativos
                </span>
              </div>
              
              <p className="text-xs text-muted-foreground mb-4">
                Mantenha a consistência. Seu recorde registrado é de <strong className="text-foreground">{streak.longestStreak} dias seguidos</strong>.
              </p>
              
              <div className="flex items-center gap-2 justify-between py-2.5 px-2 bg-white/[0.01] rounded-xl border border-white/[0.04]">
                {streak.weekDays.map((day, dayIdx) => {
                  const dateObj = new Date(day.date + "T12:00:00");
                  const label = DAY_LABELS[dateObj.getDay()];
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5 group/day relative">
                      <div
                        style={{ transitionDelay: `${dayIdx * 60}ms` }}
                        className={`h-9 w-9 rounded-xl flex flex-col items-center justify-center text-xs font-semibold tracking-tight transition-all duration-500 ${
                          day.active
                            ? "bg-gradient-to-br from-amber-500/30 to-amber-600/10 text-amber-400 ring-2 ring-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)] scale-105"
                            : "bg-white/[0.03] text-muted-foreground/35 border border-white/[0.04]"
                        }`}
                      >
                        <span className="text-[10px] leading-none mb-0.5 font-bold">{label}</span>
                        {day.active ? (
                          <Check className="h-2.5 w-2.5 text-amber-400 stroke-[3]" />
                        ) : (
                          <span className="text-[8px] font-medium leading-none">{dateObj.getDate()}</span>
                        )}
                      </div>
                      
                      {/* Daily Tooltip */}
                      <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-28 -translate-x-1/2 scale-95 rounded-lg border border-white/[0.08] bg-black/90 p-1.5 text-center text-[9px] opacity-0 shadow-xl backdrop-blur-md transition-all duration-200 group-hover/day:scale-100 group-hover/day:opacity-100 z-20">
                        <p className="font-semibold text-foreground">{day.date.split("-").reverse().slice(0, 2).join("/")}</p>
                        <p className="text-muted-foreground/80 mt-0.5">{day.active ? "Ativo! Aula concluída" : "Sem atividade"}</p>
                        <div className="absolute top-full left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1 bg-black/90 border-r border-b border-white/[0.08] rotate-45" />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {!streak.todayDone ? (
                <div className="mt-3.5 flex items-center justify-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/5 py-2 px-3 border border-dashed border-amber-500/20 rounded-xl">
                  <Zap className="h-3 w-3 animate-[pulse_1.5s_infinite]" />
                  <span>Conclua uma aula hoje para acelerar seus propulsores!</span>
                </div>
              ) : (
                <div className="mt-3.5 flex items-center justify-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/5 py-2 px-3 border border-emerald-500/20 rounded-xl">
                  <Check className="h-3 w-3" />
                  <span>Missão cumprida por hoje! Ofensiva mantida.</span>
                </div>
              )}
            </section>
          )}

          {/* Upgraded CSS-Only Study Performance charts */}
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.08] transition-all duration-300">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="h-3.5 w-3.5 text-primary animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Cabine de Performance</h2>
                <p className="text-[10px] text-muted-foreground/60">Distribuição do seu progresso</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-white/[0.01] border border-white/[0.04]">
              {/* SVG Radial Progress Ring */}
              <div className="relative shrink-0 flex items-center justify-center">
                <svg className="h-20 w-20 transform -rotate-90">
                  <circle 
                    cx="40" 
                    cy="40" 
                    r="32" 
                    className="stroke-white/[0.04]" 
                    strokeWidth="6.5" 
                    fill="transparent" 
                  />
                  <circle 
                    cx="40" 
                    cy="40" 
                    r="32" 
                    className="stroke-primary shadow-[0_0_12px_rgba(139,92,246,0.5)]" 
                    strokeWidth="6.5" 
                    fill="transparent" 
                    strokeDasharray={2 * Math.PI * 32}
                    strokeDashoffset={2 * Math.PI * 32 - (overall / 100) * 2 * Math.PI * 32}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                  <span className="text-sm font-bold tracking-tighter text-foreground tabular-nums">{overall}%</span>
                  <span className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground/50 -mt-0.5">concluído</span>
                </div>
              </div>
              
              <div className="flex-1 w-full space-y-3.5">
                {/* Horizontal Stacked Bar */}
                <div>
                  <div className="flex justify-between text-[8px] text-muted-foreground mb-1.5 font-bold uppercase tracking-wider">
                    <span>Cursos</span>
                    <span>{courses.length} no total</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-white/[0.04] flex overflow-hidden p-[1px] border border-white/[0.04]">
                    {completed > 0 && (
                      <div 
                        style={{ width: `${Math.max(8, (completed / (courses.length || 1)) * 100)}%` }} 
                        className="h-full bg-gradient-to-r from-emerald-500/80 to-teal-400/80 rounded-l-full shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all duration-700" 
                        title={`Concluídos: ${completed}`}
                      />
                    )}
                    {inProgress.length > 0 && (
                      <div 
                        style={{ width: `${Math.max(8, (inProgress.length / (courses.length || 1)) * 100)}%` }} 
                        className={`h-full bg-gradient-to-r from-violet-500/80 to-fuchsia-500/80 shadow-[0_0_8px_rgba(139,92,246,0.3)] transition-all duration-700 ${completed === 0 ? "rounded-l-full" : ""} ${notStarted.length === 0 ? "rounded-r-full" : ""}`}
                        title={`Em Andamento: ${inProgress.length}`}
                      />
                    )}
                    {notStarted.length > 0 && (
                      <div 
                        style={{ width: `${Math.max(8, (notStarted.length / (courses.length || 1)) * 100)}%` }} 
                        className={`h-full bg-white/[0.08] transition-all duration-700 ${completed === 0 && inProgress.length === 0 ? "rounded-l-full" : ""} rounded-r-full`}
                        title={`Não Iniciados: ${notStarted.length}`}
                      />
                    )}
                  </div>
                </div>
                
                {/* Legends Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-450" />
                      <span className="text-[10px] font-semibold text-foreground/80">{completed}</span>
                    </div>
                    <span className="text-[8px] text-muted-foreground/60">Concluídos</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                      <span className="text-[10px] font-semibold text-foreground/80">{inProgress.length}</span>
                    </div>
                    <span className="text-[8px] text-muted-foreground/60">Andamento</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
                      <span className="text-[10px] font-semibold text-foreground/80">{notStarted.length}</span>
                    </div>
                    <span className="text-[8px] text-muted-foreground/60">Restantes</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Visual Achievements Card */}
          {achievements.length > 0 && (
            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:border-white/[0.08] transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Trophy className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">Troféus Conquistados</h2>
                    <p className="text-[10px] text-muted-foreground/60">Seus emblemas operacionais</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  {achievements.filter((a) => a.unlocked).length}/{achievements.length}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2.5">
                {achievements.map((a) => {
                  const cfg = ACHIEVEMENT_ICONS[a.id] || {
                    icon: Award,
                    color: "text-amber-400",
                    bg: "bg-amber-500/10",
                    glow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]",
                    border: "border-amber-500/20",
                    unlockedBorder: "hover:border-amber-500/40 border-amber-500/15",
                    unlockedBg: "bg-amber-500/[0.02] hover:bg-amber-500/[0.04]",
                  };
                  const Icon = cfg.icon;

                  return (
                    <div
                      key={a.id}
                      tabIndex={0}
                      role="button"
                      aria-label={`${a.title}${a.unlocked ? ' — Desbloqueado' : ` — Bloqueado, ${a.progress ?? 0}% concluído`}`}
                      className={`group relative rounded-xl border p-3.5 text-center transition-all duration-300 flex flex-col items-center justify-between min-h-[135px] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        a.unlocked
                          ? `${cfg.unlockedBorder} ${cfg.unlockedBg} ${cfg.glow}`
                          : "border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] hover:border-white/[0.08]"
                      }`}
                    >
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                      <div className="relative z-10 flex flex-col items-center w-full">
                        <div className={`relative h-11 w-11 rounded-xl flex items-center justify-center mb-2.5 ring-1 ring-white/[0.06] transition-all duration-300 ${
                          a.unlocked
                            ? `${cfg.bg} ${cfg.glow} group-hover:scale-105 group-hover:rotate-3`
                            : "bg-white/[0.02] text-muted-foreground/30 ring-dashed"
                        }`}>
                          <Icon className={`h-5 w-5 ${a.unlocked ? cfg.color : "text-muted-foreground/20"} ${cfg.animate || ""}`} />

                          {!a.unlocked && (
                            <div className="absolute inset-0 bg-black/30 backdrop-blur-[0.5px] rounded-xl flex items-center justify-center">
                              <Lock className="h-3 w-3 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>

                        <div className="text-[10px] font-bold tracking-tight text-foreground/90 leading-tight truncate w-full">{a.title}</div>
                        <div className="text-[8px] text-muted-foreground/50 mt-0.5 leading-tight line-clamp-1 w-full">{a.description}</div>
                      </div>

                      {a.unlocked ? (
                        <div className="absolute top-2 right-2 h-3.5 w-3.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_8px_rgba(16,185,129,0.25)]">
                          <Check className="h-2 w-2 text-emerald-400" strokeWidth={3.5} />
                        </div>
                      ) : (
                        <div className="absolute top-2 right-2 h-3.5 w-3.5 rounded-full bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
                          <Lock className="h-2.5 w-2.5 text-muted-foreground/20" />
                        </div>
                      )}

                      <div className="w-full mt-2.5 relative z-10">
                        {!a.unlocked && a.progress !== undefined ? (
                          <div>
                            <div className="h-0.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                              <div className="h-full gradient-primary rounded-full transition-all duration-500" style={{ width: `${a.progress}%` }} />
                            </div>
                            <div className="flex justify-between items-center text-[7px] text-muted-foreground/40 mt-1 tabular-nums">
                              <span>Progresso</span>
                              <span>{a.current}/{a.target}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[8px] text-emerald-400/80 font-bold tracking-wide">
                            Concluído
                          </div>
                        )}
                      </div>

                      {/* Premium Hover Tooltip */}
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 scale-95 rounded-xl border border-white/[0.08] bg-black/95 p-2.5 text-center opacity-0 shadow-2xl backdrop-blur-md transition-all duration-200 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100">
                        <p className={`font-bold text-[10px] mb-0.5 ${a.unlocked ? cfg.color : "text-muted-foreground"}`}>{a.title}</p>
                        <p className="text-[9px] text-muted-foreground/80 leading-snug mb-1">{a.description}</p>
                        {a.unlocked ? (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                            Desbloqueado!
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-muted-foreground/70 bg-white/[0.04] px-1.5 py-0.5 rounded-full">
                            Bloqueado · {a.progress}%
                          </span>
                        )}
                        <div className="absolute top-full left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-0.5 bg-black/95 border-r border-b border-white/[0.08] rotate-45" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

        </div>

      </div>

    </div>
  );
}

function CourseProgressCard({ course, index }: { course: ReturnType<typeof useCourses>["data"] extends Array<infer T> | undefined ? T : never; index: number }) {
  const c = course!;
  return (
    <Link
      to="/courses/$courseId"
      params={{ courseId: c.id }}
      className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center gap-4 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 hover:shadow-[0_8px_32px_-12px_oklch(0.65_0.22_290/0.2)]"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="h-14 w-14 shrink-0 rounded-xl gradient-primary flex items-center justify-center shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.5)] group-hover:scale-105 group-hover:shadow-[0_12px_32px_-8px_oklch(0.65_0.22_290/0.6)] transition-all duration-300">
        <Play className="h-5 w-5 text-primary-foreground" fill="currentColor" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate group-hover:text-foreground transition-colors">{c.title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {c.completedLessons} de {c.totalLessons} aulas
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full gradient-primary rounded-full transition-all duration-500" style={{ width: `${c.progress}%` }} />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground tabular-nums w-8 text-right">{c.progress}%</span>
        </div>
      </div>
    </Link>
  );
}

function NewCourseCard({ course, index }: { course: ReturnType<typeof useCourses>["data"] extends Array<infer T> | undefined ? T : never; index: number }) {
  const c = course!;
  return (
    <Link
      to="/courses/$courseId"
      params={{ courseId: c.id }}
      className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.12] hover:shadow-[0_8px_32px_-12px_oklch(0.65_0.22_290/0.15)] transition-all duration-300"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="aspect-[16/9] relative overflow-hidden">
        {c.cover_url && (
          <img src={c.cover_url} alt={c.title} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${c.gradient_from || "#6366f1"}, ${(c.gradient_to || "#8b5cf6")}00)` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {c.tag && (
          <span className="absolute top-3 left-3 bg-black/40 backdrop-blur-md text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg font-medium border border-white/[0.08]">
            {c.tag}
          </span>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center shadow-[0_8px_24px_-4px_oklch(0.65_0.22_290/0.6)] scale-90 group-hover:scale-100 transition-transform duration-300">
            <Play className="h-5 w-5 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="font-medium text-sm leading-tight group-hover:text-foreground transition-colors">{c.title}</div>
        <div className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{c.description}</div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {c.totalLessons} aulas
          </span>
          <span className="inline-flex items-center gap-1 text-primary font-medium group-hover:gap-1.5 transition-all">
            Começar <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 h-24 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-white/[0.06]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 rounded bg-white/[0.06]" />
              <div className="h-2 w-1/3 rounded bg-white/[0.04]" />
              <div className="h-1.5 w-full rounded-full bg-white/[0.04]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
