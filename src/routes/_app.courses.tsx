import { createFileRoute, Link, Outlet, useChildMatches } from "@tanstack/react-router";
import { useMemo, useState, useDeferredValue, useRef } from "react";
import { Play, Search, BookOpen, CheckCircle2, Clock, X, ChevronLeft, ChevronRight } from "lucide-react";
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
  const catalogRef = useRef<HTMLDivElement>(null);
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

  const featured = visible[0];

  const scrollCatalog = (direction: -1 | 1) => {
    const catalog = catalogRef.current;
    if (!catalog) return;
    catalog.scrollBy({ left: direction * Math.max(catalog.clientWidth * 0.8, 280), behavior: "smooth" });
  };

  return (
    <div className="courses-catalog mx-auto w-full max-w-[1600px] space-y-8 pb-12">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 pt-1 sm:flex sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="font-course-display text-3xl font-bold sm:text-4xl">Cursos</h1>
          <p className="text-sm font-medium text-muted-foreground sm:text-base">Explore o catálogo e continue evoluindo.</p>
        </div>
        <div className="shrink-0 rounded-full border border-border bg-card/60 px-4 py-2 text-xs font-semibold text-muted-foreground backdrop-blur-sm">
          {visible.length} de {courses.length} {courses.length === 1 ? "curso" : "cursos"}
        </div>
      </header>

      <div className="space-y-3">
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
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-6 sm:mx-0 sm:px-0">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-[82%] shrink-0 snap-start sm:w-[42%] lg:w-[29%] xl:w-[23%]">
              <div className="aspect-video rounded-md border border-border bg-card" />
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
      ) : featured && (
        <div className="space-y-8">
          <Link
            to="/courses/$courseId"
            params={{ courseId: featured.id }}
            className="group relative block min-h-72 overflow-hidden rounded-md border border-border bg-card sm:min-h-96 lg:min-h-[28rem]"
          >
            {featured.cover_url && (
              <>
                <img src={featured.cover_url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-xl" />
                <img src={featured.cover_url} alt={featured.title} className="absolute inset-0 h-full w-full object-cover object-center" />
              </>
            )}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--background)_0%,color-mix(in_oklab,var(--background)_88%,transparent)_32%,color-mix(in_oklab,var(--background)_28%,transparent)_72%,transparent_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(0deg,var(--background)_0%,transparent_55%)]" />
            <div className="relative flex min-h-72 max-w-xl flex-col justify-end p-6 sm:min-h-96 sm:p-10 lg:min-h-[28rem] lg:p-12">
              <span className="mb-3 text-xs font-bold uppercase text-primary">Em destaque</span>
              {(featured as any).title_visible !== false && <h2 className="font-course-display text-3xl font-bold sm:text-5xl">{featured.title}</h2>}
              {featured.description && <p className="mt-3 line-clamp-2 max-w-lg text-sm text-foreground/75 sm:text-base">{featured.description}</p>}
              <div className="mt-6 flex items-center gap-3">
                <Button className="h-11 px-5"><Play className="h-4 w-4" fill="currentColor" />{featured.progress > 0 ? "Continuar" : "Assistir agora"}</Button>
                <span className="text-xs font-semibold text-muted-foreground">{featured.progress > 0 ? `${featured.progress}% concluído` : "Comece agora"}</span>
              </div>
            </div>
          </Link>

          <section className="space-y-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <h2 className="font-course-display text-xl font-bold sm:text-2xl">Explore o catálogo</h2>
              <div className="flex shrink-0 items-center gap-2">
                <Button type="button" variant="outline" size="icon" aria-label="Cursos anteriores" onClick={() => scrollCatalog(-1)} className="h-9 w-9 rounded-full">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button type="button" variant="outline" size="icon" aria-label="Próximos cursos" onClick={() => scrollCatalog(1)} className="h-9 w-9 rounded-full">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div
              ref={catalogRef}
              onWheel={(event) => {
                const catalog = catalogRef.current;
                if (!catalog || catalog.scrollWidth <= catalog.clientWidth) return;
                if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                  event.preventDefault();
                  catalog.scrollLeft += event.deltaY;
                }
              }}
              className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-8 pt-2 touch-pan-x sm:mx-0 sm:px-0"
            >
              {visible.map((c) => (
                <Link key={c.id} to="/courses/$courseId" params={{ courseId: c.id }} className="group min-w-0 w-[82%] shrink-0 snap-start sm:w-[42%] lg:w-[29%] xl:w-[23%]">
                  <div className="relative aspect-video overflow-hidden rounded-md border border-border bg-card transition duration-300 group-hover:z-10 group-hover:scale-[1.06] group-hover:border-primary/50 group-hover:shadow-[0_22px_60px_-25px_var(--primary)] motion-reduce:transform-none">
                    {c.cover_url && <img src={c.cover_url} alt={c.title} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105 motion-reduce:transform-none" />}
                    <div className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_oklab,var(--background)_92%,transparent)_0%,transparent_55%)] opacity-70 transition group-hover:opacity-100" />
                    {c.progress === 100 && <span className="absolute right-2 top-2 flex items-center gap-1 rounded border border-primary/30 bg-background/80 px-2 py-1 text-[9px] font-bold uppercase text-primary backdrop-blur-md"><CheckCircle2 className="h-3 w-3" />Concluído</span>}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-200 group-hover:opacity-100 max-sm:opacity-100">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background shadow-xl"><Play className="ml-0.5 h-4 w-4" fill="currentColor" /></div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-3">
                    {(c as any).title_visible !== false && <h3 className="font-course-display truncate text-sm font-bold transition-colors group-hover:text-primary sm:text-base">{c.title}</h3>}
                    <div className="h-0.5 overflow-hidden bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${c.progress}%` }} /></div>
                    <div className="text-[9px] font-semibold uppercase text-muted-foreground">{c.progress === 0 ? "Não iniciado" : c.progress === 100 ? "Concluído" : `${c.progress}% concluído`}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
