import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp, Clock, Award, Flame, Play, ArrowRight, BookOpen, Target, Trophy, Lock, Compass, Check, ChevronRight } from "lucide-react";
import { useCourses } from "@/hooks/use-courses";
import { useAuth } from "@/hooks/use-auth";
import { useMemberProgress } from "@/hooks/use-member-progress";
import { useState, useEffect } from "react";

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

  const stats = [
    { label: "Progresso geral", value: `${overall}%`, icon: TrendingUp, hint: `${completedLessons} de ${totalLessons} aulas`, color: "text-tint-cyan", chip: "bg-tint-cyan/15" },
    { label: "Aulas concluídas", value: completedLessons, icon: Clock, hint: "no total", color: "text-tint-violet", chip: "bg-tint-violet/15" },
    { label: "Cursos completos", value: completed, icon: Award, hint: completed === 1 ? "concluído" : "concluídos", color: "text-tint-amber", chip: "bg-tint-amber/15" },
    { label: "Em andamento", value: inProgress.length, icon: Flame, hint: "continue", color: "text-tint-rose", chip: "bg-tint-rose/15" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            {getGreeting()}, {name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {inProgress.length > 0
              ? `${inProgress.length} ${inProgress.length === 1 ? "curso em andamento" : "cursos em andamento"}.`
              : "Comece um curso e construa o hábito de aprender todo dia."}
          </p>
        </div>
        {continueCourse && (
          <Link
            to="/courses/$courseId"
            params={{ courseId: continueCourse.id }}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Play className="h-3.5 w-3.5" fill="currentColor" />
            <span className="hidden sm:inline max-w-[220px] truncate">Continuar {continueCourse.label}</span>
            <span className="sm:hidden">Continuar</span>
          </Link>
        )}
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl overflow-hidden border border-border bg-border">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} to="/courses" className="bg-card p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${s.chip}`}>
                  <Icon className={`h-3.5 w-3.5 ${s.color}`} />
                </span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{s.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.hint}</div>
            </Link>
          );
        })}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left */}
        <div className="lg:col-span-8 space-y-6 min-w-0">
          {/* Focus tasks */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium">Foco imediato</h2>
              <Link to="/organizer" className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                Organização <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {dashboardPendingTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma tarefa pendente. Crie metas no seu quadro de organização.</p>
            ) : (
              <ul className="divide-y divide-border -mx-1">
                {dashboardPendingTasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-3 px-1 py-3 group">
                    <button
                      onClick={() => handleToggleLocalTask(task.id)}
                      aria-label={`Concluir ${task.title}`}
                      className="h-[18px] w-[18px] shrink-0 rounded border border-border hover:border-primary flex items-center justify-center transition-colors"
                    >
                      <Check className="h-3 w-3 opacity-0 group-hover:opacity-60 text-primary transition-opacity" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{task.title}</div>
                      {task.description && <div className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</div>}
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">{task.priority}</span>
                    <Link to="/organizer" className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Continue */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Cursos em andamento</h2>
              <Link to="/courses" className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {isLoading ? (
              <SkeletonGrid />
            ) : inProgress.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">Nenhum curso em andamento.</p>
                <Link to="/courses" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
                  Explorar cursos <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {inProgress.slice(0, 4).map((c) => (
                  <CourseProgressCard key={c.id} course={c} />
                ))}
              </div>
            )}
          </section>

          {/* New courses */}
          {notStarted.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Comece um novo curso</h2>
                <Link to="/courses" className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                  Ver todos <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {notStarted.slice(0, 3).map((c) => (
                  <NewCourseCard key={c.id} course={c} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right */}
        <aside className="lg:col-span-4 space-y-6 min-w-0">
          {isProgressLoading && <div className="rounded-xl border border-border bg-card h-40 animate-pulse" />}

          {/* Level */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Nível {level}</h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {xpInCurrentLevel} / {xpNeededPerLevel} XP
              </span>
            </div>
            <div className="mt-3 h-1 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: mounted ? `${xpProgressPct}%` : "0%" }} />
            </div>
          </section>

          {/* Streak */}
          {streak && (
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium">Sequência</h2>
                <span className="text-xs text-muted-foreground">
                  {streak.currentStreak} {streak.currentStreak === 1 ? "dia" : "dias"} · recorde {streak.longestStreak}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1.5">
                {streak.weekDays.map((day) => {
                  const dateObj = new Date(day.date + "T12:00:00");
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5" title={day.date.split("-").reverse().slice(0, 2).join("/")}>
                      <span className="text-[10px] text-muted-foreground">{DAY_LABELS[dateObj.getDay()]}</span>
                      <div className={`h-7 w-full rounded-md flex items-center justify-center text-[10px] tabular-nums ${day.active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {day.active ? <Check className="h-3 w-3" /> : dateObj.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Progress breakdown */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium">Progresso</h2>
              <span className="text-xs text-muted-foreground">{courses.length} cursos</span>
            </div>
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: mounted ? `${overall}%` : "0%" }} />
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3">
              {[
                { k: "Concluídos", v: completed },
                { k: "Andamento", v: inProgress.length },
                { k: "Restantes", v: notStarted.length },
              ].map((it) => (
                <div key={it.k}>
                  <dt className="text-[11px] text-muted-foreground">{it.k}</dt>
                  <dd className="text-sm font-medium tabular-nums mt-0.5">{it.v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Achievements */}
          {achievements.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium">Conquistas</h2>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {achievements.filter((a) => a.unlocked).length}/{achievements.length}
                </span>
              </div>
              <ul className="space-y-3">
                {achievements.map((a) => {
                  const Icon = ACHIEVEMENT_ICONS[a.id] || Trophy;
                  return (
                    <li key={a.id} className="flex items-center gap-3">
                      <div className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${a.unlocked ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {a.unlocked ? <Icon className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{a.title}</div>
                        {!a.unlocked && a.progress !== undefined ? (
                          <div className="mt-1.5 h-1 w-full rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full" style={{ width: `${a.progress}%` }} />
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground truncate">{a.description}</div>
                        )}
                      </div>
                      {!a.unlocked && a.progress !== undefined && (
                        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                          {a.current}/{a.target}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function CourseProgressCard({ course }: { course: ReturnType<typeof useCourses>["data"] extends Array<infer T> | undefined ? T : never }) {
  const c = course!;
  return (
    <Link
      to="/courses/$courseId"
      params={{ courseId: c.id }}
      className="group rounded-xl border border-border bg-card p-4 flex items-center gap-3 hover:border-primary/40 transition-colors"
    >
      <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Play className="h-4 w-4" fill="currentColor" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{c.title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {c.completedLessons} de {c.totalLessons} aulas
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${c.progress}%` }} />
          </div>
          <span className="text-[11px] text-muted-foreground tabular-nums w-8 text-right">{c.progress}%</span>
        </div>
      </div>
    </Link>
  );
}

function NewCourseCard({ course }: { course: ReturnType<typeof useCourses>["data"] extends Array<infer T> | undefined ? T : never }) {
  const c = course!;
  return (
    <Link
      to="/courses/$courseId"
      params={{ courseId: c.id }}
      className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors"
    >
      <div className="aspect-[16/9] relative overflow-hidden bg-muted">
        {c.cover_url && (
          <img src={c.cover_url} alt={c.title} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
        )}
      </div>
      <div className="p-4">
        <div className="text-sm font-medium leading-tight truncate">{c.title}</div>
        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {c.totalLessons} aulas
          </span>
          <span className="inline-flex items-center gap-1 text-primary">
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
        <div key={i} className="rounded-xl border border-border bg-card p-4 h-24 animate-pulse" />
      ))}
    </div>
  );
}
