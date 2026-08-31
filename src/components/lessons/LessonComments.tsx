import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, Trash2, Reply, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const db = supabase as any;

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  replies?: Comment[];
};

export function LessonComments({ lessonId }: { lessonId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["lesson-comments", lessonId],
    enabled: !!lessonId,
    queryFn: async () => {
      const { data, error } = await db.rpc("get_lesson_comments", { p_lesson_id: lessonId });
      if (error) throw error;
      const all: Comment[] = (data ?? []).map((c: any) => ({ ...c, replies: [] as Comment[] }));

      // Build tree
      const map = new Map<string, Comment>();
      const roots: Comment[] = [];
      for (const c of all) map.set(c.id, c);
      for (const c of all) {
        if (c.parent_id && map.has(c.parent_id)) {
          map.get(c.parent_id)!.replies!.push(c);
        } else {
          roots.push(c);
        }
      }
      return roots;
    },
  });

  const totalCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0);

  const addComment = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const { error } = await db.rpc("add_lesson_comment", {
        p_lesson_id: lessonId,
        p_content: content,
        p_parent_id: parentId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lesson-comments", lessonId] });
      setText("");
      setReplyTo(null);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao comentar"),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.rpc("delete_lesson_comment", { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lesson-comments", lessonId] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao excluir"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    addComment.mutate({ content: trimmed, parentId: replyTo?.id });
  };

  const toggleReplies = (id: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  };

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Comentários</h3>
        {totalCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">
            {totalCount}
          </span>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="space-y-2">
        {replyTo && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/[0.03] px-3 py-1.5 rounded-lg">
            <Reply className="h-3 w-3" />
            <span>Respondendo a <strong className="text-foreground">{replyTo.name}</strong></span>
            <button type="button" onClick={() => setReplyTo(null)} className="ml-auto text-[10px] hover:text-foreground">
              Cancelar
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={replyTo ? "Escreva sua resposta..." : "Escreva um comentário..."}
            maxLength={1000}
            className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/40 placeholder:text-muted-foreground/60 transition"
          />
          <button
            type="submit"
            disabled={!text.trim() || addComment.isPending}
            className="gradient-primary text-primary-foreground px-3.5 py-2.5 rounded-xl text-sm flex items-center gap-1.5 disabled:opacity-40 shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)]"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>

      {/* Comments list */}
      {isLoading ? (
        <div className="text-xs text-muted-foreground py-4 text-center">Carregando...</div>
      ) : comments.length === 0 ? (
        <div className="text-xs text-muted-foreground py-6 text-center">
          Nenhum comentário ainda. Seja o primeiro!
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              userId={user?.id}
              expanded={expandedReplies.has(c.id)}
              onToggleReplies={() => toggleReplies(c.id)}
              onReply={(id, name) => setReplyTo({ id, name })}
              onDelete={(id) => deleteComment.mutate(id)}
              formatDate={formatDate}
              getInitials={getInitials}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment, userId, expanded, onToggleReplies, onReply, onDelete, formatDate, getInitials, isReply = false,
}: {
  comment: Comment;
  userId?: string;
  expanded?: boolean;
  onToggleReplies?: () => void;
  onReply: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  formatDate: (iso: string) => string;
  getInitials: (name: string | null) => string;
  isReply?: boolean;
}) {
  const name = comment.full_name || "Aluno";
  const replies = comment.replies ?? [];

  return (
    <div className={isReply ? "ml-10" : ""}>
      <div className="flex gap-3 group">
        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0 overflow-hidden">
          {comment.avatar_url ? (
            <img src={comment.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            getInitials(comment.full_name)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">{name}</span>
            <span className="text-[10px] text-muted-foreground">{formatDate(comment.created_at)}</span>
          </div>
          <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">{comment.content}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <button
              onClick={() => onReply(comment.id, name)}
              className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition"
            >
              <Reply className="h-3 w-3" /> Responder
            </button>
            {userId === comment.user_id && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-[10px] text-muted-foreground hover:text-red-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"
              >
                <Trash2 className="h-3 w-3" /> Excluir
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {!isReply && replies.length > 0 && (
        <div className="mt-2 ml-10">
          <button
            onClick={onToggleReplies}
            className="text-[10px] text-primary/80 hover:text-primary flex items-center gap-1 mb-2 transition"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {replies.length} {replies.length === 1 ? "resposta" : "respostas"}
          </button>
          {expanded && (
            <div className="space-y-3">
              {replies.map((r) => (
                <CommentItem
                  key={r.id}
                  comment={r}
                  userId={userId}
                  onReply={onReply}
                  onDelete={onDelete}
                  formatDate={formatDate}
                  getInitials={getInitials}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
