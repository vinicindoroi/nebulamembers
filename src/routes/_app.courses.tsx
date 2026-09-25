import { createFileRoute, Link, Outlet, useChildMatches, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState, useDeferredValue } from "react";
import { Play, Search, BookOpen, CheckCircle2, Clock, X, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { useCourses } from "@/hooks/use-courses";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/courses")({
  component: CoursesPage,
  head: () => ({
    meta: [
      { title: "Cursos — Nebula Members" },
      { name: "description", content: "Explore os cursos disponíveis na área de membros Nebula." },
      { property: "og:title", content: "Cursos — Nebula Members" },
      { property: "og:description", content: "Explore os cursos disponíveis na área de membros Nebula." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function CoursesPage() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) return <Outlet />;
  return <CoursesList />;
}

const QUICK_FILTERS = [
  { id: "all", label: "Todos", icon: BookOpen },
  { id: "progress", label: "Em andamento", icon: Clock },
  { id: "done", label: "Concluídos", icon: CheckCircle2 },
  { id: "new", label: "Não iniciados", icon: Play },
] as const;


function CoursesList() {
  const [filter, setFilter] = useState<string>("all");
  const [tag, setTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const { data: courses = [], isLoading } = useCourses();

  const tags = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => c.tag && set.add(c.tag));
    return Array.from(set);
  }, [courses]);

  const visible = useMemo(() => {
    return courses.filter((c) => {
      if (filter === "progress" && !(c.progress > 0 && c.progress < 100)) return false;
      if (filter === "done" && c.progress !== 100) return false;
      if (filter === "new" && c.progress !== 0) return false;
      if (tag && c.tag !== tag) return false;
      if (
        deferredSearch &&
        !c.title.toLowerCase().includes(deferredSearch.toLowerCase()) &&
        !(c.description ?? "").toLowerCase().includes(deferredSearch.toLowerCase())
      )
        return false;
      return true;
    });
  }, [courses, filter, tag, deferredSearch]);

  const isBrowsing = filter === "all" && !tag && !deferredSearch;

  const featured = useMemo(() => {
    if (!visible.length) return null;
    const inProgress = visible.filter((c) => c.progress > 0 && c.progress < 100);
    if (inProgress.length) return inProgress.sort((a, b) => b.progress - a.progress)[0];
    return visible[0];
  }, [visible]);

  const rows = useMemo(() => {
    if (!isBrowsing) return [];
    const list: { key: string; title: string; items: typeof visible }[] = [];
    const cont = visible.filter((c) => c.progress > 0 && c.progress < 100);
    if (cont.length) list.push({ key: "continue", title: "Continuar assistindo", items: cont });
    tags.forEach((t) => {
      const items = visible.filter((c) => c.tag === t);
      if (items.length) list.push({ key: `tag-${t}`, title: t, items });
    });
    const news = visible.filter((c) => c.progress === 0);
    if (news.length) list.push({ key: "new", title: "Novidades para você", items: news });
    list.push({ key: "all", title: "Todos os cursos", items: visible });
    return list;
  }, [visible, tags, isBrowsing]);

  return (
    <div className="courses-catalog mx-auto w-full max-w-[1600px] space-y-10 pb-12">
      {!isLoading && featured && <Spotlight course={featured} />}

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar por título ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-10 text-sm outline-hidden transition focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Limpar busca"
                onClick={() => setSearch("")}
                className="absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="no-scrollbar flex w-full gap-2 overflow-x-auto pb-1 lg:pb-0">
            {QUICK_FILTERS.map((f) => {
              const Icon = f.icon;
              const active = filter === f.id;
              return (
                <Button
                  type="button"
                  variant={active ? "default" : "outline"}
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className="h-12 shrink-0 rounded-xl px-4 text-xs sm:text-sm"
                >
                  <Icon className="h-4 w-4" />
                  <span>{f.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {tags.length > 0 && (
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
            <Button
              type="button"
              size="sm"
              variant={!tag ? "default" : "outline"}
              onClick={() => setTag(null)}
              className="shrink-0 rounded-full px-4"
            >
              Todas categorias
            </Button>
            {tags.map((t) => {
              const active = tag === t;
              return (
                <Button
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  key={t}
                  onClick={() => setTag(active ? null : t)}
                  className="shrink-0 rounded-full px-4"
                >
                  {t}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-[72%] shrink-0 sm:w-[300px]">
              <div className="aspect-video animate-pulse rounded-xl border border-border bg-card" />
              <div className="space-y-3 pt-4">
                <div className="h-4 w-3/4 rounded bg-muted/40" />
                <div className="h-2 w-full rounded bg-muted/40" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <div className="text-sm font-medium">Nenhum curso encontrado</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {search ? "Tente ajustar os filtros ou a busca." : "Nenhum curso corresponde a estes filtros."}
          </div>
        </div>
      ) : isBrowsing ? (
        <div className="space-y-10">
          {rows.map((row) => (
            <CourseRow key={row.key} title={row.title} items={row.items} />
          ))}
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-course-display text-lg font-bold sm:text-xl">Resultados</h2>
            <span className="shrink-0 text-xs font-semibold text-muted-foreground">
              {visible.length} de {courses.length} {courses.length === 1 ? "curso" : "cursos"}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Spotlight({ course }: { course: any }) {
  const navigate = useNavigate();
  const go = () => navigate({ to: "/courses/$courseId", params: { courseId: course.id } });
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative min-h-[15rem] sm:min-h-[22rem] lg:min-h-[26rem]">
        {course.cover_url && (
          <img
            src={course.cover_url}
            alt={course.title}
            className="absolute inset-0 h-full w-full scale-105 object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
        <div className="relative flex min-h-[15rem] flex-col justify-end gap-4 p-5 sm:min-h-[22rem] sm:p-8 lg:min-h-[26rem] lg:max-w-2xl lg:p-12">
          <span className="w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            {course.progress > 0 ? "Continue de onde parou" : "Em destaque"}
          </span>
          {course.title_visible !== false && (
            <h1 className="font-course-display text-2xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              {course.title}
            </h1>
          )}
          {course.description && (
            <p className="line-clamp-2 max-w-xl text-sm text-muted-foreground sm:text-base">{course.description}</p>
          )}
          {course.progress > 0 && (
            <div className="max-w-sm">
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${course.progress}%` }} />
              </div>
              <div className="mt-2 text-[10px] font-semibold uppercase text-muted-foreground">
                {course.progress}% concluído
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-3 pt-1">
            <Button type="button" onClick={go} className="h-11 rounded-xl px-6 font-semibold">
              <Play className="h-4 w-4" fill="currentColor" />
              {course.progress > 0 ? "Continuar" : "Assistir agora"}
            </Button>
            <Button type="button" variant="outline" onClick={go} className="h-11 rounded-xl px-5">
              <Info className="h-4 w-4" />
              Mais informações
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function CourseRow({ title, items }: { title: string; items: any[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.85, 240), behavior: "smooth" });
  };
  return (
    <section className="group/row space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-course-display text-lg font-bold capitalize sm:text-xl">{title}</h2>
        <div className="hidden shrink-0 gap-1 sm:flex">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Rolar para a esquerda"
            onClick={() => scrollBy(-1)}
            className="h-9 w-9 rounded-full opacity-0 transition group-hover/row:opacity-100 focus-visible:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Rolar para a direita"
            onClick={() => scrollBy(1)}
            className="h-9 w-9 rounded-full opacity-0 transition group-hover/row:opacity-100 focus-visible:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        ref={ref}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
      >
        {items.map((c) => (
          <CourseCard key={c.id} course={c} className="w-[72%] shrink-0 snap-start sm:w-[300px]" />
        ))}
      </div>
    </section>
  );
}

function CourseCard({ course: c, className = "" }: { course: any; className?: string }) {
  return (
    <Link
      to="/courses/$courseId"
      params={{ courseId: c.id }}
      className={`group min-w-0 ${className}`}
    >
      <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-card transition duration-500 group-hover:scale-[1.04] group-hover:border-primary/45 group-hover:shadow-[0_18px_50px_-24px_var(--primary)] motion-reduce:transform-none motion-reduce:transition-none">
        {c.cover_url && (
          <img
            src={c.cover_url}
            alt={c.title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105 motion-reduce:transform-none"
          />
        )}
        {c.gradient_from && c.gradient_to && (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to top, ${c.gradient_from}, ${c.gradient_to}00)` }}
          />
        )}
        {c.progress === 100 && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md border border-primary/30 bg-background/75 px-2 py-1 text-[10px] font-semibold uppercase text-primary backdrop-blur-md">
            <CheckCircle2 className="h-3 w-3" />
            Concluído
          </span>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-background/10 opacity-0 transition duration-300 group-hover:opacity-100 max-sm:opacity-100">
          <div className="flex h-12 w-12 scale-90 items-center justify-center rounded-full bg-foreground text-background shadow-xl transition duration-300 group-hover:scale-100 max-sm:scale-100">
            <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
          </div>
        </div>
        {c.progress > 0 && c.progress < 100 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-background/50">
            <div className="h-full bg-primary" style={{ width: `${c.progress}%` }} />
          </div>
        )}
      </div>
      <div className="space-y-2 pt-3">
        {c.title_visible !== false && (
          <div className="min-w-0">
            <h3 className="font-course-display truncate text-sm font-bold transition-colors group-hover:text-primary sm:text-base">
              {c.title}
            </h3>
            {c.description && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{c.description}</p>}
          </div>
        )}
        <div className="text-[10px] font-semibold uppercase text-muted-foreground">
          {c.progress === 0 ? "Não iniciado" : c.progress === 100 ? "Concluído" : `${c.progress}% concluído`}
        </div>
      </div>
    </Link>
  );
}
