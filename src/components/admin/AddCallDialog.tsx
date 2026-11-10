import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { syncBookingToGoogle } from "@/lib/google-calendar.functions";
import { zonedToDate } from "@/lib/mentor-schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type P = { id: string; full_name: string | null; email: string | null };

/** Admin registers a call by hand: a call already held (counts for the weekly limit) or a new booking. */
export function AddCallDialog({ open, onOpenChange, profiles, tz, slotMinutes, defaultDate, onSaved }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profiles: Record<string, P>;
  tz: string;
  slotMinutes: number;
  defaultDate: string;
  onSaved: () => void;
}) {
  const [q, setQ] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("15:00");
  const [status, setStatus] = useState<"done" | "booked">("done");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return Object.values(profiles)
      .filter((p) => !s || (p.full_name ?? "").toLowerCase().includes(s) || (p.email ?? "").toLowerCase().includes(s))
      .sort((a, b) => (a.full_name || a.email || "").localeCompare(b.full_name || b.email || ""))
      .slice(0, 50);
  }, [profiles, q]);
  const chosen = userId ? profiles[userId] : null;

  useEffect(() => {
    if (open) { setQ(""); setUserId(null); setDate(defaultDate); setTime("15:00"); setStatus("done"); setNotes(""); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const reset = onOpenChange;

  async function save() {
    if (!userId) return toast.error("Escolha o aluno.");
    if (!date || !/^\d{2}:\d{2}$/.test(time)) return toast.error("Informe data e horário.");
    const [h, m] = time.split(":").map(Number);
    const startsAt = zonedToDate(date, h * 60 + m, tz);
    setSaving(true);
    const { data, error } = await (supabase as any).rpc("admin_add_call", {
      _user_id: userId, _starts_at: startsAt.toISOString(), _status: status, _notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(status === "done" ? "Call registrada como realizada." : "Call marcada. O aluno foi avisado.");
    if (status === "booked" && data) syncBookingToGoogle({ data: { bookingId: data as string } }).catch(() => {});
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar call</DialogTitle>
          <DialogDescription>Conta para o limite de 1 call por semana do aluno (e do grupo dele).</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
          {([["done", "Já aconteceu"], ["booked", "Vai acontecer"]] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setStatus(v)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${status === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {l}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label>Aluno</Label>
          {chosen ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{chosen.full_name || chosen.email}</p>
                <p className="truncate text-xs text-muted-foreground">{chosen.email}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setUserId(null)}>Trocar</Button>
            </div>
          ) : (
            <div className="rounded-lg border border-border">
              <div className="relative border-b border-border">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou email"
                  className="border-0 pl-9 shadow-none focus-visible:ring-0" />
              </div>
              <div className="max-h-56 overflow-y-auto p-1">
                {list.length === 0 && <p className="p-3 text-center text-sm text-muted-foreground">Nenhum aluno encontrado.</p>}
                {list.map((p) => (
                  <button key={p.id} type="button" onClick={() => setUserId(p.id)}
                    className="flex w-full flex-col rounded-md px-3 py-2 text-left hover:bg-muted">
                    <span className="truncate text-sm font-medium">{p.full_name || p.email}</span>
                    <span className="truncate text-xs text-muted-foreground">{p.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Horário</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label>Observação (opcional)</Label><Textarea rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: call feita fora da agenda" /></div>
        <p className="text-xs text-muted-foreground">Duração: {slotMinutes} min · fuso de Brasília</p>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Voltar</Button>
          <Button onClick={save} disabled={saving || !userId}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Registrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
