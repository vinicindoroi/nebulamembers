import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Play, ArrowLeft, Lock, Download, Paperclip, Clock, ChevronRight, Copy, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePlans } from "@/hooks/use-plans";
import { toast } from "sonner";
import { useAddXp } from "@/hooks/use-xp";
import { NebulaPlayer, type Chapter } from "@/components/player/NebulaPlayer";
import { LessonComments } from "@/components/lessons/LessonComments";
import { Button } from "@/components/ui/button";
import { getSignedVideoUrl, isStoragePath, getAttachmentDownloadUrl } from "@/lib/storage";
import {
  usePlayerSettings,
  useVideoProgress,
  useSaveVideoProgress,
  useBookmarks,
  useAddBookmark,
  useRemoveBookmark,
} from "@/hooks/use-player-settings";

export const Route = createFileRoute("/_app/courses/$courseId")({
  component: CourseDetail,
  head: () => ({
    meta: [
      { title: "Assistir curso — Nebula Members" },
      { name: "description", content: "Assista às aulas e acompanhe seu progresso na Nebula Members." },
      { property: "og:title", content: "Assistir curso — Nebula Members" },
      { property: "og:description", content: "Assista às aulas e acompanhe seu progresso na Nebula Members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Lesson = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  duration: number | null;
  duration_min: number | null;
  video_url: string | null;
  video_path: string | null;
  poster_url: string | null;
  captions_url: string | null;
  chapters: Chapter[] | null;
  content: string | null;
  is_free: boolean | null;
  is_premium: boolean | null;
  offer_id: string | null;
  access_level: string | null;
  access_levels: string[] | null;
  module_id: string | null;
};

type Module = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  is_premium: boolean | null;
  offer_id: string | null;
  access_level: string | null;
  access_levels: string[] | null;
  cover_url: string | null;
  title_visible?: boolean | null;
};

function LessonDescription({ html }: { html: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasCode = /<(pre|code)(\s|>)/i.test(html);
  const isLong = html.replace(/<[^>]*>/g, "").length > 700 || html.split("\n").length > 12;

  const copyCode = async () => {
    const container = document.createElement("div");
    container.innerHTML = html;
    const blocks = Array.from(container.querySelectorAll("pre, code"));
    const code = blocks.map((block) => block.textContent ?? "").filter(Boolean).join("\n\n");
    await navigator.clipboard.writeText(code || container.textContent || "");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-border bg-background/40">
      {hasCode && (
        <div className="flex h-9 items-center justify-between border-b border-border px-3">
          <span className="font-mono text-[10px] font-semibold uppercase text-muted-foreground">Código</span>
          <Button type="button" variant="ghost" size="sm" onClick={copyCode} className="h-7 gap-1.5 px-2 text-xs">
            {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
      )}
      <div className={`lesson-description prose prose-invert max-w-none px-4 py-3 text-sm text-muted-foreground ${!expanded && isLong ? "max-h-64 overflow-hidden" : ""}`} dangerouslySetInnerHTML={{ __html: html }} />
      {isLong && (
        <div className="border-t border-border px-3 py-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded((value) => !value)} className="h-7 px-2 text-xs text-primary">
            {expanded ? "Recolher conteúdo" : "Ver conteúdo completo"}
          </Button>
        </div>
      )}
    </div>
  );
}

function CourseDetail() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();
  const { plans } = usePlans();
  const qc = useQueryClient();
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["course", courseId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [c, m, l, lc, p, o, prof] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).eq("status", "published").single(),
        supabase.from("modules").select("*").eq("course_id", courseId).order("position"),
        supabase.from("lessons_public").select("*").eq("course_id", courseId).order("position"),
        (supabase as any).from("lesson_content").select("*").eq("course_id", courseId),
        supabase.from("lesson_progress").select("lesson_id").eq("user_id", user!.id),
        supabase.from("offers").select("*").eq("active", true),
        (supabase as any).from("profiles").select("plan").eq("id", user!.id).maybeSingle(),
      ]);
      if (c.error) throw c.error;
      if (l.error) throw l.error;
      const contentById = new Map<string, any>((lc.data ?? []).map((x: any) => [x.id, x]));
      const lessons = ((l.data ?? []) as any[]).map((lesson) => ({ ...lesson, ...(contentById.get(lesson.id) ?? {}) }));
      const done = new Set((p.data ?? []).map((x) => x.lesson_id));
      return {
        course: c.data,
        modules: (m.data ?? []) as Module[],
        lessons: lessons as unknown as Lesson[],
        done,
        offers: (o.data ?? []) as Array<{ id: string; name: string; description: string | null; price: number; checkout_url: string; badge_text: string | null }>,
        userPlan: ((prof.data?.plan as string) ?? "free").toLowerCase(),
      };
    },
  });

  const addXp = useAddXp();

  const toggle = useMutation({
    mutationFn: async ({ lessonId, completed }: { lessonId: string; completed: boolean }) => {
      if (completed) {
        const { error } = await supabase
          .from("lesson_progress")
          .delete()
          .eq("user_id", user!.id)
          .eq("lesson_id", lessonId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("lesson_progress")
          .insert({ user_id: user!.id, lesson_id: lessonId });
        if (error) throw error;
        addXp.mutate("complete_lesson");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["course", courseId] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["member-progress", user?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  if (error || !data) return <div className="text-sm text-red-400">Erro ao carregar curso.</div>;

  const { course, modules, lessons, done, offers, userPlan } = data;
  const total = lessons.length;
  const completed = lessons.filter((l) => done.has(l.id)).length;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const activeLesson = lessons.find((l) => l.id === activeLessonId) ?? lessons[0];

  // Hierarquia dinâmica: nível de cada plano vem de plans_config (admin > Planos).
  // Planos de nível maior herdam o acesso de todos os níveis menores.
  const planHierarchy: Record<string, number> = { free: 0, pro: 1, premium: 2 };
  const nameToSlug: Record<string, string> = {};
  for (const p of plans) {
    const slug = (p.slug ?? "").trim().toLowerCase();
    if (!slug) continue;
    planHierarchy[slug] = typeof p.level === "number" ? p.level : 2;
    nameToSlug[slug] = slug;
    const name = ((p as any).name ?? "").trim().toLowerCase();
    if (name) nameToSlug[name] = slug;
  }
  const rawUserPlan = (userPlan ?? "free").trim().toLowerCase();
  // O perfil pode guardar o NOME do plano ("Nebula Members") enquanto o conteúdo guarda o slug ("nebula-members").
  const normalizedUserPlan = nameToSlug[rawUserPlan] ?? rawUserPlan;
  const isPendingUserPlan = normalizedUserPlan === "" || normalizedUserPlan === "pending" || normalizedUserPlan === "pendente";
  // Planos personalizados sem nível configurado (ex.: "Individual") têm acesso alto; apenas "pending" fica sem acesso.
  const userLevel = isPendingUserPlan
    ? -1
    : (planHierarchy[normalizedUserPlan] ?? 3);
  const levelOf = (v: string | null | undefined) => planHierarchy[(v ?? "free").trim().toLowerCase()] ?? 0;
  // Se o conteúdo tem uma lista de planos (access_levels), o plano do usuário precisa estar nela.
  // Caso contrário, vale a hierarquia do access_level (nível maior herda os menores).
  const allowedBy = (levels: string[] | null | undefined, single: string | null | undefined) =>
    levels && levels.length > 0
      ? levels.some((s) => (s ?? "").trim().toLowerCase() === normalizedUserPlan)
      : userLevel >= levelOf(single);
  // Item é "restrito" (mostra cadeado) quando nem todos os planos têm acesso.
  const totalPlans = Object.keys(planHierarchy).length;
  const isRestricted = (levels: string[] | null | undefined, single: string | null | undefined) =>
    levels && levels.length > 0 ? levels.length < totalPlans : levelOf(single) > 0;
  const courseAccessLevel = (course.access_level ?? "free").toLowerCase();
  const courseLevel = levelOf(courseAccessLevel);
  const accessDenied = userLevel < courseLevel;

  const activeModule = modules.find((m) => m.id === activeLesson?.module_id);
  const isLocked =
    userLevel < courseLevel ||
    !allowedBy(activeModule?.access_levels, activeModule?.access_level) ||
    !allowedBy(activeLesson?.access_levels, activeLesson?.access_level);
  const premiumOffer = null as null | { id: string; name: string; description: string | null; price: number; checkout_url: string; badge_text: string | null };
  void offers;

  // group lessons by module, plus orphans (no module_id)
  const orphans = lessons.filter((l) => !l.module_id);
  const grouped: Array<{ mod: Module | null; items: Lesson[] }> = [
    ...modules.map((mod) => ({ mod, items: lessons.filter((l) => l.module_id === mod.id) })),
    ...(orphans.length ? [{ mod: null as Module | null, items: orphans }] : []),
  ].filter((g) => g.items.length > 0);

  const firstUncompletedLesson = lessons.find((l) => !done.has(l.id)) ?? lessons[0];
  const isStarted = completed > 0;

  const currentModuleId = selectedModuleId ?? (grouped[0]?.mod?.id ?? "orphans");
  const activeGroup = grouped.find((g) => (g.mod?.id ?? "orphans") === currentModuleId) ?? grouped[0];

  return (
    <div className="courses-catalog mx-auto w-full max-w-[1600px] space-y-8 pb-12 animate-fade-up">
      {activeLessonId ? (
        <button
          onClick={() => setActiveLessonId(null)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-none outline-none"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para os módulos
        </button>
      ) : (
        <Link to="/courses" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para cursos
        </Link>
      )}

      <header className="relative min-h-48 overflow-hidden rounded-xl border border-border bg-card sm:min-h-64">
        <div className="absolute inset-0">
          {course.cover_url && (
            <img src={course.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {course.gradient_from && course.gradient_to && (
            <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${course.gradient_from}, ${course.gradient_to}00)` }} />
          )}
           <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-background/10" />
        </div>
        <div className="relative flex min-h-48 flex-col justify-end p-5 sm:min-h-64 sm:p-8">
          {course.tag && <span className="mb-2 w-fit rounded-md border border-primary/25 bg-background/70 px-2 py-1 text-[10px] font-semibold uppercase text-primary backdrop-blur-md">{course.tag}</span>}
          {(course as any).title_visible !== false && <h1 className="font-course-display max-w-3xl text-2xl font-bold text-foreground sm:text-4xl">{course.title}</h1>}
          {course.description && <p className="mt-2 max-w-2xl text-sm text-foreground/70">{course.description}</p>}
          <div className="mt-5 flex max-w-2xl items-center gap-3">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/15">
              <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
            <span className="shrink-0 text-xs font-semibold text-foreground/80">{completed}/{total} • {progress}%</span>
          </div>
        </div>
      </header>

      {total === 0 ? (
        <div className="glass rounded-2xl p-8 text-sm text-muted-foreground text-center">
          Este curso ainda não possui aulas. Adicione aulas em <span className="text-foreground">Admin → Módulos & Aulas</span>.
        </div>
      ) : activeLessonId === null ? (
        <div className="space-y-10">
          <section className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-y border-border py-6">
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase text-primary">Seu progresso</span>
              <h2 className="font-course-display mt-1 text-xl font-bold sm:text-2xl">{isStarted ? "Continue assistindo" : "Comece sua jornada"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isStarted ? `Você completou ${completed} de ${total} aulas. Continue de onde parou!` : "Comece a sua jornada agora mesmo!"}
              </p>
            </div>
            {firstUncompletedLesson && (
              <Button
                onClick={() => setActiveLessonId(firstUncompletedLesson.id)}
                className="h-11 shrink-0 px-4 sm:px-6"
              >
                <Play className="h-4 w-4" fill="currentColor" />
                <span className="hidden sm:inline">{isStarted ? "Continuar assistindo" : "Começar a assistir"}</span>
                <span className="sm:hidden">Assistir</span>
              </Button>
            )}
          </section>

          {/* Módulos do Curso - Estilo Netflix */}
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-semibold uppercase text-primary">Conteúdo</span>
                <h3 className="font-course-display mt-1 text-xl font-bold">Módulos do curso</h3>
              </div>
              <span className="text-xs text-muted-foreground">{grouped.length} {grouped.length === 1 ? "módulo" : "módulos"}</span>
            </div>
            <div className="flex snap-x gap-4 overflow-x-auto pb-5">
              {grouped.map(({ mod, items }) => {
                const isSelected = (mod?.id ?? "orphans") === currentModuleId;
                const modLessons = items;
                const modCompleted = modLessons.filter((l) => done.has(l.id)).length;
                const modTotal = modLessons.length;
                const modProgress = modTotal ? Math.round((modCompleted / modTotal) * 100) : 0;
                
                return (
                  <button
                    key={mod?.id ?? "orphans"}
                    onClick={() => setSelectedModuleId(mod?.id ?? "orphans")}
                    className={`group relative aspect-video w-64 shrink-0 snap-start overflow-hidden rounded-lg border text-left transition duration-300 sm:w-72 ${
                      isSelected
                        ? "border-primary ring-1 ring-primary/50"
                        : "border-border bg-card hover:scale-[1.02] hover:border-primary/40"
                    }`}
                  >
                    {/* Cover image if available */}
                    {mod?.cover_url ? (
                      <>
                        <img
                          src={mod.cover_url}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                         <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                      </>
                    ) : (
                       <div className="absolute inset-0 bg-muted" />
                    )}
                    
                    {/* Content */}
                    <div className="absolute inset-0 p-4 flex flex-col justify-between z-10">
                      <div className="flex items-start justify-between">
                         <span className="rounded-md border border-border bg-background/70 px-2 py-1 text-[9px] font-bold uppercase text-foreground/80 backdrop-blur-md">
                          {mod?.position !== undefined ? `Módulo ${String(mod.position + 1).padStart(2, "0")}` : "Extra"}
                        </span>
                        {isRestricted(mod?.access_levels, mod?.access_level) && (
                           <span className="rounded-md border border-border bg-background/70 p-1 text-muted-foreground backdrop-blur-md">
                            <Lock className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1 mt-auto">
                        {(mod?.title_visible ?? true) && (
                           <h4 className="line-clamp-2 text-sm font-bold leading-snug text-foreground transition-colors group-hover:text-primary md:text-base">
                            {mod?.title ?? "Aulas sem módulo"}
                          </h4>
                        )}
                         <p className="text-[11px] text-foreground/60">
                          {modTotal} {modTotal === 1 ? "aula" : "aulas"}
                        </p>
                      </div>
                      
                      {/* Integrated progress bar at the bottom */}
                      <div className="space-y-1 mt-2">
                         <div className="flex items-center justify-between text-[9px] text-foreground/60">
                          <span>{modCompleted}/{modTotal} concluídas</span>
                          <span>{modProgress}%</span>
                        </div>
                         <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/10">
                           <div className="h-full bg-primary" style={{ width: `${modProgress}%` }} />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Timeline do Módulo Ativo */}
          {activeGroup && (
            <section className="rounded-xl border border-border bg-card/60 p-4 sm:p-6 animate-fade-in">
              {(() => {
                const mod = activeGroup.mod;
                const modLessons = activeGroup.items;
                const modCompleted = modLessons.filter((l) => done.has(l.id)).length;
                const modTotal = modLessons.length;
                const modProgress = modTotal ? Math.round((modCompleted / modTotal) * 100) : 0;
                
                const radius = 18;
                const circumference = 2 * Math.PI * radius;
                const strokeDashoffset = circumference - (modProgress / 100) * circumference;

                return (
                  <>
                     <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border pb-5">
                       <div className="min-w-0 space-y-1">
                         <span className="text-[10px] font-semibold uppercase text-primary">
                          {mod?.position !== undefined ? `Módulo ${String(mod.position + 1).padStart(2, "0")}` : "Extra"}
                        </span>
                         <h3 className="font-course-display mt-1 flex items-center gap-2 truncate text-xl font-bold text-foreground">
                          {mod?.title ?? "Aulas sem módulo"}
                          {isRestricted(mod?.access_levels, mod?.access_level) && <Lock className="h-4 w-4 text-amber-400" />}
                        </h3>
                        {mod?.description && <p className="text-sm text-muted-foreground mt-1">{mod.description}</p>}
                      </div>
                      
                       <div className="flex shrink-0 items-center gap-3">
                         <span className="hidden text-xs text-muted-foreground sm:inline">
                          {modCompleted}/{modTotal} concluídas
                        </span>
                         <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-background">
                          <svg className="w-12 h-12 transform -rotate-90">
                             <circle cx="24" cy="24" r={radius} className="stroke-muted" strokeWidth="2.5" fill="transparent" />
                            <circle
                              cx="24"
                              cy="24"
                              r={radius}
                               className="stroke-primary transition-all duration-500"
                              strokeWidth="2.5"
                              fill="transparent"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                            />
                          </svg>
                           <span className="absolute text-[10px] font-bold text-foreground">{modProgress}%</span>
                        </div>
                      </div>
                    </div>

                     <div className="mt-3 divide-y divide-border">
                      {modLessons.map((l, idx) => {
                        const isDone = done.has(l.id);
                        const lMod = modules.find((m) => m.id === l.module_id);
                        const lLocked =
                          userLevel < courseLevel ||
                          !allowedBy(lMod?.access_levels, lMod?.access_level) ||
                          !allowedBy(l.access_levels, l.access_level);
                        return (
                           <div key={l.id} className="group relative">
                             <Button
                               type="button"
                               variant="ghost"
                               size="icon"
                               aria-label={lLocked ? `Aula bloqueada: ${l.title}` : `Assistir ${l.title}`}
                               onClick={() => setActiveLessonId(l.id)}
                               className={`absolute mt-3 h-8 w-8 rounded-full border ${
                                 lLocked ? "border-border text-muted-foreground" : isDone ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground group-hover:border-primary group-hover:text-primary"
                               }`}
                             >
                              {lLocked ? (
                                <Lock className="h-3 w-3" />
                              ) : isDone ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <Play className="h-3 w-3" fill="currentColor" />
                              )}
                             </Button>

                            <button
                              onClick={() => setActiveLessonId(l.id)}
                               className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg py-4 pl-11 pr-2 text-left transition hover:bg-foreground/[0.03]"
                            >
                               <div className="min-w-0 space-y-1">
                                 <span className="text-[10px] font-medium uppercase text-muted-foreground">
                                  Aula {String(idx + 1).padStart(2, "0")}
                                </span>
                                 <h4 className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                                  {l.title}
                                </h4>
                              </div>

                               <div className="flex shrink-0 items-center gap-2">
                                 <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>{l.duration ?? l.duration_min ?? 0} min</span>
                                </div>

                                {l.is_free && (
                                   <span className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-primary">
                                    Grátis
                                  </span>
                                )}
                                {lLocked && !l.is_free && (
                                   <span className="hidden rounded border border-border px-2 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground sm:inline">
                                     Bloqueada
                                  </span>
                                )}

                                <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all hidden sm:block" />
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </section>
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Player + content */}
          <div className="space-y-4 min-w-0">
            {isLocked ? (
              <div className="aspect-video w-full rounded-2xl glass relative overflow-hidden flex flex-col items-center justify-center text-center p-8">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                    <Lock className="h-7 w-7 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {accessDenied ? `Conteúdo ${courseAccessLevel.charAt(0).toUpperCase() + courseAccessLevel.slice(1)}` : "Conteúdo Premium"}
                  </h3>
                  <p className="text-sm text-white/60 mt-2 max-w-sm">
                    {accessDenied
                      ? `Este curso requer o plano ${courseAccessLevel.charAt(0).toUpperCase() + courseAccessLevel.slice(1)}. Faça upgrade para desbloquear.`
                      : premiumOffer?.description || "Desbloqueie este conteúdo para ter acesso completo."}
                  </p>
                  {premiumOffer && (
                    <div className="mt-4 flex flex-col items-center gap-2">
                      <span className="text-2xl font-bold text-white">R$ {Number(premiumOffer.price).toFixed(2)}</span>
                      {premiumOffer.badge_text && (
                        <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 font-medium">{premiumOffer.badge_text}</span>
                      )}
                      <a
                        href={premiumOffer.checkout_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 gradient-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-medium shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)] hover:scale-105 transition-transform"
                      >
                        Desbloquear agora
                      </a>
                    </div>
                  )}
                  {accessDenied && !premiumOffer && (
                    <div className="mt-4">
                      <a
                        href="/settings"
                        className="gradient-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-medium shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)] hover:scale-105 transition-transform inline-block"
                      >
                        Fazer upgrade
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <LessonPlayer
                lesson={activeLesson}
                lessons={lessons}
                onNextLesson={(nextId) => setActiveLessonId(nextId)}
              />
            )}

            <div className="rounded-xl border border-border bg-card/60 p-5">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] text-muted-foreground">
                    Aula {(activeLesson.position ?? 0) + 1}
                    {activeLesson.duration || activeLesson.duration_min
                      ? ` • ${activeLesson.duration ?? activeLesson.duration_min} min`
                      : ""}
                  </div>
                  <h2 className="text-lg font-semibold mt-1">{activeLesson.title}</h2>
                </div>
                <Button
                  type="button"
                  variant={done.has(activeLesson.id) ? "outline" : "default"}
                  onClick={() =>
                    toggle.mutate({ lessonId: activeLesson.id, completed: done.has(activeLesson.id) })
                  }
                  disabled={toggle.isPending}
                  className="shrink-0 px-3 text-xs"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{done.has(activeLesson.id) ? "Concluída" : "Marcar como concluída"}</span>
                  <span className="sm:hidden">{done.has(activeLesson.id) ? "Concluída" : "Concluir"}</span>
                </Button>
              </div>

              {activeLesson.description && (
                <LessonDescription html={activeLesson.description} />
              )}
              {activeLesson.content && (
                <div className="mt-4 text-sm whitespace-pre-wrap leading-relaxed">
                  {activeLesson.content}
                </div>
              )}
            </div>

            {/* Comentários da aula */}
            <LessonAttachments lessonId={activeLesson.id} />
            <LessonComments lessonId={activeLesson.id} />
          </div>

          {/* Sidebar com módulos/aulas */}
          <aside className="h-fit rounded-xl border border-border bg-card/60 p-3 lg:sticky lg:top-4">
            <div className="px-2 py-2 text-[11px] font-semibold uppercase text-muted-foreground">
              Conteúdo do curso
            </div>
            <div className="space-y-3">
              {grouped.map(({ mod, items }) => (
                <div key={mod?.id ?? "orphans"}>
                  {mod && (
                    <div className="px-2 pt-2 pb-1 text-xs font-medium text-foreground/80 flex items-center gap-2">
                      {mod.title}
                      {isRestricted(mod.access_levels, mod.access_level) && <Lock className="h-3 w-3 text-amber-400" />}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {items.map((l, i) => {
                      const isDone = done.has(l.id);
                      const isActive = l.id === activeLesson.id;
                      const lMod = modules.find((m) => m.id === l.module_id);
                      const lLocked =
                        userLevel < courseLevel ||
                        !allowedBy(lMod?.access_levels, lMod?.access_level) ||
                        !allowedBy(l.access_levels, l.access_level);
                      return (
                        <button
                          key={l.id}
                          onClick={() => setActiveLessonId(l.id)}
                          className={`w-full text-left px-2 py-2 rounded-lg flex items-center gap-3 transition ${
                            isActive ? "bg-primary/10 text-primary" : "hover:bg-foreground/[0.04]"
                          }`}
                        >
                          <div
                            className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${
                              lLocked
                                ? "bg-amber-500/10 text-amber-400"
                                : isDone
                                  ? "gradient-primary text-primary-foreground"
                                  : isActive
                                    ? "bg-primary/20 text-primary"
                                    : "bg-muted/40 text-muted-foreground"
                            }`}
                          >
                            {lLocked ? <Lock className="h-3 w-3" /> : isDone ? <Check className="h-3.5 w-3.5" /> : <Play className="h-3 w-3" fill="currentColor" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">
                              {String(i + 1).padStart(2, "0")} · {l.title}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {l.duration ?? l.duration_min ?? 0} min
                            </div>
                          </div>
                          {l.is_free && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 uppercase">
                              Free
                            </span>
                          )}
                          {lLocked && !l.is_free && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 uppercase">
                              Premium
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function LessonPlayer({ lesson, lessons, onNextLesson }: { lesson: Lesson; lessons: Lesson[]; onNextLesson: (id: string) => void }) {
  const { user } = useAuth();
  const { data: settings, isLoading: settingsLoading } = usePlayerSettings();
  const { data: videoProgress } = useVideoProgress(lesson.id, user?.id);
  const saveProgress = useSaveVideoProgress();
  const { data: bookmarks = [] } = useBookmarks(lesson.id, user?.id);
  const addBookmark = useAddBookmark();
  const removeBookmark = useRemoveBookmark();
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [resolvedPoster, setResolvedPoster] = useState<string | null>(null);

  const url = lesson.video_url?.trim() || lesson.video_path?.trim();

  // Resolve signed URL for Supabase storage paths
  useEffect(() => {
    if (!url) { setResolvedUrl(null); return; }
    if (isStoragePath(url)) {
      getSignedVideoUrl(url).then(setResolvedUrl).catch(() => setResolvedUrl(null));
    } else {
      setResolvedUrl(url);
    }
  }, [url]);

  // Resolve poster URL
  useEffect(() => {
    const poster = lesson.poster_url?.trim();
    if (!poster) { setResolvedPoster(null); return; }
    if (isStoragePath(poster)) {
      getSignedVideoUrl(poster).then(setResolvedPoster).catch(() => setResolvedPoster(null));
    } else {
      setResolvedPoster(poster);
    }
  }, [lesson.poster_url]);

  const handleProgress = useCallback((time: number, duration: number) => {
    if (!user?.id || !lesson.id) return;
    saveProgress.mutate({
      userId: user.id,
      lessonId: lesson.id,
      currentTime: time,
      duration,
    });
  }, [user?.id, lesson.id, saveProgress]);

  const handleAddBookmark = useCallback((time: number) => {
    if (!user?.id) return;
    const label = prompt("Nome do marcador (opcional):");
    addBookmark.mutate({
      userId: user.id,
      lessonId: lesson.id,
      timeSeconds: time,
      label: label || undefined,
    });
    toast.success("Marcador adicionado");
  }, [user?.id, lesson.id, addBookmark]);

  const handleRemoveBookmark = useCallback((id: string) => {
    if (!user?.id) return;
    removeBookmark.mutate({ id, lessonId: lesson.id, userId: user.id });
  }, [user?.id, lesson.id, removeBookmark]);

  const handleEnded = useCallback(() => {
    if (!settings?.autoplay_next) return;
    const currentIdx = lessons.findIndex((l) => l.id === lesson.id);
    const next = lessons[currentIdx + 1];
    if (next) {
      onNextLesson(next.id);
      toast.info(`Avançando para: ${next.title}`);
    }
  }, [settings?.autoplay_next, lessons, lesson.id, onNextLesson]);

  if (!url) {
    return (
      <div className="aspect-video w-full rounded-2xl glass flex flex-col items-center justify-center text-center p-6">
        <Lock className="h-8 w-8 text-muted-foreground/50 mb-3" />
        <div className="text-sm font-medium">Sem vídeo cadastrado</div>
        <div className="text-xs text-muted-foreground mt-1">
          Adicione a URL do vídeo em <span className="text-foreground">Admin → Módulos & Aulas → Editar aula</span>.
        </div>
      </div>
    );
  }

  // If it's an embeddable URL (YouTube, Vimeo, etc.), use iframe
  const embed = toEmbedUrl(url);
  if (embed) {
    return <EmbedPlayer embed={embed} title={lesson.title} poster={resolvedPoster} youtubeId={youtubeIdFromUrl(url)} />;
  }

  // Custom player for direct video files
  if (!resolvedUrl) {
    return (
      <div className="aspect-video w-full rounded-2xl bg-black border border-border flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Carregando player...</div>
      </div>
    );
  }

  return (
    <NebulaPlayer
      src={resolvedUrl}
      poster={resolvedPoster}
      title={lesson.title}
      captionsUrl={lesson.captions_url}
      chapters={lesson.chapters}
      settings={settings!}
      startAt={videoProgress?.current_time ?? 0}
      bookmarks={bookmarks}
      onProgress={handleProgress}
      onAddBookmark={handleAddBookmark}
      onRemoveBookmark={handleRemoveBookmark}
      onEnded={handleEnded}
    />
  );
}

function toEmbedUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");

    // YouTube
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      if (u.pathname.startsWith("/embed/")) return raw;
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith("/shorts/")) {
        const sid = u.pathname.split("/")[2];
        return sid ? `https://www.youtube.com/embed/${sid}` : null;
      }
    }

    // Vimeo
    if (host.endsWith("vimeo.com")) {
      if (host === "player.vimeo.com") return raw;
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }

    // Loom
    if (host.endsWith("loom.com")) {
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("share");
      const id = idx >= 0 ? parts[idx + 1] : parts[parts.length - 1];
      return id ? `https://www.loom.com/embed/${id}` : null;
    }

    // Bunny / iframe-ready providers — passa direto
    if (host.includes("mediadelivery.net") || host.includes("iframe.mediadelivery") || host.includes("b-cdn.net")) {
      return raw;
    }

    // arquivos diretos: deixa o <video> tratar
    if (/\.(mp4|webm|ogg|mov|m3u8)$/i.test(u.pathname)) return null;

    // fallback: tenta como iframe
    return raw;
  } catch {
    return null;
  }
}

function LessonAttachments({ lessonId }: { lessonId: string }) {
  type Attachment = { id: string; file_name: string; file_path: string; file_size: number; mime_type: string | null };
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("lesson_attachments")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("created_at")
      .then(({ data }) => setAttachments((data ?? []) as Attachment[]));
  }, [lessonId]);

  if (attachments.length === 0) return null;

  const handleDownload = async (att: Attachment) => {
    setDownloading(att.id);
    try {
      const url = await getAttachmentDownloadUrl(att.file_path);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.file_name;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      toast.error("Erro ao baixar arquivo");
    } finally {
      setDownloading(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Paperclip className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">Materiais para download</h3>
      </div>
      <div className="space-y-2">
        {attachments.map((att) => (
          <button
            key={att.id}
            onClick={() => handleDownload(att)}
            disabled={downloading === att.id}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-muted/50 transition text-left group disabled:opacity-50"
          >
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition">
              <Download className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{att.file_name}</div>
              <div className="text-[10px] text-muted-foreground">{formatSize(att.file_size)}</div>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0">
              {downloading === att.id ? "Baixando..." : "Download"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
