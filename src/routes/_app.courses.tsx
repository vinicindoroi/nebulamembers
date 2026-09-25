import { createFileRoute, Link, Outlet, useChildMatches } from "@tanstack/react-router";
import { useMemo, useState, useDeferredValue } from "react";
import { Play, Search, BookOpen, CheckCircle2, Clock, X } from "lucide-react";
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
      if (deferredSearch && !c.title.toLowerCase().includes(deferredSearch.toLowerCase()) && !(c.description ?? "").toLowerCase().includes(deferredSearch.toLowerCase())) return false;
      return true;
    });
  }, [courses, filter, tag, deferredSearch]);

  return (
    <div className="courses-catalog mx-auto w-full max-w-[1600px] space-y-10 pb-10 sm:space-y-12">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 pt-1 sm:flex sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="font-course-display text-3xl font-bold sm:text-4xl">Cursos</h1>
          <p className="text-sm font-medium text-muted-foreground sm:text-base">Explore o catálogo e continue evoluindo.</p>
        </div>
        <div className="shrink-0 rounded-full border border-border bg-card/60 px-4 py-2 text-xs font-semibold text-muted-foreground backdrop-blur-sm">
          {visible.length} de {courses.length} {courses.length === 1 ? "curso" : "cursos"}
        </div>
      </header>

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
          <div className="flex w-full gap-2 overflow-x-auto pb-1 lg:pb-0">
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
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
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
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-[78%] shrink-0 snap-start sm:w-auto">
              <div className="aspect-video rounded-xl border border-border bg-card" />
              <div className="space-y-3 pt-4">
                <div className="h-4 w-3/4 rounded bg-muted/40" />
                <div className="h-2 w-full rounded bg-muted/40" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <div className="text-sm font-medium">Nenhum curso encontrado</div>
          <div className="text-xs text-muted-foreground mt-1">
            {search ? "Tente ajustar os filtros ou a busca." : "Nenhum curso corresponde a estes filtros."}
          </div>
        </div>
      ) : (
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((c) => (
            <Link
              key={c.id}
              to="/courses/$courseId"
              params={{ courseId: c.id }}
              className="group min-w-0 w-[78%] shrink-0 snap-start sm:w-auto"
            >
              <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-card transition duration-500 group-hover:scale-[1.03] group-hover:border-primary/45 group-hover:shadow-[0_18px_50px_-24px_var(--primary)] motion-reduce:transform-none motion-reduce:transition-none">
                {c.cover_url && (
                  <img src={c.cover_url} alt={c.title} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105 motion-reduce:transform-none" />
                )}
                {c.gradient_from && c.gradient_to && (
                  <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${c.gradient_from}, ${c.gradient_to}00)` }} />
                )}
                {c.progress === 100 && (
                  <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md border border-primary/30 bg-background/75 px-2 py-1 text-[10px] font-semibold uppercase text-primary backdrop-blur-md">
                    <CheckCircle2 className="h-3 w-3" />Concluído
                  </span>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-background/10 opacity-0 transition duration-300 group-hover:opacity-100 max-sm:opacity-100">
                  <div className="flex h-12 w-12 scale-90 items-center justify-center rounded-full bg-foreground text-background shadow-xl transition duration-300 group-hover:scale-100 max-sm:scale-100">
                    <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                  </div>
                </div>
              </div>
              <div className="space-y-3 pt-4">
                {(c as any).title_visible !== false && (
                  <div className="min-w-0">
                    <h2 className="font-course-display truncate text-base font-bold transition-colors group-hover:text-primary sm:text-lg">{c.title}</h2>
                    {c.description && <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{c.description}</p>}
                  </div>
                )}
                <div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${c.progress}%` }} />
                  </div>
                  <div className="mt-2 text-[10px] font-semibold uppercase text-muted-foreground">
                    {c.progress === 0 ? "Não iniciado" : c.progress === 100 ? "Concluído" : `${c.progress}% concluído`}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
