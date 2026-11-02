import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarClock, Check, Loader2, MessageCircle, Plus, Trash2, Video, X } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { syncBookingToGoogle } from "@/lib/google-calendar.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchPlans, type PlanOption } from "@/hooks/use-plans";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  fetchScheduleConfig, fmtDate, fmtTime, ymdOf, zonedToDate, ymdFromLocal, dateFromYmd, WEEKDAYS,
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

type Profile = { id: string; full_name: string | null; email: string | null; phone: string | null; plan: string | null };

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
          <TabsTrigger value="access">Quem tem acesso</TabsTrigger>
        </TabsList>
        <TabsContent value="agenda">
          <Agenda settings={settings} bookings={bookings} profiles={profiles} reload={load} />
        </TabsContent>
        <TabsContent value="access">
          <Access settings={settings} profiles={profiles} reload={load} />
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
  const [resched, setResched] = useState<Booking | null>(null);
  const [rDate, setRDate] = useState("");
  const [rTime, setRTime] = useState("");
  const [rSaving, setRSaving] = useState(false);

  async function doReschedule() {
    if (!resched || !rDate || !/^\d{2}:\d{2}$/.test(rTime)) return toast.error("Informe data e horário.");
    const [h, m] = rTime.split(":").map(Number);
    const startsAt = zonedToDate(rDate, h * 60 + m, tz);
    setRSaving(true);
    const { error } = await (supabase as any).rpc("admin_reschedule_booking", { _id: resched.id, _starts_at: startsAt.toISOString() });
    setRSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Call remarcada. O aluno foi notificado.");
    syncBookingToGoogle({ data: { bookingId: resched.id } }).catch(() => {});
    setResched(null);
    reload();
  }
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
    syncBookingToGoogle({ data: { bookingId: b.id } }).catch(() => {});
    reload();
  }

  const now = Date.now();
  const todayYmd = ymdOf(new Date(), tz);
  const weekEnd = now + 7 * 86400_000;
  const stats = [
    { label: "Hoje", value: upcoming.filter((b) => ymdOf(new Date(b.starts_at), tz) === todayYmd).length },
    { label: "Próximos 7 dias", value: upcoming.filter((b) => new Date(b.starts_at).getTime() < weekEnd).length },
    { label: "Total agendadas", value: upcoming.length },
    { label: "Realizadas", value: bookings.filter((b) => b.status === "done").length },
  ];
  const next = upcoming[0];

  const waLink = (phone: string) => {
    const d = phone.replace(/\D/g, "");
    return `https://wa.me/${d.length <= 11 ? `55${d}` : d}`;
  };

  const Row = ({ b, showDate }: { b: Booking; showDate?: boolean }) => {
    const p = profiles[b.user_id];
    const name = p?.full_name || p?.email || "Aluno";
    const isPast = new Date(b.ends_at).getTime() < now;
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="flex shrink-0 flex-col items-center justify-center rounded-lg bg-muted px-4 py-2 text-center sm:w-24">
          {showDate && <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{new Date(b.starts_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: tz })}</span>}
          <span className="text-lg font-bold tabular-nums">{fmtTime(b.starts_at, tz)}</span>
          <span className="text-[11px] text-muted-foreground">até {fmtTime(b.ends_at, tz)}</span>
        </div>
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold uppercase text-primary">
            {name.slice(0, 2)}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold">{name}</p>
              {b.status === "done" && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Realizada</span>}
            </div>
            <p className="truncate text-xs text-muted-foreground">{p?.email}</p>
            {b.notes && <p className="line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">“{b.notes}”</p>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {p?.phone ? (
            <Button asChild size="sm" variant="outline">
              <a href={waLink(p.phone)} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
            </Button>
          ) : (
            <span className="self-center text-xs text-muted-foreground/70">Sem WhatsApp</span>
          )}
          {b.status === "booked" && (
            <>
              {settings.meeting_link && !isPast && (
                <Button asChild size="sm"><a href={settings.meeting_link} target="_blank" rel="noreferrer"><Video className="h-4 w-4" /> Entrar</a></Button>
              )}
              <Button size="sm" variant="outline" onClick={() => { setResched(b); setRDate(ymdOf(new Date(b.starts_at), tz)); setRTime(fmtTime(b.starts_at, tz)); }}><CalendarClock className="h-4 w-4" /> Remarcar</Button>
              <Button size="icon" variant="ghost" className="h-9 w-9" title="Marcar como realizada" onClick={() => setStatus(b, "done")}><Check className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground hover:text-destructive" title="Cancelar call" onClick={() => confirm("Cancelar esta call?") && setStatus(b, "cancelled")}><X className="h-4 w-4" /></Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Dialog open={!!resched} onOpenChange={(o) => !o && setResched(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remarcar call</DialogTitle>
            <DialogDescription>{resched ? (profiles[resched.user_id]?.full_name || "Aluno") : ""} será avisado da nova data.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Horário</Label><Input type="time" value={rTime} onChange={(e) => setRTime(e.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Duração: {settings.slot_minutes} min · fuso de Brasília</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setResched(null)}>Voltar</Button>
            <Button onClick={doReschedule} disabled={rSaving}>{rSaving && <Loader2 className="h-4 w-4 animate-spin" />} Remarcar</Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {next && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-primary" />
            <p className="text-sm">
              <span className="text-muted-foreground">Próxima call: </span>
              <span className="font-semibold">{profiles[next.user_id]?.full_name || "Aluno"}</span>
              <span className="capitalize text-muted-foreground"> · {fmtDate(next.starts_at, tz)} às {fmtTime(next.starts_at, tz)}</span>
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setDay(dateFromYmd(ymdOf(new Date(next.starts_at), tz)))}>Ver no calendário</Button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[auto_minmax(0,1fr)]">
        <div className="h-fit rounded-xl border border-border bg-card p-5">
          <Calendar
            mode="single"
            locale={ptBR}
            selected={day}
            onSelect={setDay}
            modifiers={{ booked: bookedDays }}
            modifiersClassNames={{ booked: "[&_button]:after:absolute [&_button]:after:bottom-1.5 [&_button]:after:h-1 [&_button]:after:w-1 [&_button]:after:rounded-full [&_button]:after:bg-primary [&_button]:relative [&_button]:font-bold" }}
            className="bg-transparent p-0 pointer-events-auto [--cell-size:2.75rem] sm:[--cell-size:3.25rem] [&_.rdp-caption_label]:capitalize"
          />
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Dias com call marcada</p>
        </div>
        <div className="space-y-8">
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold capitalize">
                {day ? day.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : "Selecione um dia"}
              </h2>
              <span className="text-xs text-muted-foreground">{selected.length} {selected.length === 1 ? "call" : "calls"}</span>
            </div>
            {selected.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhuma call neste dia.</div>
            ) : selected.map((b) => <Row key={b.id} b={b} />)}
          </section>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Todas as próximas calls</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma call marcada.</p>
            ) : upcoming.map((b) => <Row key={b.id} b={b} showDate />)}
          </section>
        </div>
      </div>
    </div>
  );
}

