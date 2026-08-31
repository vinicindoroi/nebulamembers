import { createFileRoute, Link, Outlet, useChildMatches } from "@tanstack/react-router";
import { useMemo, useState, useDeferredValue } from "react";
import { Play, Search, Filter, BookOpen, CheckCircle2, Clock, X } from "lucide-react";
import { useCourses } from "@/hooks/use-courses";

export const Route = createFileRoute("/_app/courses")({
  component: CoursesPage,
  head: () => ({ meta: [{ title: "Cursos — Membros" }] }),
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
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cursos</h1>
          <p className="text-sm text-muted-foreground mt-1">Explore o catálogo e continue evoluindo.</p>
        </div>
        <div className="text-xs text-muted-foreground">
          {visible.length} de {courses.length} {courses.length === 1 ? "curso" : "cursos"}
        </div>
      </header>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar por título ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm outline-none focus:border-primary/40 transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10">
            {QUICK_FILTERS.map((f) => {
              const Icon = f.icon;
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition whitespace-nowrap ${
                    active ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <button
              onClick={() => setTag(null)}
              className={`text-[11px] px-2.5 py-1 rounded-full transition ${
                !tag ? "bg-primary/15 text-primary border border-primary/20" : "bg-white/5 text-muted-foreground hover:text-foreground border border-transparent"
              }`}
            >
              Todas categorias
            </button>
            {tags.map((t) => {
              const active = tag === t;
              return (
                <button
                  key={t}
                  onClick={() => setTag(active ? null : t)}
                  className={`text-[11px] px-2.5 py-1 rounded-full transition ${
                    active ? "bg-primary/15 text-primary border border-primary/20" : "bg-white/5 text-muted-foreground hover:text-foreground border border-transparent"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] animate-pulse">
              <div className="aspect-[16/10] bg-white/[0.02]" />
              <div className="p-4 space-y-2">
                <div className="h-3 w-3/4 bg-white/5 rounded" />
                <div className="h-2 w-full bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <div className="text-sm font-medium">Nenhum curso encontrado</div>
          <div className="text-xs text-muted-foreground mt-1">
            {search ? "Tente ajustar os filtros ou a busca." : "Nenhum curso corresponde a estes filtros."}
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {visible.map((c) => (
            <Link
              key={c.id}
              to="/courses/$courseId"
              params={{ courseId: c.id }}
              className="group rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden hover:border-white/10 transition"
            >
              <div className="aspect-[16/10] relative overflow-hidden">
                {c.cover_url && (
                  <img src={c.cover_url} alt={c.title} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${c.gradient_from || "#6366f1"}, ${(c.gradient_to || "#8b5cf6")}00)` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                  {c.tag && (
                    <span className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white/90 mb-2 font-medium">{c.tag}</span>
                  )}
                  <h3 className="text-white font-semibold text-sm leading-tight drop-shadow-lg">{c.title}</h3>
                  {c.description && <p className="text-white/70 text-[11px] mt-1 line-clamp-2 max-w-[85%]">{c.description}</p>}
                </div>
                {c.tag && (
                  <span className="absolute top-3 left-3 bg-black/40 backdrop-blur-md text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-medium">
                    {c.tag}
                  </span>
                )}
                {c.progress === 100 && (
                  <span className="absolute top-3 right-3 bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-medium text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />Concluído
                  </span>
                )}
                <div className="absolute bottom-3 right-3 h-11 w-11 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-90 transition">
                  <Play className="h-4 w-4 text-white" fill="currentColor" />
                </div>
              </div>
              <div className="p-4">
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full gradient-primary transition-all" style={{ width: `${c.progress}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{c.progress}%</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
