import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarClock, Check, Loader2, MessageCircle, Plus, Trash2, Video, X } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { syncBookingToGoogle } from "@/lib/google-calendar.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchPlans, type PlanOption } from "@/hooks/use-plans";
import { Checkbox } from "@/components/ui/checkbox";
import { useMemberTags } from "@/components/admin/MemberTags";
import { useMemberGroups } from "@/hooks/use-member-groups";
import { groupMembers, matchesMemberGroup } from "@/lib/member-groups";
import { MemberGroupSelect } from "@/components/admin/MemberGroups";
import { CallLinkEditor, fetchBookingLinks } from "@/components/admin/CallLinkEditor";
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
  const [links, setLinks] = useState<Record<string, string>>({});
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
      setLinks(await fetchBookingLinks((b.data ?? []).map((x) => x.id)));
    } catch {
      toast.error("Erro ao carregar agendamentos.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    const ch = supabase
      .channel(`admin-bookings-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "mentor_bookings" }, () => load())
      .subscribe();
    const iv = setInterval(load, 30000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { supabase.removeChannel(ch); clearInterval(iv); window.removeEventListener("focus", onFocus); };
  }, []);

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
          <Agenda settings={settings} bookings={bookings} profiles={profiles} links={links} reload={load} />
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

function Agenda({ settings, bookings, profiles, links, reload }: {
  settings: ScheduleSettings; bookings: Booking[]; profiles: Record<string, Profile>; links: Record<string, string>; reload: () => void;
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
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const slotsOf = (wins: Availability[]) =>
    wins.reduce((n, w) => n + Math.max(0, Math.floor((toMin(w.end_time) - toMin(w.start_time)) / (form.slot_minutes || 60))), 0);
  const weekSlots = WEEKDAYS.reduce((n, _, wd) => n + slotsOf(availability.filter((a) => a.weekday === wd)), 0);
  const dirty = ["slot_minutes", "min_notice_hours", "max_days_ahead", "meeting_link", "instructions"]
    .some((k) => ((form as any)[k] ?? "") !== ((settings as any)[k] ?? ""));

  async function copyTo(fromWd: number, targets: number[]) {
    const src = availability.filter((a) => a.weekday === fromWd);
    if (!src.length) return;
    const tg = targets.filter((t) => t !== fromWd);
    const ids = availability.filter((a) => tg.includes(a.weekday)).map((a) => a.id);
    if (ids.length) await supabase.from("mentor_availability").delete().in("id", ids);
    const rows = tg.flatMap((weekday) => src.map((w) => ({ weekday, start_time: w.start_time, end_time: w.end_time })));
    const { error } = await supabase.from("mentor_availability").insert(rows);
    if (error) return toast.error(error.message);
    toast.success("Horários copiados.");
    reload();
  }
  function setBlocked(ds: Date[] | undefined) {
    const n = { ...form, blocked_dates: (ds ?? []).map(ymdFromLocal).sort() };
    setForm(n);
    save({ ...settings, blocked_dates: n.blocked_dates }, "Dias de folga atualizados.");
  }

  return (
    <div className="space-y-5 pb-24">
      <div className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5 ${form.enabled ? "border-primary/40 bg-primary/10" : "border-border bg-card"}`}>
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${form.enabled ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
          <div>
            <p className="font-semibold">{form.enabled ? "Agendamentos abertos" : "Agendamentos fechados"}</p>
            <p className="text-sm text-muted-foreground">
              {form.enabled ? `Os alunos podem marcar · ${weekSlots} horários por semana` : "Os alunos não conseguem marcar no momento."}
            </p>
          </div>
        </div>
        <Button onClick={toggle} disabled={saving} variant={form.enabled ? "outline" : "default"}>
          {form.enabled ? "Fechar agendamentos" : "Abrir agendamentos"}
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_480px]">
        <Step n={1} title="Seus horários na semana" desc="Faixas em que você atende. Elas são divididas automaticamente pela duração da call.">
          <div className="divide-y divide-border">
            {WEEKDAYS.map((name, wd) => {
              const wins = availability.filter((a) => a.weekday === wd);
              const n = slotsOf(wins);
              return (
                <div key={wd} className="group flex flex-wrap items-center gap-2 py-3 text-sm">
                  <div className="w-28">
                    <p className={`font-medium ${wins.length ? "" : "text-muted-foreground"}`}>{name}</p>
                    <p className="text-[11px] text-muted-foreground">{wins.length ? `${n} ${n === 1 ? "call" : "calls"}` : "Folga"}</p>
                  </div>
                  {wins.map((w) => (
                    <span key={w.id} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1.5 text-xs font-medium tabular-nums">
                      {w.start_time.slice(0, 5)} – {w.end_time.slice(0, 5)}
                      <button aria-label="Remover horário" onClick={() => removeWindow(w.id)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
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
                    <div className="ml-auto flex items-center gap-1">
                      {wins.length > 0 && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" onClick={() => confirm(`Copiar os horários de ${name} para segunda a sexta?`) && copyTo(wd, [1, 2, 3, 4, 5])}>
                          Copiar p/ dias úteis
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(wd)}><Plus className="h-3.5 w-3.5" /> Horário</Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Step>

        <div className="space-y-5">
          <Step n={2} title="Regras da call" desc="Como os alunos podem marcar.">
            <div className="space-y-1.5">
              <Label>Duração de cada call</Label>
              <div className="flex flex-wrap gap-2">
                {[30, 45, 60, 90].map((m) => (
                  <Button key={m} size="sm" type="button" variant={form.slot_minutes === m ? "default" : "outline"} onClick={() => setForm({ ...form, slot_minutes: m })}>{m} min</Button>
                ))}
                <div className="flex items-center gap-1.5"><Input type="number" min={10} max={240} className="h-9 w-20" value={form.slot_minutes} onChange={(e) => setForm({ ...form, slot_minutes: Number(e.target.value) })} /><span className="text-xs text-muted-foreground">min</span></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Antecedência mínima</Label><div className="flex items-center gap-2"><Input type="number" min={0} value={form.min_notice_hours} onChange={(e) => setForm({ ...form, min_notice_hours: Number(e.target.value) })} /><span className="text-xs text-muted-foreground">h</span></div></div>
              <div className="space-y-1.5"><Label>Agenda aberta por</Label><div className="flex items-center gap-2"><Input type="number" min={1} max={365} value={form.max_days_ahead} onChange={(e) => setForm({ ...form, max_days_ahead: Number(e.target.value) })} /><span className="text-xs text-muted-foreground">dias</span></div></div>
            </div>
            <div className="space-y-1.5"><Label>Link da call (Meet, Zoom...)</Label><Input placeholder="https://meet.google.com/..." value={form.meeting_link ?? ""} onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Recado para o aluno <span className="font-normal text-muted-foreground">(opcional)</span></Label><Textarea rows={3} value={form.instructions ?? ""} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">Limite fixo: cada aluno pode ter 1 call marcada por vez.</p>
          </Step>

          <Step n={3} title="Dias de folga" desc="Clique nos dias em que você não vai atender. Salva na hora.">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setBlocked(mergeDays(blocked, weekendsAhead(365)))}>+ Todos os fins de semana</Button>
              <Button size="sm" variant="outline" onClick={() => setBlocked(mergeDays(blocked, brHolidays()))}>+ Feriados nacionais</Button>
              {blocked.length > 0 && (
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => confirm("Remover todos os dias de folga?") && setBlocked([])}>Limpar tudo</Button>
              )}
            </div>
            <div className="flex justify-center rounded-lg border border-border p-3">
              <Calendar
                mode="multiple"
                locale={ptBR}
                selected={blocked}
                onSelect={setBlocked}
                className="bg-transparent p-0 pointer-events-auto [--cell-size:2.75rem] sm:[--cell-size:3rem] [&_.rdp-caption_label]:text-base [&_.rdp-caption_label]:capitalize [&_.rdp-day]:text-base"
              />
            </div>
            {blocked.length > 0 && (
              <details className="group rounded-lg border border-border">
                <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm">
                  <span><span className="font-semibold">{form.blocked_dates.filter((d) => d >= ymdFromLocal(new Date())).length}</span> dias de folga marcados</span>
                  <span className="text-xs text-muted-foreground group-open:hidden">Ver lista</span>
                  <span className="hidden text-xs text-muted-foreground group-open:inline">Esconder</span>
                </summary>
                <div className="max-h-56 space-y-3 overflow-y-auto border-t border-border p-3">
                  {Object.entries(
                    form.blocked_dates.filter((d) => d >= ymdFromLocal(new Date())).reduce<Record<string, string[]>>((m, d) => {
                      const k = dateFromYmd(d).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
                      (m[k] ??= []).push(d);
                      return m;
                    }, {}),
                  ).map(([month, days]) => (
                    <div key={month} className="space-y-1.5">
                      <p className="text-xs font-medium capitalize text-muted-foreground">{month}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {days.map((d) => (
                          <span key={d} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs tabular-nums">
                            {d.slice(8)}
                            <button aria-label="Remover folga" onClick={() => setBlocked(blocked.filter((x) => ymdFromLocal(x) !== d))} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </Step>
        </div>
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
            <span className="text-sm text-muted-foreground">Você tem alterações não salvas</span>
            <Button size="sm" variant="ghost" onClick={() => setForm({ ...settings, blocked_dates: form.blocked_dates })}>Descartar</Button>
            <Button size="sm" onClick={() => save()} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar</Button>
          </div>
        </div>
      )}
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

  const { tags, assignments: tagAssign } = useMemberTags();
  const memberGroups = useMemberGroups();
  const { groups, groupOf } = memberGroups;
  const [tagF, setTagF] = useState("");
  const [groupF, setGroupF] = useState("");
  const [grouped, setGrouped] = useState(true);
  const [newGroup, setNewGroup] = useState("");
  async function createGroup() {
    if (await memberGroups.createGroup(newGroup)) setNewGroup("");
  }
  async function deleteGroup(name: string) {
    const g = groups.find((x) => x.name === name);
    if (!g || !confirm(`Excluir o grupo "${name}"? Os alunos ficam sem grupo.`)) return;
    await memberGroups.deleteGroup(g.id);
  }
  const shown = members
    .filter((p) => !tagF || tagAssign.some((a) => a.member_id === p.id && a.tag_id === tagF))
    .filter((p) => matchesMemberGroup(p.id, groupF, groupOf));
  const sections = groupMembers(shown, groups, groupOf, grouped);
  useEffect(() => {
    if (!memberGroups.loading && groupF && groupF !== "none" && !groups.some((g) => g.id === groupF)) setGroupF("");
  }, [groups, memberGroups.loading, groupF]);


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
          <p className="font-semibold">Alunos com acesso ({shown.length})</p>
          <Input placeholder="Buscar aluno..." value={q} onChange={(e) => setQ(e.target.value)} className="h-9 max-w-xs" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={tagF} onChange={(e) => setTagF(e.target.value)} className="h-9 rounded-md border border-border bg-background px-2 text-sm">
            <option value="">Todas as tags</option>
            {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={groupF} onChange={(e) => setGroupF(e.target.value)} className="h-9 rounded-md border border-border bg-background px-2 text-sm">
            <option value="">Todos os grupos</option>
            <option value="none">Sem grupo</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <label className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={grouped} onCheckedChange={(v) => setGrouped(!!v)} /> Agrupar</label>
          <form className="ml-auto flex gap-2" onSubmit={(e) => { e.preventDefault(); void createGroup(); }}>
            <Input placeholder="Novo grupo (ex: Sócios X)" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} className="h-9 w-48" />
            <Button type="submit" size="sm" variant="outline" disabled={!newGroup.trim()}><Plus className="h-4 w-4" /> Grupo</Button>
          </form>
        </div>
        <div className="max-h-[520px] overflow-y-auto">
          {shown.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Nenhum aluno.</p> : sections.map(({ id, name: label, members: list }) => (
            <div key={id} className="mb-3">
              {grouped && <div className="flex items-center justify-between border-b border-border py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>{label} ({list.length})</span>
                {id !== "none" && <Button variant="ghost" size="icon" onClick={() => deleteGroup(label)} aria-label="Excluir grupo"><Trash2 className="h-3.5 w-3.5" /></Button>}
              </div>}
              <div className="divide-y divide-border">
                {list.map((p) => {
                  const myTags = tagAssign.filter((a) => a.member_id === p.id).map((a) => tags.find((t) => t.id === a.tag_id)?.name).filter(Boolean);
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium">{p.full_name || "Sem nome"}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.email}{myTags.length ? ` · ${myTags.join(", ")}` : ""}</p>
                      </div>
                      <MemberGroupSelect state={memberGroups} memberIds={[p.id]} label={`Grupo de ${p.full_name || "Sem nome"}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function mergeDays(a: Date[], b: Date[]) {
  const m = new Map<string, Date>();
  for (const d of [...a, ...b]) m.set(ymdFromLocal(d), d);
  return [...m.values()];
}

function weekendsAhead(days: number) {
  const out: Date[] = [];
  const d = new Date(); d.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    if (x.getDay() === 0 || x.getDay() === 6) out.push(x);
  }
  return out;
}

/** Feriados nacionais do Brasil (ano atual e próximo), incluindo Carnaval, Sexta-feira Santa e Corpus Christi. */
function brHolidays() {
  const out: Date[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (const y of [today.getFullYear(), today.getFullYear() + 1]) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1, day = ((h + l - 7 * m + 114) % 31) + 1;
    const easter = new Date(y, month, day);
    const rel = (n: number) => new Date(y, easter.getMonth(), easter.getDate() + n);
    const fixed = [[0, 1], [3, 21], [4, 1], [8, 7], [9, 12], [10, 2], [10, 15], [10, 20], [11, 25]].map(([mo, da]) => new Date(y, mo, da));
    out.push(...fixed, rel(-48), rel(-47), rel(-2), rel(60));
  }
  return out.filter((d) => d >= today);
}
