import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Play, ArrowLeft, Lock, Download, Paperclip, Clock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useAddXp } from "@/hooks/use-xp";
import { NebulaPlayer, type Chapter } from "@/components/player/NebulaPlayer";
import { LessonComments } from "@/components/lessons/LessonComments";
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
  module_id: string | null;
};

type Module = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  is_premium: boolean | null;
  offer_id: string | null;
  cover_url: string | null;
};

const premiumGradients = [
  "from-indigo-600/30 via-violet-600/10 to-[#0c0c0e]/90 border-indigo-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_30px_rgba(99,102,241,0.15)]",
  "from-rose-600/30 via-pink-600/10 to-[#0c0c0e]/90 border-rose-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_30px_rgba(244,63,94,0.15)]",
  "from-emerald-600/30 via-teal-600/10 to-[#0c0c0e]/90 border-emerald-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_30px_rgba(16,185,129,0.15)]",
  "from-cyan-600/30 via-blue-600/10 to-[#0c0c0e]/90 border-cyan-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_30px_rgba(6,182,212,0.15)]",
  "from-amber-600/30 via-orange-600/10 to-[#0c0c0e]/90 border-amber-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_30px_rgba(245,158,11,0.15)]",
  "from-fuchsia-600/30 via-purple-600/10 to-[#0c0c0e]/90 border-fuchsia-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_30px_rgba(217,70,239,0.15)]",
];

