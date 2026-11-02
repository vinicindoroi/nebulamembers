import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Clock, Loader2, Video, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchScheduleConfig, slotsForDay, weekKey, fmtTime, fmtDate, ymdFromLocal,
  type ScheduleSettings, type Availability, type Booking,
} from "@/lib/mentor-schedule";

export const Route = createFileRoute("/_app/schedule")({
  head: () => ({
    meta: [
      { title: "Agendar call — Nebula Members" },
      { name: "description", content: "Escolha o dia e horário da sua call com o mentor." },
      { property: "og:title", content: "Agendar call — Nebula Members" },
      { property: "og:description", content: "Escolha o dia e horário da sua call com o mentor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [settings, setSettings] = useState<ScheduleSettings | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const [mine, setMine] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<Date | undefined>();
  const [slot, setSlot] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user) return;
    try {
      const cfg = await fetchScheduleConfig();
      setSettings(cfg.settings);
      setAvailability(cfg.availability);
      const from = new Date();
      const to = new Date(Date.now() + ((cfg.settings?.max_days_ahead ?? 30) + 1) * 86400_000);
      const [b, m] = await Promise.all([
        supabase.rpc("mentor_busy_slots", { _from: from.toISOString(), _to: to.toISOString() }),
        supabase.from("mentor_bookings").select("*").eq("user_id", user.id).order("starts_at", { ascending: false }),
      ]);
      setBusy(new Set((b.data ?? []).map((x) => new Date(x.starts_at).getTime())));
      setMine((m.data ?? []) as Booking[]);
    } catch {
      toast.error("Não foi possível carregar a agenda.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [user?.id]);

  const tz = settings?.timezone ?? "America/Sao_Paulo";
  const takenWeeks = useMemo(
    () => new Set(mine.filter((b) => b.status !== "cancelled").map((b) => weekKey(new Date(b.starts_at), tz))),
    [mine, tz],
  );
  const freeSlots = (ymd: string) =>
    settings ? slotsForDay(ymd, settings, availability).filter((d) => !busy.has(d.getTime())) : [];
  const daySlots = day ? freeSlots(ymdFromLocal(day)) : [];
  const upcoming = mine.filter((b) => b.status === "booked" && new Date(b.ends_at) > new Date());
  const past = mine.filter((b) => !upcoming.includes(b));

  async function book() {
    if (!slot) return;
    setSaving(true);
    const { error } = await supabase.rpc("book_mentor_call", { _starts_at: slot.toISOString(), _notes: notes || undefined });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Call agendada!");
    setSlot(null); setNotes(""); setDay(undefined);
    load();
  }
  async function cancel(id: string) {
    if (!confirm("Cancelar esta call?")) return;
    const { error } = await supabase.rpc("cancel_mentor_booking", { _id: id });
    if (error) return toast.error(error.message);
    toast.success("Call cancelada.");
    load();
  }

  if (loading) return <p role="status" className="text-sm text-muted-foreground">Carregando agenda...</p>;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const lastDay = new Date(today.getTime() + (settings?.max_days_ahead ?? 30) * 86400_000);

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-fade-up">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Agendamento</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Escolha o dia e o horário da sua call com o mentor. Limite de uma call por semana.
        </p>
      </header>

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sua próxima call</h2>
          {upcoming.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><CalendarClock className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold capitalize">{fmtDate(b.starts_at, tz)}</p>
                  <p className="text-sm text-muted-foreground">{fmtTime(b.starts_at, tz)} – {fmtTime(b.ends_at, tz)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {settings?.meeting_link && (
                  <Button asChild size="sm"><a href={settings.meeting_link} target="_blank" rel="noreferrer"><Video className="h-4 w-4" /> Entrar na call</a></Button>
                )}
                <Button size="sm" variant="outline" onClick={() => cancel(b.id)}><X className="h-4 w-4" /> Cancelar</Button>
              </div>
            </div>
          ))}
        </section>
      )}

      {!settings?.enabled ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Os agendamentos estão fechados no momento. Volte mais tarde.
          {isAdmin && <span className="mt-2 block text-primary">Você é admin: abra em Admin → Agendamentos → Disponibilidade → "Abrir agendamentos".</span>}
        </div>
      ) : (
        <section className="grid gap-6 rounded-xl border border-border bg-card p-5 md:grid-cols-[auto_1fr]">
          <Calendar
            mode="single"
            selected={day}
            onSelect={(d) => { setDay(d); setSlot(null); }}
            fromDate={today}
            toDate={lastDay}
            disabled={(d) => d < today || d > lastDay || freeSlots(ymdFromLocal(d)).length === 0}
            className="p-0 pointer-events-auto"
          />
          <div className="space-y-4">
            {!day ? (
              <p className="text-sm text-muted-foreground">Selecione um dia disponível no calendário.</p>
            ) : (
              <>
                <h3 className="font-semibold capitalize">{day.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</h3>
                {daySlots.length > 0 && takenWeeks.has(weekKey(daySlots[0], tz)) ? (
                  <p className="text-sm text-muted-foreground">Você já tem uma call nesta semana. Escolha um dia de outra semana.</p>
                ) : daySlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem horários livres neste dia.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {daySlots.map((d) => (
                      <Button key={d.getTime()} variant={slot?.getTime() === d.getTime() ? "default" : "outline"} size="sm" onClick={() => setSlot(d)}>
                        <Clock className="h-3.5 w-3.5" /> {fmtTime(d, tz)}
                      </Button>
                    ))}
                  </div>
                )}
                {slot && (
                  <div className="space-y-3 border-t border-border pt-4">
                    <Textarea placeholder="Sobre o que você quer falar? (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
                    <Button onClick={book} disabled={saving} className="w-full sm:w-auto">
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar {fmtTime(slot, tz)}
                    </Button>
                  </div>
                )}
              </>
            )}
            {settings.instructions && <p className="whitespace-pre-line text-xs text-muted-foreground">{settings.instructions}</p>}
            <p className="text-xs text-muted-foreground">Horários no fuso de Brasília.</p>
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Histórico</h2>
          {past.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm">
              <span className="capitalize">{fmtDate(b.starts_at, tz)} · {fmtTime(b.starts_at, tz)}</span>
              <span className="text-muted-foreground">{b.status === "cancelled" ? "Cancelada" : "Realizada"}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
