import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect, useDeferredValue } from "react";
import { createPortal } from "react-dom";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  Search, Plus, Heart, MessageCircle, Eye, Hash, Briefcase,
  X, Send, Image as ImageIcon, Pin, Trash2, Edit3, Bookmark,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Modal, Field, inputClass } from "@/components/admin/Modal";
import { sendMentionNotifications } from "@/lib/mentions";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { notifyUser } from "@/lib/notify";
import { useSavedPosts, useToggleSave } from "@/hooks/use-saved-posts";
import { useAddXp, getLevel } from "@/hooks/use-xp";

export const Route = createFileRoute("/_app/forum")({
  component: ForumPage,
  head: () => ({ meta: [{ title: "Fórum — Membros" }] }),
});

type ForumTag = { id: string; name: string; slug: string; color: string };
type ForumPost = {
  id: string; user_id: string; title: string; content: string;
  image_url: string | null; is_service: boolean; service_price: string | null;
  pinned: boolean; views: number; created_at: string;
  author: { full_name: string | null; avatar_url: string | null } | null;
  tags: ForumTag[]; likes: number; liked: boolean; replies: number;
};
type Reply = {
  id: string; post_id: string; user_id: string; content: string;
  image_url: string | null; created_at: string;
  author: { full_name: string | null; avatar_url: string | null } | null;
};

const db = supabase as any;

function ForumPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showServices, setShowServices] = useState(false);
  const [creating, setCreating] = useState(false);
  const [viewingPost, setViewingPost] = useState<ForumPost | null>(null);
  const [editingPost, setEditingPost] = useState<ForumPost | null>(null);
  const { data: savedPosts = [] } = useSavedPosts();
  const toggleSave = useToggleSave();
  const addXp = useAddXp();

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("forum-rt")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "forum_posts" }, () => qc.invalidateQueries({ queryKey: ["forum"] }))
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "forum_replies" }, () => qc.invalidateQueries({ queryKey: ["forum"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  const { data: tags = [] } = useQuery({
    queryKey: ["forum-tags"],
    queryFn: async () => {
      const { data } = await db.from("forum_tags").select("*").order("name");
      return (data ?? []) as ForumTag[];
    },
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["forum", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ForumPost[]> => {
      const [pRes, tRes, lRes, rRes, profRes] = await Promise.all([
        db.from("forum_posts").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(100),
        db.from("forum_post_tags").select("post_id, tag_id"),
        db.from("forum_likes").select("post_id, user_id"),
        db.from("forum_replies").select("post_id"),
        db.from("profiles").select("id, full_name, avatar_url, xp"),
      ]);
      if (pRes.error) throw pRes.error;
      const profs = new Map((profRes.data ?? []).map((p: any) => [p.id, p]));
      const postTags = tRes.data ?? [];
      const likes = lRes.data ?? [];
      const replies = rRes.data ?? [];
      return (pRes.data ?? []).map((p: any) => ({
        ...p,
        author: profs.get(p.user_id) ?? null,
        tags: postTags.filter((t: any) => t.post_id === p.id).map((t: any) => tags.find((tag) => tag.id === t.tag_id)).filter(Boolean),
        likes: likes.filter((l: any) => l.post_id === p.id).length,
        liked: likes.some((l: any) => l.post_id === p.id && l.user_id === user!.id),
        replies: replies.filter((r: any) => r.post_id === p.id).length,
      }));
    },
  });

  const filtered = posts.filter((p) => {
    if (showServices && !p.is_service) return false;
    if (activeTag && !p.tags.some((t) => t.id === activeTag)) return false;
    if (deferredSearch) {
      const q = deferredSearch.toLowerCase();
      return p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
    }
    return true;
  });

  const toggleLike = useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (liked) await db.from("forum_likes").delete().eq("post_id", postId).eq("user_id", user!.id);
      else {
        await db.from("forum_likes").insert({ post_id: postId, user_id: user!.id });
        const post = posts.find((p) => p.id === postId);
        if (post) {
          const actorName = (user?.user_metadata as any)?.full_name || user?.email?.split("@")[0] || "Alguém";
          notifyUser({ recipientId: post.user_id, actorId: user!.id, title: "Nova curtida no seu post", content: `${actorName} curtiu "${post.title}"` });
        }
        addXp.mutate("like");
      }
    },
    onMutate: async ({ postId, liked }) => {
      await qc.cancelQueries({ queryKey: ["forum"] });
      const prev = qc.getQueryData<ForumPost[]>(["forum", user?.id]);
      qc.setQueryData<ForumPost[]>(["forum", user?.id], (old) =>
        (old ?? []).map((p) => (p.id === postId ? { ...p, liked: !liked, likes: p.likes + (liked ? -1 : 1) } : p))
      );
      return { prev };
    },
    onError: (_e: any, _v: any, ctx: any) => ctx?.prev && qc.setQueryData(["forum", user?.id], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["forum"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { await db.from("forum_posts").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["forum"] }); toast.success("Post removido"); },
  });

  return (
    <div className="flex justify-center gap-6">
      <div className="w-full max-w-3xl space-y-5 py-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Fórum</h1>
            <p className="text-sm text-muted-foreground mt-1">Discuta, aprenda e ofereça serviços.</p>
          </div>
          <button onClick={() => setCreating(true)} className="gradient-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2 shadow-[0_4px_16px_-4px_oklch(0.65_0.22_290/0.5)]">
            <Plus className="h-4 w-4" /> Novo post
          </button>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar no fórum..." className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button onClick={() => setShowServices(!showServices)} className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition ${showServices ? "border-pink-500/30 bg-pink-500/10 text-pink-400" : "border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
              <Briefcase className="h-3.5 w-3.5" /> Serviços
            </button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => { setActiveTag(null); setSearch(""); }} className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${!activeTag ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent"}`}>Todos</button>
            {tags.map((t) => (
              <button key={t.id} onClick={() => { setActiveTag(activeTag === t.id ? null : t.id); setSearch(""); }} className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition border ${activeTag === t.id ? "border-white/20 bg-white/10 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
                <span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ background: t.color }} />{t.name}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[0,1,2].map((i) => <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 h-28 animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-16 text-center">
            <Hash className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
            <div className="text-sm font-medium">Nenhum post encontrado</div>
            <p className="text-xs text-muted-foreground mt-1">Seja o primeiro a criar um tópico.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pinned Posts Section */}
            {(() => {
              const pinnedPosts = filtered.filter((p) => p.pinned);
              const regularPosts = filtered.filter((p) => !p.pinned);
              return (
                <>
                  {pinnedPosts.length > 0 && (
                    <div className="space-y-3 p-4 rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/[0.04] to-transparent shadow-[0_8px_32px_-12px_rgba(139,92,246,0.15)] relative overflow-hidden group/pinned">
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent pointer-events-none" />
                      <div className="flex items-center gap-2 text-xs font-semibold text-violet-400 tracking-wide uppercase px-1 pb-1">
                        <Pin className="h-3.5 w-3.5" />
                        <span>Tópicos em Destaque</span>
                      </div>
                      <div className="space-y-3">
                        {pinnedPosts.map((p) => (
                          <ForumPostCard key={p.id} post={p} userId={user!.id} onLike={() => toggleLike.mutate({ postId: p.id, liked: p.liked })} onDelete={async () => { if (await confirm({ title: "Apagar post?", description: "Esta ação não pode ser desfeita.", confirmLabel: "Apagar" })) remove.mutate(p.id); }} onClick={() => setViewingPost(p)} />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {regularPosts.length > 0 ? (
                    <div className="space-y-3">
                      {pinnedPosts.length > 0 && (
                        <h3 className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider px-1 pt-2">Discussões Recentes</h3>
                      )}
                      {regularPosts.map((p) => (
                        <ForumPostCard key={p.id} post={p} userId={user!.id} onLike={() => toggleLike.mutate({ postId: p.id, liked: p.liked })} onDelete={async () => { if (await confirm({ title: "Apagar post?", description: "Esta ação não pode ser desfeita.", confirmLabel: "Apagar" })) remove.mutate(p.id); }} onClick={() => setViewingPost(p)} />
                      ))}
                    </div>
                  ) : pinnedPosts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-16 text-center">
                      <Hash className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
                      <div className="text-sm font-medium">Nenhum post encontrado</div>
                      <p className="text-xs text-muted-foreground mt-1">Seja o primeiro a criar um tópico.</p>
                    </div>
                  ) : null}
                </>
              );
            })()}
          </div>
        )}
      </div>
      {creating && <CreatePostModal tags={tags} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); qc.invalidateQueries({ queryKey: ["forum"] }); }} />}
      {viewingPost && <PostDetailModal post={viewingPost} userId={user!.id} onClose={() => setViewingPost(null)} onLike={() => toggleLike.mutate({ postId: viewingPost.id, liked: viewingPost.liked })} />}
      {confirmDialog}
    </div>
  );
}

/* ─── Helpers ─── */
function formatTime(iso: string) {
  const d = new Date(iso); const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "agora"; if (s < 3600) return `${Math.floor(s/60)}min`;
  if (s < 86400) return `${Math.floor(s/3600)}h`; if (s < 604800) return `${Math.floor(s/86400)}d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
function renderHashtags(text: string) {
  return text.split(/(#\w+)/g).map((part, i) => part.startsWith("#") ? <span key={i} className="text-primary font-medium">{part}</span> : part);
}

/* ─── Level Badge & Avatar helper components ─── */

function LevelBadge({ xp }: { xp: number }) {
  const levelInfo = getLevel(xp);
  const getRankColor = (lvl: number) => {
    if (lvl >= 8) return "from-yellow-400/20 to-amber-500/20 text-amber-300 border-amber-500/30";
    if (lvl >= 7) return "from-fuchsia-500/20 to-purple-600/20 text-purple-300 border-purple-500/30";
    if (lvl >= 6) return "from-violet-500/20 to-indigo-600/20 text-indigo-300 border-indigo-500/30";
    if (lvl >= 5) return "from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/30";
    if (lvl >= 4) return "from-teal-500/20 to-emerald-500/20 text-emerald-300 border-teal-500/30";
    if (lvl >= 3) return "from-emerald-500/20 to-green-500/20 text-green-300 border-emerald-500/30";
    if (lvl >= 2) return "from-orange-500/20 to-red-500/20 text-orange-300 border-orange-500/30";
    return "from-slate-500/10 to-slate-600/10 text-slate-400 border-slate-500/20";
  };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[9px] font-semibold bg-gradient-to-r ${getRankColor(levelInfo.level)}`}>
      Lv. {levelInfo.level} • {levelInfo.title}
    </span>
  );
}

