import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Trash2, MessageCircle, RefreshCw, Search, Heart, Users,
  MessageSquare, Eye, ChevronDown, ChevronUp, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/community")({ component: Page });

type Post = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string | null;
  author_email: string | null;
  likes: number;
  comments: Comment[];
};

type Comment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string | null;
};

function Page() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const [pRes, profRes, lRes, cRes] = await Promise.all([
      supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("id, full_name"),
      supabase.from("post_likes").select("post_id"),
      supabase.from("comments").select("*").order("created_at", { ascending: true }),
    ]);

    const profiles = new Map((profRes.data ?? []).map((p) => [p.id, p.full_name]));
    const likes = (lRes.data ?? []).reduce((acc, l) => {
      acc[l.post_id] = (acc[l.post_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const comments = (cRes.data ?? []).map((c) => ({
      ...c,
      author_name: profiles.get(c.user_id) ?? null,
    }));

    const mapped: Post[] = (pRes.data ?? []).map((p) => ({
      id: p.id,
      user_id: p.user_id,
      content: p.content,
      created_at: p.created_at,
      author_name: profiles.get(p.user_id) ?? null,
      author_email: null,
      likes: likes[p.id] ?? 0,
      comments: comments.filter((c) => c.post_id === p.id),
    }));

    setPosts(mapped);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const removePost = async (id: string) => {
    if (!confirm("Excluir este post e todos os seus comentários?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Post excluído");
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const removeComment = async (postId: string, commentId: string) => {
    if (!confirm("Excluir este comentário?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (error) return toast.error(error.message);
    toast.success("Comentário excluído");
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) }
          : p
      )
    );
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    if (!search) return posts;
    const q = search.toLowerCase();
    return posts.filter(
      (p) =>
        p.content.toLowerCase().includes(q) ||
        (p.author_name ?? "").toLowerCase().includes(q) ||
        p.comments.some((c) => c.content.toLowerCase().includes(q))
    );
  }, [posts, search]);

  const totalComments = posts.reduce((s, p) => s + p.comments.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Comunidade</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitore posts e comentários dos membros. Exclua conteúdo inadequado.
          </p>
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

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={MessageCircle} label="Posts" value={posts.length} accent="primary" />
        <StatCard icon={MessageSquare} label="Comentários" value={totalComments} accent="cyan" />
        <StatCard icon={Heart} label="Curtidas" value={posts.reduce((s, p) => s + p.likes, 0)} accent="pink" />
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02]">
        <div className="px-4 py-3 border-b border-white/5">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar por conteúdo ou autor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:border-primary/40"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" strokeWidth={1.5} />
            <div className="text-sm font-medium">Nenhum post encontrado</div>
            <div className="text-xs text-muted-foreground mt-1">
              {search ? "Tente ajustar a busca." : "A comunidade ainda não tem publicações."}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((p) => {
              const isExpanded = expanded.has(p.id);
              return (
                <div key={p.id} className="p-4 hover:bg-white/[0.02] transition">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground shrink-0">
                      {(p.author_name ?? "M")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{p.author_name ?? "Membro"}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(p.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed mt-1 whitespace-pre-wrap break-words">
                        {p.content}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="h-3 w-3" /> {p.likes}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> {p.comments.length}
                        </span>
                        {p.comments.length > 0 && (
                          <button
                            onClick={() => toggleExpand(p.id)}
                            className="inline-flex items-center gap-1 hover:text-foreground transition"
                          >
                            <Eye className="h-3 w-3" />
                            {isExpanded ? "Ocultar" : "Ver comentários"}
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removePost(p.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition shrink-0"
                      title="Excluir post"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {isExpanded && p.comments.length > 0 && (
                    <div className="ml-12 mt-3 space-y-2 border-l-2 border-white/5 pl-4">
                      {p.comments.map((c) => (
                        <div key={c.id} className="flex items-start gap-2 group">
                          <div className="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-medium text-muted-foreground shrink-0">
                            {(c.author_name ?? "M")[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{c.author_name ?? "Membro"}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(c.created_at).toLocaleString("pt-BR")}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">
                              {c.content}
                            </p>
                          </div>
                          <button
                            onClick={() => removeComment(p.id, c.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition shrink-0"
                            title="Excluir comentário"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent: string }) {
  const cls =
    accent === "cyan" ? "bg-cyan-500/10 text-cyan-400"
    : accent === "pink" ? "bg-pink-500/10 text-pink-400"
    : "bg-primary/10 text-primary";
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-white/10 transition">
      <div className="flex items-center justify-between">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${cls}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
      </div>
      <div className="text-xs text-muted-foreground mt-2">{label}</div>
    </div>
  );
}
