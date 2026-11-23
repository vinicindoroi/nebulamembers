import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp, Clock, Award, Flame, Play, ArrowRight, BookOpen, Target, Trophy, Compass, Check, Sparkles, Plus } from "lucide-react";
import { useCourses } from "@/hooks/use-courses";
import { useAuth } from "@/hooks/use-auth";
import { useMemberProgress } from "@/hooks/use-member-progress";
import React, { useState, useEffect } from "react";
import { PaymentReminderBanner } from "@/components/PaymentReminderBanner";
import { StripeSalesPanel } from "@/components/stripe/StripeSalesPanel";
import { StripeSalesHistory } from "@/components/stripe/StripeSalesHistory";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — Nebula Members" },
      { name: "description", content: "Acompanhe seu progresso, cursos em andamento e tarefas na área de membros Nebula." },
      { property: "og:title", content: "Dashboard — Nebula Members" },
      { property: "og:description", content: "Acompanhe seu progresso, cursos em andamento e tarefas na área de membros Nebula." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

const DAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

const ACHIEVEMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  first_lesson: Target,
  five_lessons: BookOpen,
  twenty_lessons: Award,
  streak_3: Flame,
  streak_7: Flame,
  explorer: Compass,
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

  const level = Math.floor(completedLessons / 3) + 1;
  const xpNeededPerLevel = 300;
  const xpInCurrentLevel = (completedLessons * 100) % xpNeededPerLevel;
  const xpProgressPct = Math.round((xpInCurrentLevel / xpNeededPerLevel) * 100);

  // --- LOCAL TASKS (KANBAN INTEGRATION) ---
  const [localTasks, setLocalTasks] = useState<LocalTask[]>([]);
  const [localColumns, setLocalColumns] = useState<any[]>(() => [
    { id: "todo", title: "A Fazer" },
    { id: "in_progress", title: "Em Andamento" },
    { id: "done", title: "Concluído" },
  ]);

  useEffect(() => {
    const load = () => {
      const saved = localStorage.getItem("nebula_kanban_tasks");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setLocalTasks(parsed);
        } catch (_) {}
      }
      const savedCols = localStorage.getItem("nebula_kanban_columns");
      if (savedCols) {
        try {
          const parsed = JSON.parse(savedCols);
          if (Array.isArray(parsed)) setLocalColumns(parsed);
        } catch (_) {}
      }
    };
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);

  const doneColId = localColumns.find((c) => c.id === "done" || c.title?.toLowerCase().includes("conclu"))?.id || localColumns[localColumns.length - 1]?.id || "done";
  const todoColId = localColumns.find((c) => c.id === "todo" || c.title?.toLowerCase().includes("fazer"))?.id || localColumns[0]?.id || "todo";

  const handleToggleLocalTask = (taskId: string) => {
    const updated = localTasks.map((t) => {
      if (t.id === taskId) {
        const isCurrentlyDone = t.column === doneColId;
        return {
          ...t,
          column: isCurrentlyDone ? todoColId : doneColId,
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
      const w = { alta: 3, media: 2, baixa: 1 } as const;
      return (w[b.priority] || 0) - (w[a.priority] || 0);
    })
    .slice(0, 3);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const continueCourse = lastLesson ? { id: lastLesson.courseId, label: lastLesson.lessonTitle } : inProgress[0] ? { id: inProgress[0].id, label: inProgress[0].title } : notStarted[0] ? { id: notStarted[0].id, label: notStarted[0].title } : null;


  const todayRaw = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);
  const unlocked = achievements.filter((a) => a.unlocked);
  const unlockedCount = unlocked.length;
  const locked = achievements
    .filter((a) => !a.unlocked)
    .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const visibleLocked = showAllAchievements ? locked : locked.slice(0, 3);

  return (
    <div className="dash space-y-6 dash-enter">
      {/* Hero */}
      <header className="dash-hero rounded-2xl border border-border p-6 sm:p-8">
        <div className="dash-hero-orb" aria-hidden />
        <div className="sales-hairline absolute inset-x-0 top-0 h-px" aria-hidden />
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="min-w-0 flex-1 space-y-4">
            <span suppressHydrationWarning className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 backdrop-blur px-2.5 py-1 text-[11px] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" /> {today}
            </span>
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
                {getGreeting()}, <span className="text-gradient-primary">{name}</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-lg">
                {inProgress.length > 0
                  ? `Você tem ${inProgress.length} ${inProgress.length === 1 ? "curso em andamento" : "cursos em andamento"}. Bora manter o ritmo.`
                  : "Comece um curso e construa o hábito de aprender todo dia."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {continueCourse && (
                <Link
                  to="/courses/$courseId"
                  params={{ courseId: continueCourse.id }}
                  className="sales-glow-cta inline-flex items-center gap-2 pl-2 pr-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity max-w-full"
                >
                  <span className="h-7 w-7 rounded-full bg-primary-foreground/15 flex items-center justify-center shrink-0">
                    <Play className="h-3.5 w-3.5" fill="currentColor" />
                  </span>
                  <span className="truncate max-w-[260px]">Continuar {continueCourse.label}</span>
                </Link>
              )}
              {streak && streak.currentStreak > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/50 px-3 py-1.5 text-xs">
                  <Flame className="h-3.5 w-3.5 text-primary" />
                  <span className="tabular-nums font-medium">{streak.currentStreak}</span>
                  <span className="text-muted-foreground">{streak.currentStreak === 1 ? "dia seguido" : "dias seguidos"}</span>
                </span>
              )}
            </div>
          </div>

          {/* Level ring */}
          <div className="flex items-center gap-4 md:flex-col md:gap-2 shrink-0">
            <Ring pct={mounted ? xpProgressPct : 0} size={112} stroke={7}>
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Nível</span>
              <span className="text-3xl font-semibold tabular-nums leading-none mt-0.5">{level}</span>
            </Ring>
            <div className="md:text-center">
              <p className="text-xs tabular-nums"><span className="font-medium">{xpInCurrentLevel}</span><span className="text-muted-foreground"> / {xpNeededPerLevel} XP</span></p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{xpNeededPerLevel - xpInCurrentLevel} XP para o nível {level + 1}</p>
            </div>
          </div>
        </div>
      </header>

      <PaymentReminderBanner />

      <StripeSalesPanel />

      <StripeSalesHistory />

      {/* Progress strip */}
      <section className="dash-card p-4 sm:p-5">
        <div className="grid grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] gap-4 lg:gap-0 lg:divide-x lg:divide-border">
          <div className="col-span-2 lg:col-span-1 lg:pr-6 flex items-center gap-4">
            <span className="dash-icon-tile h-10 w-10 rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp className="h-4.5 w-4.5" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-muted-foreground">Progresso geral</span>
                <span className="text-xs tabular-nums text-muted-foreground">{completedLessons} de {totalLessons} aulas</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-2xl font-semibold tabular-nums leading-none">{overall}%</span>
                <div className="dash-bar flex-1 h-1.5 rounded-full overflow-hidden">
                  <span style={{ width: mounted ? `${overall}%` : "0%" }} />
                </div>
              </div>
            </div>
          </div>
          {[
            { label: "Aulas concluídas", value: completedLessons, icon: Clock },
            { label: "Em andamento", value: inProgress.length, icon: Flame },
            { label: "Cursos completos", value: `${completed}/${courses.length}`, icon: Award },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="lg:px-6 flex items-center gap-3 min-w-0">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-xl font-semibold tabular-nums leading-none">{m.value}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 truncate">{m.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Courses */}
      {isLoading ? (
        <SkeletonGrid />
      ) : (
        <>
          {inProgress.length > 0 && (
            <section>
              <SectionHead icon={Play} title="Continue de onde parou" to="/courses" linkLabel="Ver todos" />
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {inProgress.slice(0, 3).map((c) => (
                  <CourseProgressCard key={c.id} course={c} />
                ))}
              </div>
            </section>
          )}

          {notStarted.length > 0 && (
            <section>
              <SectionHead
                icon={Compass}
                title={inProgress.length > 0 ? "Comece um novo curso" : "Escolha seu primeiro curso"}
                to="/courses"
                linkLabel="Ver todos"
              />
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {notStarted.slice(0, 4).map((c) => (
                  <NewCourseCard key={c.id} course={c} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Habits row: equal columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
        {/* Streak */}
        {isProgressLoading ? (
          <div className="dash-card h-48 animate-pulse" />
        ) : streak ? (
          <section className="dash-card p-5 flex flex-col">
            <SectionHead icon={Flame} title="Sequência" meta={`recorde ${streak.longestStreak}`} />
            <div className="flex items-end gap-2">
              <span className="text-3xl font-semibold tabular-nums leading-none">{streak.currentStreak}</span>
              <span className="text-xs text-muted-foreground pb-0.5">{streak.currentStreak === 1 ? "dia seguido" : "dias seguidos"}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">Conclua uma aula por dia para manter.</p>
            <div className="mt-auto pt-4 flex items-center justify-between gap-1">
              {streak.weekDays.map((day, idx) => {
                const dateObj = new Date(day.date + "T12:00:00");
                const isToday = idx === streak.weekDays.length - 1;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5" title={day.date.split("-").reverse().slice(0, 2).join("/")}>
                    <span className={`text-[10px] ${isToday ? "text-primary font-medium" : "text-muted-foreground"}`}>{isToday ? "Hoje" : DAY_LABELS[dateObj.getDay()]}</span>
                    <div className={`h-7 w-full max-w-9 rounded-md flex items-center justify-center text-[10px] tabular-nums ${day.active ? "dash-day-active" : "dash-bar text-muted-foreground"} ${isToday && !day.active ? "ring-1 ring-primary/50" : ""}`}>
                      {day.active ? <Check className="h-3 w-3" /> : dateObj.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Achievements */}
        {achievements.length > 0 && (
          <section className="dash-card p-5 flex flex-col">
            <SectionHead icon={Trophy} title="Conquistas" meta={`${unlockedCount} de ${achievements.length}`} />
            {unlocked.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {unlocked.map((a) => {
                  const Icon = ACHIEVEMENT_ICONS[a.id] || Trophy;
                  return (
                    <span key={a.id} title={a.description} className="dash-badge-on inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium">
                      <Icon className="h-3 w-3" /> {a.title}
                    </span>
                  );
                })}
              </div>
            )}
            {visibleLocked.length > 0 && (
              <ul className="space-y-3">
                {visibleLocked.map((a) => {
                  const Icon = ACHIEVEMENT_ICONS[a.id] || Trophy;
                  return (
                    <li key={a.id} className="flex items-center gap-3" title={a.description}>
                      <div className="dash-bar h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-medium truncate">{a.title}</span>
                          {a.target !== undefined && (
                            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{a.current ?? 0}/{a.target}</span>
                          )}
                        </div>
                        {a.progress !== undefined && (
                          <div className="dash-bar mt-1.5 h-1 w-full rounded-full overflow-hidden">
                            <span style={{ width: `${a.progress}%` }} />
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {locked.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllAchievements((v) => !v)}
                className="mt-auto pt-3 self-start text-[11px] text-muted-foreground hover:text-primary transition-colors"
              >
                {showAllAchievements ? "Mostrar menos" : `Ver todas (${locked.length})`}
              </button>
            )}
          </section>
        )}

        {/* Tasks */}
        <section className="dash-card p-5 flex flex-col md:col-span-2 lg:col-span-1">
          <SectionHead icon={Target} title="Suas tarefas" to="/organizer" linkLabel="Abrir" />
          {dashboardPendingTasks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-4">
              <p className="text-xs text-muted-foreground">Nenhuma tarefa pendente.</p>
              <Link to="/organizer" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary/40 hover:text-primary transition-colors">
                <Plus className="h-3 w-3" /> Criar tarefa
              </Link>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {dashboardPendingTasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 group hover:bg-muted/40 transition-colors">
                  <button
                    onClick={() => handleToggleLocalTask(task.id)}
                    aria-label={`Concluir ${task.title}`}
                    className="h-4.5 w-4.5 shrink-0 rounded-full border border-border hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-colors"
                  >
                    <Check className="h-3 w-3 opacity-0 group-hover:opacity-70 text-primary transition-opacity" />
                  </button>
                  <span className="flex-1 min-w-0 text-xs truncate">{task.title}</span>
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 prio-${task.priority}`} title={task.priority === "media" ? "média" : task.priority} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Ring({ pct, size, stroke, children }: { pct: number; size: number; stroke: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="dash-ring-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (clamped / 100) * c}
          className="dash-ring-value"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

function SectionHead({ icon: Icon, title, to, linkLabel, meta }: { icon: React.ComponentType<{ className?: string }>; title: string; to?: "/courses" | "/organizer"; linkLabel?: string; meta?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <h2 className="text-sm font-medium inline-flex items-center gap-2">
        <span className="dash-icon-tile h-6 w-6 rounded-md flex items-center justify-center">
          <Icon className="h-3.5 w-3.5" />
        </span>
        {title}
      </h2>
      {to && linkLabel ? (
        <Link to={to} className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
          {linkLabel} <ArrowRight className="h-3 w-3" />
        </Link>
      ) : meta ? (
        <span className="text-xs text-muted-foreground tabular-nums">{meta}</span>
      ) : null}
    </div>
  );
}

function CourseProgressCard({ course }: { course: ReturnType<typeof useCourses>["data"] extends Array<infer T> | undefined ? T : never }) {
  const c = course!;
  return (
    <Link to="/courses/$courseId" params={{ courseId: c.id }} className="dash-card dash-card-hover group p-3 flex items-center gap-4 overflow-hidden">
      <div className="relative h-16 w-24 shrink-0 rounded-xl overflow-hidden bg-muted">
        {c.cover_url ? (
          <img src={c.cover_url} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="dash-icon-tile absolute inset-0" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <Play className="h-3.5 w-3.5" fill="currentColor" />
          </span>
        </div>
      </div>
      <div className="flex-1 min-w-0 pr-1">
        <div className="text-sm font-medium truncate">{c.title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {c.completedLessons} de {c.totalLessons} aulas
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <div className="dash-bar flex-1 h-1 rounded-full overflow-hidden">
            <span style={{ width: `${c.progress}%` }} />
          </div>
          <span className="text-[11px] text-primary tabular-nums w-8 text-right">{c.progress}%</span>
        </div>
      </div>
    </Link>
  );
}

function NewCourseCard({ course }: { course: ReturnType<typeof useCourses>["data"] extends Array<infer T> | undefined ? T : never }) {
  const c = course!;
  return (
    <Link to="/courses/$courseId" params={{ courseId: c.id }} className="dash-card dash-card-hover group overflow-hidden">
      <div className="aspect-[16/9] relative overflow-hidden bg-muted rounded-t-[15px]">
        {c.cover_url && (
          <img src={c.cover_url} alt={c.title} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        )}
        <div className="dash-cover-shade absolute inset-0" />
        <span className="absolute bottom-2.5 left-3 inline-flex items-center gap-1 rounded-full bg-background/70 backdrop-blur px-2 py-0.5 text-[10px] text-muted-foreground">
          <BookOpen className="h-3 w-3" />
          {c.totalLessons} {c.totalLessons === 1 ? "aula" : "aulas"}
        </span>
      </div>
      <div className="p-4">
        <div className="text-sm font-medium leading-tight truncate">{c.title}</div>
        {c.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</div>}
        <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
          Começar <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="dash-card p-4 h-24 animate-pulse" />
      ))}
    </div>
  );
}