function CourseDetail() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["course", courseId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [c, m, l, p, o, prof] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).eq("status", "published").single(),
        supabase.from("modules").select("*").eq("course_id", courseId).order("position"),
        supabase.from("lessons").select("*").eq("course_id", courseId).order("position"),
        supabase.from("lesson_progress").select("lesson_id").eq("user_id", user!.id),
        supabase.from("offers").select("*").eq("active", true),
        (supabase as any).from("profiles").select("plan").eq("id", user!.id).maybeSingle(),
      ]);
      if (c.error) throw c.error;
      if (l.error) throw l.error;
      const done = new Set((p.data ?? []).map((x) => x.lesson_id));
      return {
        course: c.data,
        modules: (m.data ?? []) as Module[],
        lessons: (l.data ?? []) as unknown as Lesson[],
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

  // Access level logic: check user plan against course access_level
  const planHierarchy: Record<string, number> = { free: 0, pro: 1, premium: 2 };
  const userLevel = planHierarchy[userPlan] ?? 0;
  const courseAccessLevel = (course.access_level ?? "free").toLowerCase();
  const courseLevel = planHierarchy[courseAccessLevel] ?? 0;
  const accessDenied = userLevel < courseLevel;

  // Premium offer logic (for individual lessons/modules with offer_id)
  const getOffer = (offerId: string | null | undefined) => offers.find((o) => o.id === offerId);
  const activeModule = modules.find((m) => m.id === activeLesson?.module_id);
  const modulePremium = activeModule?.is_premium && activeModule?.offer_id;
  const lessonPremium = activeLesson?.is_premium && activeLesson?.offer_id;
  const premiumOfferId = lessonPremium ? activeLesson.offer_id : modulePremium ? activeModule.offer_id : null;
  const premiumOffer = premiumOfferId ? getOffer(premiumOfferId) : null;
  const isLocked = accessDenied || !!premiumOffer;

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
    <div className="space-y-6 animate-fade-up">
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

      <header className="glass-strong rounded-2xl overflow-hidden relative">
        <div className="absolute inset-0">
          {course.cover_url && (
            <img src={course.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${course.gradient_from || "#6366f1"}, ${(course.gradient_to || "#8b5cf6")}00)` }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
        </div>
        <div className="relative p-6">
          {course.tag && <span className="text-[10px] uppercase tracking-wider text-primary bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full">{course.tag}</span>}
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1 text-white drop-shadow-lg">{course.title}</h1>
          {course.description && <p className="text-sm text-white/70 mt-2">{course.description}</p>}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full gradient-primary" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-white/80">{completed}/{total} • {progress}%</span>
          </div>
        </div>
      </header>

      {total === 0 ? (
        <div className="glass rounded-2xl p-8 text-sm text-muted-foreground text-center">
          Este curso ainda não possui aulas. Adicione aulas em <span className="text-foreground">Admin → Módulos & Aulas</span>.
        </div>
      ) : activeLessonId === null ? (
        <div className="space-y-6">
          {/* CTA Card */}
          <div className="relative overflow-hidden rounded-2xl p-6 border border-primary/20 bg-gradient-to-r from-primary/10 via-purple-500/5 to-transparent backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_12px_40px_-12px_rgba(99,102,241,0.25)]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
            <div className="relative z-10 space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-primary font-bold bg-primary/10 px-2.5 py-1 rounded-full">Status do Progresso</span>
              <h2 className="text-xl font-bold text-white mt-2">Navegue pelos módulos</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isStarted ? `Você completou ${completed} de ${total} aulas. Continue de onde parou!` : "Comece a sua jornada agora mesmo!"}
              </p>
            </div>
            {firstUncompletedLesson && (
              <button
                onClick={() => setActiveLessonId(firstUncompletedLesson.id)}
                className="relative z-10 gradient-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 hover:scale-[1.02] transition active:scale-[0.98] shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)] shrink-0 cursor-pointer group"
              >
                <Play className="h-4 w-4 transition-transform group-hover:scale-110" fill="currentColor" />
                {isStarted ? "Continuar de onde parou" : "Começar a Assistir"}
              </button>
            )}
          </div>

          {/* Módulos do Curso - Estilo Netflix */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-1">
              Selecione o Módulo
            </h3>
            <div className="flex overflow-x-auto gap-4 pt-2 pb-5 px-2 -mx-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {grouped.map(({ mod, items }, idx) => {
                const isSelected = (mod?.id ?? "orphans") === currentModuleId;
                const modLessons = items;
                const modCompleted = modLessons.filter((l) => done.has(l.id)).length;
                const modTotal = modLessons.length;
                const modProgress = modTotal ? Math.round((modCompleted / modTotal) * 100) : 0;
                
                const gradient = premiumGradients[idx % premiumGradients.length];

                return (
                  <button
                    key={mod?.id ?? "orphans"}
                    onClick={() => setSelectedModuleId(mod?.id ?? "orphans")}
                    className={`relative w-64 aspect-[14/9] shrink-0 rounded-2xl border text-left overflow-hidden transition-all duration-300 group cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 ${
                      isSelected
                        ? "border-primary shadow-[0_0_25px_rgba(99,102,241,0.25)] ring-1 ring-primary/50"
                        : "border-white/5 hover:border-white/15 bg-white/[0.01]"
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
                        {/* Dark glassmorphic/gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e]/90 via-[#0c0c0e]/40 to-[#0c0c0e]/10 group-hover:from-[#0c0c0e]/95 transition-all" />
                      </>
                    ) : (
                      /* Dynamic cover gradient overlay fallback */
                      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90 group-hover:opacity-100 transition-opacity`} />
                    )}
                    
                    {/* Nebula grid overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
                    
                    {/* Content */}
                    <div className="absolute inset-0 p-4 flex flex-col justify-between z-10">
                      <div className="flex items-start justify-between">
                        <span className="text-[9px] uppercase tracking-wider text-white/80 font-bold bg-white/10 backdrop-blur-md px-2 py-0.5 rounded border border-white/10">
                          {mod?.position !== undefined ? `Módulo ${String(mod.position + 1).padStart(2, "0")}` : "Extra"}
                        </span>
                        {mod?.is_premium && (
                          <span className="p-1 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400">
                            <Lock className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1 mt-auto">
                        <h4 className="font-bold text-white text-sm md:text-base leading-snug line-clamp-2 drop-shadow-md group-hover:text-primary-light transition-colors">
                          {mod?.title ?? "Aulas sem módulo"}
                        </h4>
                        <p className="text-[11px] text-white/50">
                          {modTotal} {modTotal === 1 ? "aula" : "aulas"}
                        </p>
                      </div>
                      
                      {/* Integrated progress bar at the bottom */}
                      <div className="space-y-1 mt-2">
                        <div className="flex justify-between items-center text-[9px] text-white/60">
                          <span>{modCompleted}/{modTotal} concluídas</span>
                          <span>{modProgress}%</span>
                        </div>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full gradient-primary" style={{ width: `${modProgress}%` }} />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeline do Módulo Ativo */}
          {activeGroup && (
            <div className="glass rounded-2xl p-6 border border-white/5 space-y-6 animate-fade-in">
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-primary font-bold bg-primary/10 px-2.5 py-1 rounded-full">
                          {mod?.position !== undefined ? `Módulo ${String(mod.position + 1).padStart(2, "0")}` : "Extra"}
                        </span>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 mt-2">
                          {mod?.title ?? "Aulas sem módulo"}
                          {mod?.is_premium && <Lock className="h-4 w-4 text-amber-400" />}
                        </h3>
                        {mod?.description && <p className="text-sm text-muted-foreground mt-1">{mod.description}</p>}
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {modCompleted}/{modTotal} concluídas
                        </span>
                        <div className="relative h-12 w-12 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.15)] rounded-full bg-white/[0.02] border border-white/5">
                          <svg className="w-12 h-12 transform -rotate-90">
                            <circle cx="24" cy="24" r={radius} className="stroke-white/5" strokeWidth="2.5" fill="transparent" />
                            <circle
                              cx="24"
                              cy="24"
                              r={radius}
                              className="stroke-primary transition-all duration-500 drop-shadow-[0_0_4px_rgba(99,102,241,0.5)]"
                              strokeWidth="2.5"
                              fill="transparent"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute text-[10px] font-bold text-white">{modProgress}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Vertical Timeline pathway for Active Module's Lessons */}
                    <div className="relative pl-6 sm:pl-8 border-l border-white/10 space-y-4 ml-3 sm:ml-5 mt-4">
                      {modLessons.map((l, idx) => {
                        const isDone = done.has(l.id);
                        const lMod = modules.find((m) => m.id === l.module_id);
                        const lLocked = accessDenied || (l.is_premium && l.offer_id) || (lMod?.is_premium && lMod?.offer_id);
                        return (
                          <div key={l.id} className="relative group">
                            {/* Bullet centered exactly on the vertical border line */}
                            <div className={`absolute -left-[38px] sm:-left-[46px] top-[12px] h-7 w-7 rounded-full flex items-center justify-center border transition-all duration-300 z-10 bg-[#0c0c0e] ${
                              lLocked
                                ? "border-amber-500/30 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                                : isDone
                                  ? "gradient-primary border-transparent text-primary-foreground shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                                  : "border-white/10 text-muted-foreground group-hover:border-primary/50 group-hover:text-primary group-hover:shadow-[0_0_12px_rgba(99,102,241,0.2)]"
                            }`}>
                              {lLocked ? (
                                <Lock className="h-3 w-3" />
                              ) : isDone ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <Play className="h-3 w-3" fill="currentColor" />
                              )}
                            </div>

                            <button
                              onClick={() => setActiveLessonId(l.id)}
                              className="w-full text-left p-4 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-primary/20 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group-hover:translate-x-1"
                            >
                              <div className="space-y-1">
                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                  Aula {String(idx + 1).padStart(2, "0")}
                                </span>
                                <h4 className="text-sm font-semibold text-white group-hover:text-primary transition-colors">
                                  {l.title}
                                </h4>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/[0.02] px-2.5 py-1 rounded-md border border-white/5">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>{l.duration ?? l.duration_min ?? 0} min</span>
                                </div>

                                {l.is_free && (
                                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 uppercase font-semibold border border-emerald-500/20">
                                    Grátis
                                  </span>
                                )}
                                {lLocked && !l.is_free && (
                                  <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 uppercase font-semibold border border-amber-500/20">
                                    Premium
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
            </div>
          )}
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
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

            <div className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[11px] text-muted-foreground">
                    Aula {(activeLesson.position ?? 0) + 1}
                    {activeLesson.duration || activeLesson.duration_min
                      ? ` • ${activeLesson.duration ?? activeLesson.duration_min} min`
                      : ""}
                  </div>
                  <h2 className="text-lg font-semibold mt-1">{activeLesson.title}</h2>
                </div>
                <button
                  onClick={() =>
                    toggle.mutate({ lessonId: activeLesson.id, completed: done.has(activeLesson.id) })
                  }
                  disabled={toggle.isPending}
                  className={`shrink-0 text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition ${
                    done.has(activeLesson.id)
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "gradient-primary text-primary-foreground"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                  {done.has(activeLesson.id) ? "Concluída" : "Marcar como concluída"}
                </button>
              </div>

              {activeLesson.description && (
                <div 
                  className="text-sm text-muted-foreground mt-4 prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: activeLesson.description }}
                />
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
          <aside className="glass rounded-2xl p-3 h-fit lg:sticky lg:top-4">
            <div className="px-2 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              Conteúdo do curso
            </div>
            <div className="space-y-3">
              {grouped.map(({ mod, items }) => (
                <div key={mod?.id ?? "orphans"}>
                  {mod && (
                    <div className="px-2 pt-2 pb-1 text-xs font-medium text-foreground/80 flex items-center gap-2">
                      {mod.title}
                      {mod.is_premium && <Lock className="h-3 w-3 text-amber-400" />}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {items.map((l, i) => {
                      const isDone = done.has(l.id);
                      const isActive = l.id === activeLesson.id;
                      const lMod = modules.find((m) => m.id === l.module_id);
                      const lLocked = accessDenied || (l.is_premium && l.offer_id) || (lMod?.is_premium && lMod?.offer_id);
                      return (
                        <button
                          key={l.id}
                          onClick={() => setActiveLessonId(l.id)}
                          className={`w-full text-left px-2 py-2 rounded-lg flex items-center gap-3 transition ${
                            isActive ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
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
                                    : "bg-white/5 text-muted-foreground"
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
    return (
      <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10">
        <iframe
          key={embed}
          src={embed}
          title={lesson.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  // Custom player for direct video files
  if (!resolvedUrl) {
    return (
      <div className="aspect-video w-full rounded-2xl bg-black border border-white/10 flex items-center justify-center">
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
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-primary/30 hover:bg-white/[0.05] transition text-left group disabled:opacity-50"
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
