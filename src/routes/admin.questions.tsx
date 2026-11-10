import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, HelpCircle, Loader2, MessageCircle, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { waLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/admin/questions")({
  head: () => ({
    meta: [
      { title: "Dúvidas das aulas — Admin Nebula Members" },
      { name: "description", content: "Responda as dúvidas privadas que os alunos enviam em cada aula." },
      { property: "og:title", content: "Dúvidas das aulas — Admin Nebula Members" },
      { property: "og:description", content: "Responda as dúvidas privadas que os alunos enviam em cada aula." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuestionsPage,
});

type Q = { id: string; lesson_id: string; user_id: string; content: string; answer: string | null; answered_at: string | null; created_at: string };
type Profile = { id: string; full_name: string | null; email: string | null; phone: string | null };
type LessonInfo = { id: string; title: string; course_id: string };

const FILTERS = [
  { id: "open", label: "Sem resposta" },
  { id: "answered", label: "Respondidas" },
  { id: "all", label: "Todas" },
] as const;

function QuestionsPage() {
  const [rows, setRows] = useState<Q[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [lessons, setLessons] = useState<Record<string, LessonInfo>>({});
  const [courses, setCourses] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("open");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data, error } = await supabase.from("lesson_questions").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) { toast.error("Erro ao carregar dúvidas."); setLoading(false); return; }
    const list = (data ?? []) as Q[];
    setRows(list);
    const lessonIds = [...new Set(list.map((q) => q.lesson_id))];
    const [p, l] = await Promise.all([
      (supabase as any).rpc("admin_list_profiles"),
      lessonIds.length ? supabase.from("lessons").select("id, title, course_id").in("id", lessonIds) : Promise.resolve({ data: [] }),
    ]);
    setProfiles(Object.fromEntries(((p.data ?? []) as Profile[]).map((x) => [x.id, x])));
    const ls = (l.data ?? []) as LessonInfo[];
    setLessons(Object.fromEntries(ls.map((x) => [x.id, x])));
    const courseIds = [...new Set(ls.map((x) => x.course_id))];
    if (courseIds.length) {
      const { data: c } = await supabase.from("courses").select("id, title").in("id", courseIds);
      setCourses(Object.fromEntries((c ?? []).map((x) => [x.id, x.title])));
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    open: rows.filter((r) => !r.answer).length,
    answered: rows.filter((r) => !!r.answer).length,
    all: rows.length,
  }), [rows]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows
      .filter((r) => (filter === "open" ? !r.answer : filter === "answered" ? !!r.answer : true))
      .filter((r) => {
        if (!s) return true;
        const p = profiles[r.user_id];
        const l = lessons[r.lesson_id];
        return [r.content, r.answer, p?.full_name, p?.email, l?.title, l && courses[l.course_id]].some((x) => x?.toLowerCase().includes(s));
      })
      .sort((a, b) => filter === "open" ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at));
  }, [rows, filter, search, profiles, lessons, courses]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><HelpCircle className="h-6 w-6 text-primary" /> Dúvidas das aulas</h1>
        <p className="text-sm text-muted-foreground">Perguntas privadas que os alunos mandam embaixo das aulas. Só você e o aluno veem. Ele recebe um aviso quando você responde.</p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${filter === f.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f.label} <span className="ml-1 tabular-nums opacity-70">{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por aluno, aula ou texto" className="pl-9" />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          {filter === "open" ? "Nenhuma dúvida esperando resposta. 🎉" : "Nenhuma dúvida encontrada."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <QuestionCard
              key={q.id}
              q={q}
              profile={profiles[q.user_id]}
              lesson={lessons[q.lesson_id]}
              course={lessons[q.lesson_id] ? courses[lessons[q.lesson_id].course_id] : undefined}
              onChanged={(next) => setRows((prev) => next ? prev.map((r) => (r.id === next.id ? next : r)) : prev.filter((r) => r.id !== q.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionCard({ q, profile, lesson, course, onChanged }: {
  q: Q; profile?: Profile; lesson?: LessonInfo; course?: string; onChanged: (next: Q | null) => void;
}) {
  const [editing, setEditing] = useState(!q.answer);
  const [text, setText] = useState(q.answer ?? "");
  const [saving, setSaving] = useState(false);
  const name = profile?.full_name || profile?.email || "Aluno";

  async function save() {
    const answer = text.trim();
    if (!answer) return toast.error("Escreva a resposta.");
    setSaving(true);
    const answered_at = new Date().toISOString();
    const { error } = await supabase.from("lesson_questions").update({ answer, answered_at }).eq("id", q.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Resposta enviada. O aluno foi avisado.");
    setEditing(false);
    onChanged({ ...q, answer, answered_at });
  }

  async function remove() {
    if (!confirm("Apagar esta dúvida?")) return;
    const { error } = await supabase.from("lesson_questions").delete().eq("id", q.id);
    if (error) return toast.error(error.message);
    onChanged(null);
  }

  return (
    <article className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{name} <span className="font-normal text-xs text-muted-foreground">{profile?.email}</span></p>
          <p className="truncate text-xs text-muted-foreground">
            {course ? `${course} · ` : ""}{lesson?.title ?? "Aula removida"} · {new Date(q.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {q.answer ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary"><CheckCircle2 className="h-3 w-3" /> Respondida</span>
          ) : (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Sem resposta</span>
          )}
          {profile?.phone && (
            <Button asChild size="sm" variant="ghost"><a href={waLink(profile.phone)} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /></a></Button>
          )}
          <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={remove} aria-label="Apagar dúvida"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
      <p className="whitespace-pre-line rounded-lg bg-muted/40 px-4 py-3 text-sm">{q.content}</p>
      {editing ? (
        <div className="space-y-2">
          <Textarea rows={3} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Sua resposta..." />
          <div className="flex justify-end gap-2">
            {q.answer && <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setText(q.answer ?? ""); }}>Cancelar</Button>}
            <Button size="sm" onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} {q.answer ? "Salvar resposta" : "Responder"}</Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-primary">Sua resposta</span>
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-muted-foreground hover:text-foreground">Editar</button>
          </div>
          <p className="whitespace-pre-line text-sm">{q.answer}</p>
        </div>
      )}
    </article>
  );
}