const Step = ({ n, title, desc, children }: { n: number; title: string; desc: string; children: ReactNode }) => (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">{n}</span>
        <div><p className="font-semibold">{title}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
      </div>
      {children}
    </section>
  );


function Config({ settings, availability, reload }: { settings: ScheduleSettings; availability: Availability[]; reload: () => void }) {
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const [newWin, setNewWin] = useState({ start_time: "09:00", end_time: "12:00" });
  const blocked = form.blocked_dates.map(dateFromYmd);

  async function save(next = form, msg = "Configurações salvas.") {
    setSaving(true);
    const { id: _id, ...rest } = next;
    const { error } = await supabase.from("mentor_schedule_settings")
      .update({ ...rest, meeting_link: rest.meeting_link || null, instructions: rest.instructions || null, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(msg);
    reload();
  }
  async function addWindow(weekday: number) {
    if (newWin.end_time <= newWin.start_time) return toast.error("O fim precisa ser depois do início.");
    const { error } = await supabase.from("mentor_availability").insert({ weekday, ...newWin });
    if (error) return toast.error(error.message);
    setAdding(null);
    reload();
  }
  async function removeWindow(id: string) {
    const { error } = await supabase.from("mentor_availability").delete().eq("id", id);
    if (error) return toast.error(error.message);
    reload();
  }
  const toggle = () => {
    if (!form.enabled && availability.length === 0) return toast.error("Cadastre pelo menos um horário antes de abrir.");
    const n = { ...form, enabled: !form.enabled };
    setForm(n);
    save(n, n.enabled ? "Agendamentos abertos para os alunos." : "Agendamentos fechados.");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5 ${form.enabled ? "border-primary/40 bg-primary/10" : "border-border bg-card"}`}>
        <div>
          <p className="font-semibold">{form.enabled ? "🟢 Agendamentos abertos" : "⚪ Agendamentos fechados"}</p>
          <p className="text-sm text-muted-foreground">
            {form.enabled ? "Os alunos já podem marcar calls nos horários abaixo." : "Os alunos não veem a aba. Cadastre seus horários e clique em abrir."}
          </p>
        </div>
        <Button onClick={toggle} disabled={saving} variant={form.enabled ? "outline" : "default"}>
          {form.enabled ? "Fechar agendamentos" : "Abrir agendamentos"}
        </Button>
      </div>

      <Step n={1} title="Seus horários na semana" desc="Em quais dias e faixas de horário você atende. As calls são divididas automaticamente pela duração.">
        <div className="divide-y divide-border">
          {WEEKDAYS.map((name, wd) => {
            const wins = availability.filter((a) => a.weekday === wd);
            return (
              <div key={wd} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
                <span className="w-24 font-medium">{name}</span>
                {wins.length === 0 && adding !== wd && <span className="text-xs text-muted-foreground">Não atendo</span>}
                {wins.map((w) => (
                  <span key={w.id} className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs">
                    {w.start_time.slice(0, 5)} às {w.end_time.slice(0, 5)}
                    <button aria-label="Remover horário" onClick={() => removeWindow(w.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </span>
                ))}
                {adding === wd ? (
                  <span className="flex items-center gap-1.5">
                    <Input type="time" className="h-8 w-28" value={newWin.start_time} onChange={(e) => setNewWin({ ...newWin, start_time: e.target.value })} />
                    <span className="text-xs text-muted-foreground">às</span>
                    <Input type="time" className="h-8 w-28" value={newWin.end_time} onChange={(e) => setNewWin({ ...newWin, end_time: e.target.value })} />
                    <Button size="sm" className="h-8" onClick={() => addWindow(wd)}><Check className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => setAdding(null)}><X className="h-4 w-4" /></Button>
                  </span>
                ) : (
                  <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={() => setAdding(wd)}><Plus className="h-3.5 w-3.5" /> Horário</Button>
                )}
              </div>
            );
          })}
        </div>
      </Step>

      <Step n={2} title="Regras da call" desc="Como os alunos podem marcar. Lembre de salvar.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5"><Label>Duração de cada call</Label><div className="flex items-center gap-2"><Input type="number" min={10} max={240} value={form.slot_minutes} onChange={(e) => setForm({ ...form, slot_minutes: Number(e.target.value) })} /><span className="text-xs text-muted-foreground">min</span></div></div>
          <div className="space-y-1.5"><Label>Marcar com antecedência de</Label><div className="flex items-center gap-2"><Input type="number" min={0} value={form.min_notice_hours} onChange={(e) => setForm({ ...form, min_notice_hours: Number(e.target.value) })} /><span className="text-xs text-muted-foreground">horas</span></div></div>
          <div className="space-y-1.5"><Label>Mostrar agenda dos próximos</Label><div className="flex items-center gap-2"><Input type="number" min={1} max={365} value={form.max_days_ahead} onChange={(e) => setForm({ ...form, max_days_ahead: Number(e.target.value) })} /><span className="text-xs text-muted-foreground">dias</span></div></div>
        </div>
        <div className="space-y-1.5"><Label>Link da call (Meet, Zoom...)</Label><Input placeholder="https://meet.google.com/..." value={form.meeting_link ?? ""} onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Recado para o aluno (opcional)</Label><Textarea value={form.instructions ?? ""} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></div>
        <p className="text-xs text-muted-foreground">Limite fixo: 1 call por semana por aluno.</p>
        <Button onClick={() => save()} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar regras</Button>
      </Step>

      <Step n={3} title="Dias de folga (opcional)" desc="Clique nos dias em que você não vai atender, como feriados ou viagens.">
        <Calendar mode="multiple" selected={blocked} onSelect={(ds) => setForm({ ...form, blocked_dates: (ds ?? []).map(ymdFromLocal).sort() })} className="p-0 pointer-events-auto" />
        <Button size="sm" variant="outline" onClick={() => save(form, "Dias de folga salvos.")} disabled={saving}>Salvar dias de folga</Button>
      </Step>
    </div>
  );
}

const norm = (v: string | null | undefined) =>
  (v ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");

function Access({ settings, profiles, reload }: { settings: ScheduleSettings; profiles: Record<string, Profile>; reload: () => void }) {
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [selected, setSelected] = useState<string[]>(settings.allowed_plans ?? []);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => { fetchPlans().then(setPlans).catch(() => {}); }, []);

  const slugOf = (plan: string | null) => {
    const n = norm(plan);
    const p = plans.find((x) => norm(x.slug) === n || norm(x.name) === n);
    return p ? norm(p.slug) : n;
  };
  const members = Object.values(profiles)
    .filter((p) => selected.includes(slugOf(p.plan)))
    .filter((p) => `${p.full_name ?? ""} ${p.email ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.full_name ?? a.email ?? "").localeCompare(b.full_name ?? b.email ?? ""));

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("mentor_schedule_settings").update({ allowed_plans: selected }).eq("id", 1);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Acesso atualizado.");
    reload();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <p className="font-semibold">Planos com acesso</p>
          <p className="text-xs text-muted-foreground">Só alunos desses planos veem a aba e conseguem marcar call.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {plans.map((p) => {
            const slug = norm(p.slug);
            return (
              <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <Checkbox checked={selected.includes(slug)} onCheckedChange={(v) => setSelected(v ? [...selected, slug] : selected.filter((x) => x !== slug))} />
                {p.name}
              </label>
            );
          })}
        </div>
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar acesso</Button>
      </section>
      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold">Alunos com acesso ({members.length})</p>
          <Input placeholder="Buscar aluno..." value={q} onChange={(e) => setQ(e.target.value)} className="h-9 max-w-xs" />
        </div>
        <div className="max-h-[480px] divide-y divide-border overflow-y-auto">
          {members.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Nenhum aluno.</p> : members.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
              <div><p className="font-medium">{p.full_name || "Sem nome"}</p><p className="text-xs text-muted-foreground">{p.email}</p></div>
              <span className="text-xs text-muted-foreground">{p.plan}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