function Avatar({ initials, size = "md", xp = 0, avatarUrl, name }: { initials: string; size?: "sm" | "md"; xp?: number; avatarUrl?: string | null; name?: string }) {
  const levelInfo = getLevel(xp);
  const cls = size === "sm" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";

  const getRingColor = (lvl: number) => {
    if (lvl >= 8) return "ring-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]";
    if (lvl >= 7) return "ring-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.3)]";
    if (lvl >= 6) return "ring-indigo-500/40 shadow-[0_0_8px_rgba(99,102,241,0.3)]";
    if (lvl >= 5) return "ring-blue-500/30 shadow-[0_0_6px_rgba(59,130,246,0.25)]";
    if (lvl >= 4) return "ring-teal-500/30";
    if (lvl >= 3) return "ring-emerald-500/30";
    if (lvl >= 2) return "ring-orange-500/30";
    return "ring-white/10";
  };

  const ringCls = getRingColor(levelInfo.level);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || ""}
        className={`${cls} rounded-full object-cover shrink-0 ring-2 ${ringCls}`}
      />
    );
  }

  return (
    <div className={`${cls} rounded-full gradient-primary flex items-center justify-center font-semibold text-primary-foreground shrink-0 ring-2 ${ringCls}`}>
      {initials}
    </div>
  );
}

