import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, X, Trash2, MessageSquare, RefreshCw, Search, AlertTriangle, ShieldCheck, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/comments")({ component: Page });

type Comment = {
  id: string;
  content: string;
  status: string | null;
  created_at: string;
  user_id: string | null;
  lesson_id: string | null;
  course_id: string | null;
};

const FILTERS = [
  { id: "all", label: "Todos", icon: MessageSquare },
  { id: "approved", label: "Aprovados", icon: ShieldCheck },
  { id: "pending", label: "Pendentes", icon: Clock },
  { id: "reported", label: "Reportados", icon: AlertTriangle },
] as const;

function Page() {
  const [rows, setRows] = useState<Comment[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("comments").select("*").order("created_at", { ascending: false }).limit(200);
    setRows((data ?? []) as Comment[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("comments").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Comentário atualizado");
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este comentário?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const counts = useMemo(() => {
    const c = { all: rows.length, approved: 0, pending: 0, reported: 0 };
    for (const r of rows) {
      const s = (r.status ?? "approved") as keyof typeof c;
      if (s in c) c[s]++;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const status = r.status ?? "approved";
      if (filter !== "all" && status !== filter) return false;
      if (search && !r.content.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, filter, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Comentários</h1>
          <p className="text-sm text-muted-foreground mt-1">Modere e responda às interações dos seus alunos.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs px-3 py-2 rounded-xl border border-white/10 hover:bg-white/5 flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const active = filter === f.id;
          const n = counts[f.id as keyof typeof counts] ?? 0;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-xl border p-3 text-left transition ${
                active
                  ? "border-primary/40 bg-primary/5"
                  : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <div className={`text-xl font-semibold tabular-nums ${active ? "text-foreground" : ""}`}>{n}</div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{f.label}</div>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02]">
        <div className="px-4 py-3 border-b border-white/5">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar no conteúdo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:border-primary/40"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" strokeWidth={1.5} />
            <div className="text-sm font-medium">Silêncio por aqui</div>
            <div className="text-xs text-muted-foreground mt-1">
              {search ? "Nenhum comentário corresponde à busca." : "Não há comentários neste filtro."}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((c) => {
              const status = c.status ?? "approved";
              return (
                <div key={c.id} className="p-4 hover:bg-white/[0.02] transition flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground shrink-0">
                    {(c.user_id ?? "U").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm leading-relaxed">{c.content}</div>
                    <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2 flex-wrap">
                      <span>{new Date(c.created_at).toLocaleString("pt-BR")}</span>
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                      <StatusBadge status={status} />
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {status !== "approved" && (
                      <button
                        onClick={() => setStatus(c.id, "approved")}
                        className="p-2 rounded-lg hover:bg-emerald-500/10 text-emerald-400 transition"
                        title="Aprovar"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {status !== "reported" && (
                      <button
                        onClick={() => setStatus(c.id, "reported")}
                        className="p-2 rounded-lg hover:bg-amber-500/10 text-amber-400 transition"
                        title="Marcar como reportado"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {status !== "pending" && (
                      <button
                        onClick={() => setStatus(c.id, "pending")}
                        className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground transition"
                        title="Marcar como pendente"
                      >
                        <Clock className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => remove(c.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: "Aprovado", cls: "bg-emerald-500/10 text-emerald-400" },
    pending: { label: "Pendente", cls: "bg-amber-500/10 text-amber-400" },
    reported: { label: "Reportado", cls: "bg-red-500/10 text-red-400" },
  };
  const m = map[status] ?? { label: status, cls: "bg-white/5 text-muted-foreground" };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}
