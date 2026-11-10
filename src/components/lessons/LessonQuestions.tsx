import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, Loader2, Lock, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import brandMark from "@/assets/nebula-mark-n.png.asset.json";

type Question = { id: string; content: string; answer: string | null; answered_at: string | null; created_at: string };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** Private questions to the mentor under each lesson: only the student and the admin see them. */
export function LessonQuestions({ lessonId }: { lessonId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const key = ["lesson-questions", lessonId, user?.id];

  const { data: rows = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!lessonId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_questions")
        .select("id, content, answer, answered_at, created_at")
        .eq("lesson_id", lessonId)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Question[];
    },
  });

  const ask = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("lesson_questions").insert({ lesson_id: lessonId, user_id: user!.id, content });
      if (error) throw error;
    },
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: key }); toast.success("Dúvida enviada ao mentor."); },
    onError: () => toast.error("Não foi possível enviar sua dúvida."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lesson_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: () => toast.error("Não foi possível apagar."),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (t && user) ask.mutate(t);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Dúvidas com o mentor</h3>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Lock className="h-3 w-3" /> Só você e o mentor veem</span>
      </div>

      {isLoading ? (
        <p className="py-4 text-center text-xs text-muted-foreground">Carregando...</p>
      ) : rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((q) => (
            <li key={q.id} className="space-y-2">
              <div className="group rounded-xl bg-muted/40 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="whitespace-pre-line text-sm">{q.content}</p>
                  {!q.answer && (
                    <button type="button" onClick={() => remove.mutate(q.id)} className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus:opacity-100" aria-label="Apagar dúvida">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{fmt(q.created_at)}{!q.answer && " · aguardando resposta"}</p>
              </div>
              {q.answer && (
                <div className="ml-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 sm:ml-8">
                  <div className="mb-1 flex items-center gap-2">
                    <img src={brandMark.url} alt="" className="h-4 w-4 object-contain" />
                    <span className="text-xs font-semibold text-primary">Resposta do mentor</span>
                    {q.answered_at && <span className="text-[11px] text-muted-foreground">{fmt(q.answered_at)}</span>}
                  </div>
                  <p className="whitespace-pre-line text-sm">{q.answer}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) submit(e); }}
          placeholder={rows.length ? "Mandar outra dúvida..." : "Ficou com alguma dúvida nesta aula? Pergunte ao mentor."}
          maxLength={2000}
          rows={2}
          className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/40"
        />
        <button
          type="submit"
          disabled={!text.trim() || ask.isPending}
          aria-label="Enviar dúvida"
          className="flex items-center justify-center self-end rounded-xl bg-primary px-3.5 py-2.5 text-primary-foreground disabled:opacity-40"
        >
          {ask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