/* ─── Post Card ─── */
function ForumPostCard({ post, userId, onLike, onDelete, onClick }: { post: ForumPost; userId: string; onLike: () => void; onDelete: () => void; onClick: () => void }) {
  const name = post.author?.full_name || "Membro";
  const initials = name.slice(0, 2).toUpperCase();
  const mine = post.user_id === userId;
  const isLong = post.content.length > 300;
  const [expanded, setExpanded] = useState(false);
  const postXp = (post.author as any)?.xp ?? 0;

  return (
    <article
      onClick={onClick}
      className={`rounded-2xl border overflow-hidden transition-all duration-300 group cursor-pointer relative ${
        post.is_service
          ? "border-pink-500/30 bg-gradient-to-br from-pink-950/[0.05] via-white/[0.01] to-white/[0.02] hover:border-pink-500/50 hover:shadow-[0_0_24px_rgba(244,63,94,0.1)]"
          : post.pinned
          ? "border-violet-500/20 bg-violet-500/[0.01] hover:border-violet-500/35 hover:shadow-[0_0_24px_rgba(139,92,246,0.08)]"
          : "border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.02] hover:border-white/[0.12] hover:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)]"
      }`}
    >
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <Avatar initials={initials} size="sm" xp={postXp} avatarUrl={post.author?.avatar_url} name={name} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold truncate text-foreground/90">{name}</span>
              <LevelBadge xp={postXp} />
              {post.pinned && <Pin className="h-3 w-3 text-violet-400" />}
              {post.is_service && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 font-semibold shadow-[0_2px_8px_rgba(244,63,94,0.15)]">Serviço</span>}
            </div>
            <div className="text-[11px] text-muted-foreground/60">{formatTime(post.created_at)}</div>
          </div>
          {mine && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        <h3 className="text-base font-semibold leading-tight mb-2">{post.title}</h3>
        <div className={`text-sm text-muted-foreground/90 leading-relaxed break-words prose prose-invert prose-sm max-w-none ${!expanded && isLong ? "line-clamp-4" : ""}`} dangerouslySetInnerHTML={{ __html: post.content }} />
        {isLong && <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="text-xs text-primary mt-1 hover:underline">{expanded ? "Ver menos" : "Ver mais"}</button>}
        {post.is_service && post.service_price && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-semibold shadow-[0_2px_10px_rgba(244,63,94,0.1)]">
            <Briefcase className="h-3.5 w-3.5" /> <span>{post.service_price}</span>
          </div>
        )}
        {post.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-3">
            {post.tags.map((t) => (
              <span key={t.id} className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-muted-foreground flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.color }} />{t.name}
              </span>
            ))}
          </div>
        )}
      </div>
      {post.image_url && (
        <div className="border-t border-white/[0.06]"><img src={post.image_url} alt="" className="w-full max-h-[360px] object-cover" loading="lazy" /></div>
      )}
      <div className="px-5 py-3 border-t border-white/[0.06] flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {/* Curtir */}
        <button
          onClick={onLike}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
            post.liked
              ? "text-rose-400 bg-rose-500/10 border border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
              : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-white/[0.06] bg-white/[0.01]"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 transition-transform duration-200 ${post.liked ? "scale-110" : ""}`} fill={post.liked ? "currentColor" : "none"} />
          <span className="tabular-nums">{post.likes || 0}</span>
        </button>

        {/* Respostas */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground border border-white/[0.06] bg-white/[0.01]">
          <MessageCircle className="h-3.5 w-3.5" />
          <span className="tabular-nums">{post.replies || 0}</span>
        </div>

        {/* Visualizações */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground/50 border border-white/[0.04] bg-white/[0.005] ml-auto">
          <Eye className="h-3.5 w-3.5" />
          <span className="tabular-nums">{post.views || 0}</span>
        </div>
      </div>
    </article>
  );
}

