import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Bookmark, Heart, MessageCircle, Hash, ExternalLink, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSavedPosts, useToggleSave } from "@/hooks/use-saved-posts";

export const Route = createFileRoute("/_app/saved")({
  component: SavedPage,
  head: () => ({ meta: [{ title: "Salvos — Membros" }] }),
});

const db = supabase as any;

type SavedItem = {
  id: string;
  post_id: string;
  post_type: "community" | "forum";
  created_at: string;
  post: {
    id: string;
    title?: string;
    content: string;
    image_url: string | null;
    created_at: string;
    user_id: string;
    author: { full_name: string | null; avatar_url: string | null; instagram: string | null } | null;
  } | null;
};

function SavedPage() {
  const { user } = useAuth();
  const { data: savedPosts = [] } = useSavedPosts();
  const toggleSave = useToggleSave();
  const [filter, setFilter] = useState<"all" | "forum" | "community">("all");
  const [viewing, setViewing] = useState<SavedItem | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["saved-posts-full", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<SavedItem[]> => {
      const { data: saved, error } = await db
        .from("saved_posts")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!saved?.length) return [];

      const forumIds = saved.filter((s: any) => s.post_type === "forum").map((s: any) => s.post_id);
      const communityIds = saved.filter((s: any) => s.post_type === "community").map((s: any) => s.post_id);

      const [forumRes, communityRes, profRes] = await Promise.all([
        forumIds.length ? db.from("forum_posts").select("id, title, content, image_url, created_at, user_id").in("id", forumIds) : { data: [] },
        communityIds.length ? db.from("posts").select("id, content, image_url, created_at, user_id").in("id", communityIds) : { data: [] },
        db.from("profiles").select("id, full_name, avatar_url, instagram"),
      ]);

      const profs = new Map((profRes.data ?? []).map((p: any) => [p.id, p]));
      const forumMap = new Map((forumRes.data ?? []).map((p: any) => [p.id, p]));
      const communityMap = new Map((communityRes.data ?? []).map((p: any) => [p.id, p]));

      return (saved as any[]).map((s) => {
        const raw = s.post_type === "forum" ? forumMap.get(s.post_id) : communityMap.get(s.post_id);
        return {
          id: s.id,
          post_id: s.post_id,
          post_type: s.post_type,
          created_at: s.created_at,
          post: raw ? { ...raw, author: profs.get(raw.user_id) ?? null } : null,
        };
      }).filter((s) => s.post !== null);
    },
  });

  const filtered = items.filter((i) => filter === "all" || i.post_type === filter);
  const counts = {
    all: items.length,
    forum: items.filter((i) => i.post_type === "forum").length,
    community: items.filter((i) => i.post_type === "community").length,
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Salvos</h1>
        <p className="text-sm text-muted-foreground mt-1">Posts que você salvou do fórum e da comunidade.</p>
      </header>

      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10 w-fit">
        {([["all", "Todos"], ["forum", "Fórum"], ["community", "Comunidade"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${filter === id ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
            {counts[id] > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${filter === id ? "bg-white/10" : "bg-white/5"}`}>
                {counts[id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 h-24 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-16 text-center">
          <Bookmark className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
          <div className="text-sm font-medium">Nenhum post salvo</div>
          <p className="text-xs text-muted-foreground mt-1">Salve posts no fórum ou comunidade clicando no ícone de bookmark.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <SavedCard
              key={item.id}
              item={item}
              onUnsave={() => toggleSave.mutate({ postId: item.post_id, postType: item.post_type, saved: true })}
              onClick={() => setViewing(item)}
            />
          ))}
        </div>
      )}

      {viewing && <SavedPostModal item={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function SavedCard({ item, onUnsave, onClick }: { item: SavedItem; onUnsave: () => void; onClick: () => void }) {
  const post = item.post!;
  const name = post.author?.full_name || "Membro";
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <article onClick={onClick} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 hover:border-white/[0.12] transition group cursor-pointer">
      <div className="flex items-start gap-3">
        {post.author?.avatar_url ? (
          <img src={post.author.avatar_url} alt={name} className="h-9 w-9 rounded-full object-cover ring-2 ring-white/10 shrink-0" />
        ) : (
          <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-[10px] font-semibold text-primary-foreground ring-2 ring-primary/20 shrink-0">{initials}</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate">{name}</span>
            {post.author?.instagram && (
              <a href={`https://instagram.com/${post.author.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-pink-400/70 hover:text-pink-400 transition">
                @{post.author.instagram.replace("@", "")}
              </a>
            )}
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${item.post_type === "forum" ? "bg-primary/10 text-primary border border-primary/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
              {item.post_type === "forum" ? "Fórum" : "Comunidade"}
            </span>
          </div>
          {(post as any).title && (
            <h3 className="text-sm font-medium mt-1">{(post as any).title}</h3>
          )}
          <p className="text-sm text-muted-foreground/80 mt-1 line-clamp-3 whitespace-pre-wrap">{post.content}</p>
          <div className="text-[11px] text-muted-foreground/50 mt-2">{formatTime(post.created_at)}</div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onUnsave(); }}
          className="shrink-0 p-2 rounded-xl text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition opacity-0 group-hover:opacity-100"
          title="Remover dos salvos"
        >
          <Bookmark className="h-4 w-4" fill="currentColor" />
        </button>
      </div>
      {post.image_url && (
        <div className="mt-3 rounded-xl overflow-hidden border border-white/[0.06]">
          <img src={post.image_url} alt="" className="w-full max-h-48 object-cover" loading="lazy" />
        </div>
      )}
    </article>
  );
}

function SavedPostModal({ item, onClose }: { item: SavedItem; onClose: () => void }) {
  const post = item.post!;
  const name = post.author?.full_name || "Membro";
  const initials = name.slice(0, 2).toUpperCase();

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, oklch(0.16 0.015 270 / 0.95), oklch(0.14 0.015 270 / 0.97))",
          border: "1px solid oklch(1 0 0 / 0.1)",
          boxShadow: "0 32px 80px -16px rgba(0,0,0,0.7), inset 0 1px 0 oklch(1 0 0 / 0.05)",
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3 shrink-0">
          {post.author?.avatar_url ? (
            <img src={post.author.avatar_url} alt={name} className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10" />
          ) : (
            <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground ring-2 ring-primary/20">{initials}</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{name}</span>
              {post.author?.instagram && (
                <a href={`https://instagram.com/${post.author.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-pink-400/70 hover:text-pink-400 transition">
                  @{post.author.instagram.replace("@", "")}
                </a>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground/60">{formatTime(post.created_at)}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${item.post_type === "forum" ? "bg-primary/10 text-primary border border-primary/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                {item.post_type === "forum" ? "Fórum" : "Comunidade"}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-foreground transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {(post as any).title && (
            <h2 className="text-lg font-semibold">{(post as any).title}</h2>
          )}
          <div className="text-sm text-muted-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
            {post.content}
          </div>
          {post.image_url && (
            <div className="rounded-xl overflow-hidden border border-white/[0.06]">
              <img src={post.image_url} alt="" className="w-full max-h-[400px] object-cover" loading="lazy" />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = Date.now();
  const diff = (now - date.getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
