import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [allowed, setAllowed] = useState(true);
  const [day, setDay] = useState<Date | undefined>();
  const [slot, setSlot] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  async function load() {
    if (!user) return;
    try {
      const cfg = await fetchScheduleConfig();
      const acc = await supabase.rpc("can_access_mentor_schedule", {});
      setAllowed(!!acc.data);
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

  // Atualização ao vivo: aviso compartilhado + checagem periódica/ao voltar à aba
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("mentor-schedule-room")
      .on("broadcast", { event: "changed" }, () => load())
      .subscribe();
    channelRef.current = ch;
    const iv = setInterval(load, 20000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
    };
  }, [user?.id]);

  useEffect(() => {
    if (slot && busy.has(slot.getTime())) {
      toast.warning("Esse horário acabou de ser reservado por outro aluno. Escolha outro.");
      setSlot(null);
    }
  }, [busy]);

  const notifyOthers = () => channelRef.current?.send({ type: "broadcast", event: "changed", payload: {} });

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
    load(); notifyOthers();
  }
  async function cancel(id: string) {
    if (!confirm("Cancelar esta call?")) return;
    const { error } = await supabase.rpc("cancel_mentor_booking", { _id: id });
    if (error) return toast.error(error.message);
    toast.success("Call cancelada.");
    load(); notifyOthers();
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

      {!allowed ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          O agendamento de calls é exclusivo da mentoria individual.
        </div>
      ) : !settings?.enabled ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Os agendamentos estão fechados no momento. Volte mais tarde.
          {isAdmin && <span className="mt-2 block text-primary">Você é admin: abra em Admin → Agendamentos → Disponibilidade → "Abrir agendamentos".</span>}
        </div>
      ) : (
        <section className="grid overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[auto_minmax(0,1fr)]">
          <div className="border-b border-border p-5 sm:p-7 lg:border-b-0 lg:border-r">
            <StepLabel n={1} label="Escolha o dia" done={!!day} />
            <div className="mt-5 flex justify-center">
              <Calendar
                mode="single"
                locale={ptBR}
                selected={day}
                onSelect={(d) => { setDay(d); setSlot(null); }}
                startMonth={today}
                endMonth={lastDay}
                disabled={(d) => d < today || d > lastDay || freeSlots(ymdFromLocal(d)).length === 0}
                modifiers={{ mine: (d) => upcoming.some((b) => ymdFromLocal(new Date(b.starts_at)) === ymdFromLocal(d)) }}
                modifiersClassNames={{ mine: "[&_button]:ring-2 [&_button]:ring-primary" }}
                className="bg-transparent p-0 pointer-events-auto [--cell-size:2.75rem] sm:[--cell-size:3.5rem] xl:[--cell-size:4rem] [&_.rdp-caption_label]:text-base [&_.rdp-caption_label]:capitalize [&_.rdp-day]:text-base"
              />
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-foreground" /> Disponível</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" /> Indisponível</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Selecionado</span>
            </div>
          </div>

          <div className="flex min-w-0 flex-col p-5 sm:p-7">
            <StepLabel n={2} label="Escolha o horário" done={!!slot} />
            <div className="mt-5 flex-1 space-y-5">
              {!day ? (
                <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-8 text-center">
                  <CalendarClock className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Selecione um dia no calendário para ver os horários livres.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-semibold capitalize">{day.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</h3>
                    {daySlots.length > 0 && <span className="shrink-0 text-xs text-muted-foreground">{daySlots.length} {daySlots.length === 1 ? "horário" : "horários"}</span>}
                  </div>
                  {daySlots.length > 0 && takenWeeks.has(weekKey(daySlots[0], tz)) ? (
                    <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">Você já tem uma call nesta semana. Escolha um dia de outra semana.</p>
                  ) : daySlots.length === 0 ? (
                    <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">Sem horários livres neste dia.</p>
                  ) : (
                    periodGroups(daySlots, tz).map(([label, items]) => (
                      <div key={label} className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                          {items.map((d) => (
                            <Button key={d.getTime()} variant={slot?.getTime() === d.getTime() ? "default" : "outline"} className="h-11 text-sm" onClick={() => setSlot(d)}>
                              {fmtTime(d, tz)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {slot && (
                <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
                  <StepLabel n={3} label="Confirme" done={false} />
                  <p className="text-sm">
                    <span className="font-semibold capitalize">{fmtDate(slot, tz)}</span> · {fmtTime(slot, tz)} – {fmtTime(new Date(slot.getTime() + settings.slot_minutes * 60000), tz)}
                  </p>
                  <Textarea placeholder="Sobre o que você quer falar? (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
                  <Button onClick={book} disabled={saving} className="h-11 w-full">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar agendamento
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-6 space-y-1 border-t border-border pt-4">
              {settings.instructions && <p className="whitespace-pre-line text-xs text-muted-foreground">{settings.instructions}</p>}
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> Horários no fuso de Brasília · {settings.slot_minutes} min por call</p>
            </div>
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