/* ─── Post Detail Modal ─── */
function PostDetailModal({ post, userId, onClose, onLike }: { post: ForumPost; userId: string; onClose: () => void; onLike: () => void }) {
  const qc = useQueryClient();
  const addXp = useAddXp();

  // Increment view count once per session per post
  useEffect(() => {
    const key = `forum_viewed_${post.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    db.from("forum_posts").update({ views: (post.views || 0) + 1 }).eq("id", post.id)
      .then(() => qc.invalidateQueries({ queryKey: ["forum"] }));
  }, [post.id]);
  const [replyText, setReplyText] = useState("");
  const [replyImg, setReplyImg] = useState<File | null>(null);
  const [replyPreview, setReplyPreview] = useState<string | null>(null);
  const replyFileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editContent, setEditContent] = useState(post.content);
  const mine = post.user_id === userId;
  const postXp = (post.author as any)?.xp ?? 0;

  const { data: replies = [], isLoading } = useQuery({
    queryKey: ["forum-replies", post.id],
    queryFn: async (): Promise<Reply[]> => {
      const [rRes, profRes] = await Promise.all([
        db.from("forum_replies").select("*").eq("post_id", post.id).order("created_at"),
        db.from("profiles").select("id, full_name, avatar_url, xp"),
      ]);
      const profs = new Map((profRes.data ?? []).map((p: any) => [p.id, p]));
      return (rRes.data ?? []).map((r: any) => ({ ...r, author: profs.get(r.user_id) ?? null }));
    },
  });

  const addReply = useMutation({
    mutationFn: async () => {
      const content = replyText.trim();
      if (!content && !replyImg) return;
      let image_url: string | null = null;
      if (replyImg) {
        const ext = replyImg.name.split(".").pop() ?? "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("community").upload(path, replyImg);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("community").getPublicUrl(path);
        image_url = urlData.publicUrl;
      }
      const { error } = await db.from("forum_replies").insert({ post_id: post.id, user_id: userId, content: content || "", image_url });
      if (error) throw error;
    },
    onSuccess: () => { 
      sendMentionNotifications(replyText, "Alguém", "Fórum (Resposta)");
      setReplyText(""); clearReplyImg(); qc.invalidateQueries({ queryKey: ["forum-replies", post.id] }); qc.invalidateQueries({ queryKey: ["forum"] }); addXp.mutate("forum_reply"); 
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteReply = useMutation({
    mutationFn: async (id: string) => { await db.from("forum_replies").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["forum-replies", post.id] }); qc.invalidateQueries({ queryKey: ["forum"] }); },
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!editTitle.trim() || !editContent.trim()) return;
      const { error } = await db.from("forum_posts").update({ title: editTitle.trim(), content: editContent.trim() }).eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => { setEditing(false); toast.success("Post atualizado"); qc.invalidateQueries({ queryKey: ["forum"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleReplyImg = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 5*1024*1024) { toast.error("Máximo 5MB"); return; } setReplyImg(f); setReplyPreview(URL.createObjectURL(f)); };
  const clearReplyImg = () => { setReplyImg(null); if (replyPreview) URL.revokeObjectURL(replyPreview); setReplyPreview(null); if (replyFileRef.current) replyFileRef.current.value = ""; };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addReply.mutate(); } };

  const authorName = post.author?.full_name || "Membro";
  const authorInitials = authorName.slice(0, 2).toUpperCase();

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto py-8 px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-2xl rounded-3xl overflow-hidden animate-fade-up" style={{ background: "oklch(0.13 0.012 270)", border: "1px solid oklch(1 0 0 / 0.08)", boxShadow: "0 40px 100px -20px rgba(0,0,0,0.8)" }}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition"><X className="h-4 w-4" /></button>

        {post.image_url && !editing && (
          <div className="relative w-full max-h-[260px] overflow-hidden">
            <img src={post.image_url} alt="" className="w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.13_0.012_270)] via-transparent to-transparent" />
          </div>
        )}

        <div className="p-6 md:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <Avatar initials={authorInitials} size="md" xp={postXp} avatarUrl={post.author?.avatar_url} name={authorName} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground/90">{authorName}</span>
                <LevelBadge xp={postXp} />
              </div>
              <div className="text-[11px] text-muted-foreground/50">{formatTime(post.created_at)}</div>
            </div>
            {mine && !editing && <button onClick={() => setEditing(true)} className="text-[11px] px-3 py-1.5 rounded-xl border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5 transition font-medium">Editar</button>}
          </div>

          {editing ? (
            <div className="space-y-3">
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-base font-semibold outline-none focus:ring-2 focus:ring-primary/20" maxLength={200} />
              <RichTextEditor content={editContent} onChange={(html) => setEditContent(html)} placeholder="Edite o conteúdo..." />
              <div className="flex gap-2">
                <button onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending} className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-medium disabled:opacity-50">{saveEdit.isPending ? "Salvando..." : "Salvar"}</button>
                <button onClick={() => { setEditing(false); setEditTitle(post.title); setEditContent(post.content); }} className="px-4 py-2 rounded-xl text-xs text-muted-foreground hover:bg-white/5 transition">Cancelar</button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold leading-tight">{post.title}</h2>
              <div className="text-sm text-foreground/80 leading-[1.8] break-words prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
            </>
          )}

          {post.is_service && post.service_price && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-semibold shadow-[0_2px_10px_rgba(244,63,94,0.1)]">
              <Briefcase className="h-3.5 w-3.5" /> <span>{post.service_price}</span>
            </div>
          )}
          {post.tags.length > 0 && <div className="flex gap-1.5 flex-wrap">{post.tags.map((t) => <span key={t.id} className="text-[10px] px-2.5 py-1 rounded-full border border-white/10 text-muted-foreground flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: t.color }} /> {t.name}</span>)}</div>}

          <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
            <button
              onClick={onLike}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 ${
                post.liked
                  ? "text-rose-400 bg-rose-500/10 border border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5 border border-white/10"
              }`}
            >
              <Heart className={`h-4 w-4 transition-transform duration-200 ${post.liked ? "scale-110" : ""}`} fill={post.liked ? "currentColor" : "none"} />
              <span className="tabular-nums">{post.likes || 0}</span>
            </button>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground border border-white/10 bg-white/[0.02]">
              <MessageCircle className="h-4 w-4" />
              <span className="tabular-nums">{replies.length || 0}</span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground/40 border border-white/[0.06] bg-white/[0.005] ml-auto">
              <Eye className="h-4 w-4" />
              <span className="tabular-nums">{post.views || 0}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06]">
            <h4 className="text-sm font-semibold mb-4">{replies.length} {replies.length === 1 ? "resposta" : "respostas"}</h4>
            {isLoading ? <p className="text-xs text-muted-foreground">Carregando...</p> : replies.length === 0 ? <p className="text-xs text-muted-foreground/50 mb-4">Nenhuma resposta ainda.</p> : (
              <div className="space-y-3 mb-5 max-h-[400px] overflow-y-auto pr-1">
                {replies.map((r) => {
                  const rName = r.author?.full_name || "Membro";
                  const rInit = rName.slice(0, 2).toUpperCase();
                  const rXp = (r.author as any)?.xp ?? 0;
                  return (
                    <div key={r.id} className="flex gap-3 group/r">
                      <Avatar initials={rInit} size="sm" xp={rXp} avatarUrl={r.author?.avatar_url} name={rName} />
                      <div className="flex-1 min-w-0 rounded-2xl bg-white/[0.03] border border-white/[0.05] px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-semibold text-foreground/90">{rName}</span>
                          <LevelBadge xp={rXp} />
                          <span className="text-[10px] text-muted-foreground/40">{formatTime(r.created_at)}</span>
                          {r.user_id === userId && <button onClick={() => deleteReply.mutate(r.id)} className="opacity-0 group-hover/r:opacity-100 ml-auto text-muted-foreground hover:text-red-400 transition"><Trash2 className="h-3 w-3" /></button>}
                        </div>
                        {r.content && <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{r.content}</p>}
                        {r.image_url && <div className="mt-2 rounded-xl overflow-hidden border border-white/[0.05] max-h-44"><img src={r.image_url} alt="" className="w-full max-h-44 object-cover" /></div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3">
              {replyPreview && <div className="relative mb-2 rounded-xl overflow-hidden border border-white/10 max-h-24 w-fit"><img src={replyPreview} alt="" className="max-h-24 object-cover" /><button onClick={clearReplyImg} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center"><X className="h-3 w-3" /></button></div>}
              <div className="flex items-center gap-2">
                <input value={replyText} onChange={(e) => setReplyText(e.target.value.slice(0, 5000))} onKeyDown={handleKeyDown} placeholder="Escreva uma resposta..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40" />
                <input ref={replyFileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleReplyImg} />
                <button onClick={() => replyFileRef.current?.click()} className="p-2 rounded-xl text-muted-foreground/40 hover:text-foreground hover:bg-white/5 transition"><ImageIcon className="h-4 w-4" /></button>
                <button onClick={() => addReply.mutate()} disabled={(!replyText.trim() && !replyImg) || addReply.isPending} className="p-2 rounded-xl gradient-primary text-primary-foreground disabled:opacity-30"><Send className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Create Post Modal ─── */
function CreatePostModal({ tags, onClose, onCreated }: { tags: ForumTag[]; onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ title: "", content: "", is_service: false, service_price: "" });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 5*1024*1024) { toast.error("Máximo 5MB"); return; } setImageFile(f); setImagePreview(URL.createObjectURL(f)); };
  const removeImage = () => { setImageFile(null); if (imagePreview) URL.revokeObjectURL(imagePreview); setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; };
  const toggleTag = (id: string) => setSelectedTags((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);

  const save = async () => {
    if (!form.title.trim()) return toast.error("Título é obrigatório");
    if (!form.content.trim()) return toast.error("Conteúdo é obrigatório");
    setSaving(true);
    let image_url: string | null = null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop() ?? "jpg";
      const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("community").upload(path, imageFile);
      if (upErr) { toast.error(upErr.message); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("community").getPublicUrl(path);
      image_url = urlData.publicUrl;
    }
    const { data: post, error } = await db.from("forum_posts").insert({ user_id: user!.id, title: form.title.trim(), content: form.content.trim(), image_url, is_service: form.is_service, service_price: form.is_service && form.service_price.trim() ? form.service_price.trim() : null }).select("id").single();
    if (error) { toast.error(error.message); setSaving(false); return; }
    if (selectedTags.length > 0 && post) await db.from("forum_post_tags").insert(selectedTags.map((tag_id) => ({ post_id: post.id, tag_id })));
    setSaving(false); toast.success("Post criado!"); 
    sendMentionNotifications(form.content, "Alguém", "Fórum");
    onCreated();
  };

  return (
    <Modal open onClose={onClose} title="Novo post" kicker="Fórum" description="Compartilhe conhecimento, tire dúvidas ou ofereça serviços." size="lg" footer={<><button onClick={onClose} className="px-3.5 py-2 rounded-xl text-sm hover:bg-white/5">Cancelar</button><button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50">{saving ? "Publicando..." : "Publicar"}</button></>}>
      <div className="space-y-4">
        <Field label="Título" required><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Como configurar webhooks no Supabase" className={inputClass} maxLength={200} /></Field>
        <Field label="Conteúdo" required hint="Use a toolbar para formatar o texto."><RichTextEditor content={form.content} onChange={(html) => setForm({ ...form, content: html })} placeholder="Descreva em detalhes..." /></Field>
        <div><label className="text-xs font-medium text-muted-foreground mb-2 block">Tags</label><div className="flex gap-1.5 flex-wrap">{tags.map((t) => <button key={t.id} type="button" onClick={() => toggleTag(t.id)} className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition border ${selectedTags.includes(t.id) ? "border-white/20 bg-white/10 text-foreground" : "border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5"}`}><span className="inline-block h-2 w-2 rounded-full mr-1.5" style={{ background: t.color }} />{t.name}</button>)}</div></div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <Briefcase className="h-4 w-4 text-pink-400" />
          <div className="flex-1"><div className="text-xs font-medium">Oferecer serviço</div><div className="text-[10px] text-muted-foreground">Marque se está oferecendo um serviço pago.</div></div>
          <button onClick={() => setForm({ ...form, is_service: !form.is_service })} className={`h-6 w-11 rounded-full transition relative shrink-0 ${form.is_service ? "bg-pink-500" : "bg-white/10"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${form.is_service ? "left-5" : "left-0.5"}`} /></button>
        </div>
        {form.is_service && <Field label="Preço / Condição" hint="Ex: R$ 150, A combinar"><input value={form.service_price} onChange={(e) => setForm({ ...form, service_price: e.target.value })} placeholder="R$ 100" className={inputClass} /></Field>}
        <div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleImage} />
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden border border-white/10 max-h-48"><img src={imagePreview} alt="" className="w-full max-h-48 object-cover" /><button onClick={removeImage} className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90 transition"><X className="h-3.5 w-3.5" /></button></div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="w-full py-4 rounded-xl border border-dashed border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 hover:bg-white/[0.02] transition flex items-center justify-center gap-2 text-xs"><ImageIcon className="h-4 w-4" /> Adicionar imagem</button>
          )}
        </div>
      </div>
    </Modal>
  );
}
