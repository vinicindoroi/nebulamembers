import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { normalizeTasks, type CallTask } from "@/lib/call-feedback";

/** Admin editor for what was discussed in a call and the student's tasks (student sees everything). */
export function CallNotesDialog({ bookingId, studentName, when, onOpenChange, onSaved }: {
  bookingId: string | null;
  studentName: string;
  when: string;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const [summary, setSummary] = useState("");
  const [tasks, setTasks] = useState<CallTask[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    setLoading(true); setSummary(""); setTasks([]); setDraft("");
    supabase.from("mentor_call_notes").select("summary, tasks").eq("booking_id", bookingId).maybeSingle()
      .then(({ data }) => {
        setSummary(data?.summary ?? "");
        setTasks(normalizeTasks(data?.tasks));
        setLoading(false);
      });
  }, [bookingId]);

  function addTask() {
    const t = draft.trim();
    if (!t) return;
    setTasks((prev) => [...prev, { text: t, done: false }]);
    setDraft("");
  }

  async function save() {
    if (!bookingId) return;
    const list = normalizeTasks([...tasks, ...(draft.trim() ? [{ text: draft, done: false }] : [])]);
    setSaving(true);
    const { error } = await supabase.from("mentor_call_notes").upsert({ booking_id: bookingId, summary: summary.trim(), tasks: list });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Anotações salvas. O aluno já pode ver.");
    onSaved?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={!!bookingId} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Anotações da call</DialogTitle>
          <DialogDescription>{studentName} · {when}. O aluno vê tudo o que você escrever aqui.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="call-summary">O que foi falado</Label>
              <Textarea id="call-summary" rows={5} maxLength={5000} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Resumo, decisões, links importantes..." />
            </div>
            <div className="space-y-2">
              <Label>Tarefas do aluno</Label>
              {tasks.length > 0 && (
                <ul className="space-y-1.5">
                  {tasks.map((t, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                      <Checkbox
                        checked={t.done}
                        onCheckedChange={(v) => setTasks((prev) => prev.map((x, j) => (j === i ? { ...x, done: !!v } : x)))}
                        aria-label="Marcar tarefa como feita"
                      />
                      <span className={`flex-1 text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.text}</span>
                      <button type="button" onClick={() => setTasks((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive" aria-label="Remover tarefa">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Input value={draft} maxLength={300} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTask(); } }} placeholder="Nova tarefa e Enter" />
                <Button type="button" variant="outline" size="icon" onClick={addTask} aria-label="Adicionar tarefa"><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Voltar</Button>
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
