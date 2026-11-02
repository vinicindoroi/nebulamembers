import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchScheduleConfig, fmtDate, fmtTime, ymdOf, ymdFromLocal, dateFromYmd, WEEKDAYS,
  type Availability, type Booking, type ScheduleSettings,
} from "@/lib/mentor-schedule";

export const Route = createFileRoute("/admin/schedule")({
  head: () => ({
    meta: [
      { title: "Agendamentos — Admin Nebula Members" },
      { name: "description", content: "Gerencie horários disponíveis e calls marcadas pelos alunos." },
      { property: "og:title", content: "Agendamentos — Admin Nebula Members" },
      { property: "og:description", content: "Gerencie horários disponíveis e calls marcadas pelos alunos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminSchedule,
});

type Profile = { id: string; full_name: string | null; email: string | null; phone: string | null };

function AdminSchedule() {
  const [settings, setSettings] = useState<ScheduleSettings | null>(null);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const cfg = await fetchScheduleConfig();
      setSettings(cfg.settings);
      setAvailability(cfg.availability);
      const [b, p] = await Promise.all([
        supabase.from("mentor_bookings").select("*").order("starts_at"),
        (supabase as any).rpc("admin_list_profiles"),
      ]);
      setBookings((b.data ?? []) as Booking[]);
      setProfiles(Object.fromEntries(((p.data ?? []) as Profile[]).map((x) => [x.id, x])));
    } catch {
      toast.error("Erro ao carregar agendamentos.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  if (loading || !settings) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Agendamentos</h1>
        <p className="text-sm text-muted-foreground">Calls marcadas pelos alunos e seus horários disponíveis.</p>
      </header>
      <Tabs defaultValue="agenda" className="space-y-6">
        <TabsList>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="config">Disponibilidade</TabsTrigger>
        </TabsList>
        <TabsContent value="agenda">
          <Agenda settings={settings} bookings={bookings} profiles={profiles} reload={load} />
        </TabsContent>
        <TabsContent value="config">
          <Config settings={settings} availability={availability} reload={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Agenda({ settings, bookings, profiles, reload }: {
  settings: ScheduleSettings; bookings: Booking[]; profiles: Record<string, Profile>; reload: () => void;
}) {
  const tz = settings.timezone;
  const [day, setDay] = useState<Date | undefined>(new Date());
  const active = bookings.filter((b) => b.status !== "cancelled");
  const byDay = useMemo(() => {
    const m: Record<string, Booking[]> = {};
    for (const b of active) (m[ymdOf(new Date(b.starts_at), tz)] ??= []).push(b);
    return m;
  }, [active, tz]);
  const bookedDays = Object.keys(byDay).map(dateFromYmd);
  const selected = day ? byDay[ymdFromLocal(day)] ?? [] : [];
  const upcoming = bookings.filter((b) => b.status === "booked" && new Date(b.ends_at) > new Date());

  async function setStatus(b: Booking, status: "done" | "cancelled") {
    const { error } = status === "cancelled"
      ? await supabase.rpc("cancel_mentor_booking", { _id: b.id })
      : await supabase.from("mentor_bookings").update({ status }).eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success(status === "done" ? "Marcada como realizada." : "Call cancelada.");
    reload();
  }

  const Row = ({ b }: { b: Booking }) => {
    const p = profiles[b.user_id];
    return (
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-4">
        <div className="min-w-0 space-y-1">
          <p className="font-semibold">{p?.full_name || p?.email || "Aluno"}</p>
          <p className="text-xs text-muted-foreground">{p?.email}{p?.phone ? ` · ${p.phone}` : ""}</p>
          <p className="text-sm capitalize">{fmtDate(b.starts_at, tz)} · {fmtTime(b.starts_at, tz)}–{fmtTime(b.ends_at, tz)}</p>
          {b.notes && <p className="whitespace-pre-line text-sm text-muted-foreground">“{b.notes}”</p>}
        </div>
        {b.status === "booked" ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setStatus(b, "done")}><Check className="h-4 w-4" /> Realizada</Button>
            <Button size="sm" variant="outline" onClick={() => confirm("Cancelar esta call?") && setStatus(b, "cancelled")}><X className="h-4 w-4" /> Cancelar</Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Realizada</span>
        )}
      </div>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
      <div className="rounded-xl border border-border bg-card p-4 h-fit">
        <Calendar
          mode="single"
          selected={day}
          onSelect={setDay}
          modifiers={{ booked: bookedDays }}
          modifiersClassNames={{ booked: "font-bold text-primary underline underline-offset-4" }}
          className="p-0 pointer-events-auto"
        />
      </div>
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {day ? day.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : "Selecione um dia"}
          </h2>
          {selected.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma call neste dia.</p> : selected.map((b) => <Row key={b.id} b={b} />)}
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Próximas calls ({upcoming.length})</h2>
          {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma call marcada.</p> : upcoming.map((b) => <Row key={b.id} b={b} />)}
        </section>
      </div>
    </div>
  );
}

function Config({ settings, availability, reload }: { settings: ScheduleSettings; availability: Availability[]; reload: () => void }) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [newWin, setNewWin] = useState({ weekday: 1, start_time: "09:00", end_time: "12:00" });
  const blocked = form.blocked_dates.map(dateFromYmd);

  async function save(next = form) {
    setSaving(true);
    const { id: _id, ...rest } = next;
    const { error } = await supabase.from("mentor_schedule_settings")
      .update({ ...rest, meeting_link: rest.meeting_link || null, instructions: rest.instructions || null, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas.");
    reload();
  }
  async function addWindow() {
    if (newWin.end_time <= newWin.start_time) return toast.error("O fim precisa ser depois do início.");
    const { error } = await supabase.from("mentor_availability").insert(newWin);
    if (error) return toast.error(error.message);
    reload();
  }
  async function removeWindow(id: string) {
    const { error } = await supabase.from("mentor_availability").delete().eq("id", id);
    if (error) return toast.error(error.message);
    reload();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-5 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Aba de agendamento ativa</p>
            <p className="text-xs text-muted-foreground">Quando desligada, a aba some para os alunos.</p>
          </div>
          <Switch checked={form.enabled} onCheckedChange={(v) => { const n = { ...form, enabled: v }; setForm(n); save(n); }} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>Duração (min)</Label><Input type="number" min={10} max={240} value={form.slot_minutes} onChange={(e) => setForm({ ...form, slot_minutes: Number(e.target.value) })} /></div>
          <div className="space-y-1.5"><Label>Antecedência (h)</Label><Input type="number" min={0} value={form.min_notice_hours} onChange={(e) => setForm({ ...form, min_notice_hours: Number(e.target.value) })} /></div>
          <div className="space-y-1.5"><Label>Até (dias)</Label><Input type="number" min={1} max={365} value={form.max_days_ahead} onChange={(e) => setForm({ ...form, max_days_ahead: Number(e.target.value) })} /></div>
        </div>
        <div className="space-y-1.5"><Label>Link da call (Meet, Zoom...)</Label><Input placeholder="https://meet.google.com/..." value={form.meeting_link ?? ""} onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Instruções para o aluno</Label><Textarea value={form.instructions ?? ""} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></div>
        <Button onClick={() => save()} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar</Button>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <p className="font-semibold">Horários semanais</p>
        <div className="space-y-2">
          {WEEKDAYS.map((name, wd) => {
            const wins = availability.filter((a) => a.weekday === wd);
            return (
              <div key={wd} className="flex flex-wrap items-center gap-2 border-b border-border pb-2 text-sm">
                <span className="w-20 text-muted-foreground">{name}</span>
                {wins.length === 0 ? <span className="text-xs text-muted-foreground">Indisponível</span> : wins.map((w) => (
                  <span key={w.id} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                    {w.start_time.slice(0, 5)}–{w.end_time.slice(0, 5)}
                    <button aria-label="Remover horário" onClick={() => removeWindow(w.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={newWin.weekday} onChange={(e) => setNewWin({ ...newWin, weekday: Number(e.target.value) })}>
            {WEEKDAYS.map((n, i) => <option key={i} value={i}>{n}</option>)}
          </select>
          <Input type="time" className="w-28" value={newWin.start_time} onChange={(e) => setNewWin({ ...newWin, start_time: e.target.value })} />
          <Input type="time" className="w-28" value={newWin.end_time} onChange={(e) => setNewWin({ ...newWin, end_time: e.target.value })} />
          <Button size="sm" onClick={addWindow}><Plus className="h-4 w-4" /> Adicionar</Button>
        </div>
        <div className="space-y-2 border-t border-border pt-4">
          <p className="font-semibold">Dias bloqueados</p>
          <p className="text-xs text-muted-foreground">Clique nos dias em que você não vai atender (feriados, viagens) e salve.</p>
          <Calendar
            mode="multiple"
            selected={blocked}
            onSelect={(ds) => setForm({ ...form, blocked_dates: (ds ?? []).map(ymdFromLocal).sort() })}
            className="p-0 pointer-events-auto"
          />
          <Button size="sm" variant="outline" onClick={() => save()} disabled={saving}>Salvar dias bloqueados</Button>
        </div>
      </section>
    </div>
  );
}
