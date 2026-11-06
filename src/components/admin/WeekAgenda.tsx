import { useMemo, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { weekdayOf, ymdOf, zonedToDate, type Availability, type Booking, type ScheduleSettings } from "@/lib/mentor-schedule";

const SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function addDays(ymd: string, n: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Week grid: fixed hours (from weekly windows), one-off extra slots and bookings. */
export function WeekAgenda({ settings, availability, extras, blockedSlots, bookings, reload }: {
  settings: ScheduleSettings; availability: Availability[]; extras: string[]; blockedSlots: string[]; bookings: Booking[]; reload: () => void;
}) {
  const tz = settings.timezone;
  const step = settings.slot_minutes || 60;
  const today = ymdOf(new Date(), tz);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<number | null>(null);
  const start = addDays(today, offset * 7 - ((weekdayOf(today) + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  const fixedMins = (wd: number) => {
    const s = new Set<number>();
    for (const a of availability.filter((x) => x.weekday === wd))
      for (let t = toMin(a.start_time); t + step <= toMin(a.end_time); t += step) s.add(t);
    return s;
  };
  const rows = useMemo(() => {
    let lo = 8 * 60, hi = 21 * 60;
    for (const a of availability) { lo = Math.min(lo, toMin(a.start_time)); hi = Math.max(hi, toMin(a.end_time)); }
    const out: number[] = [];
    for (let t = Math.floor(lo / step) * step; t + step <= hi; t += step) out.push(t);
    return out;
  }, [availability, step]);

  const extraSet = new Set(extras.map((x) => new Date(x).getTime()));
  const blockedSet = new Set(blockedSlots.map((x) => new Date(x).getTime()));
  const bookedSet = new Set(bookings.filter((b) => b.status !== "cancelled").map((b) => new Date(b.starts_at).getTime()));
  const now = Date.now();

  async function toggle(ymd: string, min: number) {
    const d = zonedToDate(ymd, min, tz);
    const ms = d.getTime();
    setBusy(ms);
    const { error } = extraSet.has(ms)
      ? await supabase.from("mentor_extra_slots").delete().eq("starts_at", d.toISOString())
      : await supabase.from("mentor_extra_slots").insert({ starts_at: d.toISOString() });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(extraSet.has(ms) ? "Horário avulso removido." : "Horário liberado para os alunos.");
    reload();
  }

  async function toggleBlock(ymd: string, min: number) {
    const d = zonedToDate(ymd, min, tz);
    const ms = d.getTime();
    setBusy(ms);
    const { error } = blockedSet.has(ms)
      ? await supabase.from("mentor_blocked_slots").delete().eq("starts_at", d.toISOString())
      : await supabase.from("mentor_blocked_slots").insert({ starts_at: d.toISOString() });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(blockedSet.has(ms) ? "Horário restaurado." : "Horário removido só deste dia.");
    reload();
  }

  const label = (ymd: string) => ymd.slice(8, 10) + "/" + ymd.slice(5, 7);
  const dayStats = (ymd: string) => {
    let free = 0, booked = 0;
    const off = settings.blocked_dates.includes(ymd);
    const fx = fixedMins(weekdayOf(ymd));
    for (const m of rows) {
      const ms = zonedToDate(ymd, m, tz).getTime();
      if (bookedSet.has(ms)) booked++;
      else if (ms > now && !blockedSet.has(ms) && (extraSet.has(ms) || (fx.has(m) && !off))) free++;
    }
    return { free, booked, off };
  };
  const week = days.map(dayStats);
  const totFree = week.reduce((a, d) => a + d.free, 0);
  const totBooked = week.reduce((a, d) => a + d.booked, 0);
  const nowMin = (() => { const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()).split(":"); return Number(p[0]) * 60 + Number(p[1]); })();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card/60 p-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setOffset(offset - 1)} disabled={offset <= 0}><ChevronLeft className="h-4 w-4" /></Button>
          <button onClick={() => setOffset(0)} className={`h-8 rounded-lg px-3 text-xs font-semibold transition-colors ${offset === 0 ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>Hoje</button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setOffset(offset + 1)}><ChevronRight className="h-4 w-4" /></Button>
          <span className="px-2 text-sm font-medium tabular-nums">{label(days[0])} – {label(days[6])}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">{totFree} livres</span>
          <span className="rounded-full bg-muted px-3 py-1 font-medium">{totBooked} marcadas</span>
          <span className="hidden items-center gap-3 pl-2 text-muted-foreground sm:flex">
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />Fixo</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-primary" />Avulso</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full border-2 border-primary" />Marcada</span>
          </span>
        </div>
      </div>
      <div key={offset} className="overflow-x-auto rounded-2xl border border-border bg-card/40 p-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
        <div className="grid min-w-[720px] gap-1.5" style={{ gridTemplateColumns: "56px repeat(7, minmax(0,1fr))" }}>
          <div />
          {days.map((ymd, i) => {
            const st = week[i]; const isToday = ymd === today;
            return (
              <div key={ymd} className={`rounded-xl px-2 py-2 text-center transition-colors ${isToday ? "bg-primary/15 ring-1 ring-primary/40" : st.off ? "opacity-50" : ""}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${isToday ? "text-primary" : "text-muted-foreground"}`}>{SHORT[weekdayOf(ymd)]}</p>
                <p className={`text-lg font-bold leading-tight tabular-nums ${isToday ? "text-primary" : "text-foreground"}`}>{ymd.slice(8, 10)}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{st.off ? "Folga" : st.booked || st.free ? `${st.booked} marc. · ${st.free} livre${st.free === 1 ? "" : "s"}` : "—"}</p>
              </div>
            );
          })}
          {rows.map((min) => (
            <div key={min} className="contents">
              <div className="relative pr-2 pt-2.5 text-right text-[11px] tabular-nums text-muted-foreground">{hhmm(min)}</div>
              {days.map((ymd) => {
                const ms = zonedToDate(ymd, min, tz).getTime();
                const past = ms <= now;
                const off = settings.blocked_dates.includes(ymd);
                const fixed = fixedMins(weekdayOf(ymd)).has(min) && !off;
                const extra = extraSet.has(ms);
                const blocked = blockedSet.has(ms);
                const booked = bookedSet.has(ms);
                const isNowRow = ymd === today && nowMin >= min && nowMin < min + step;
                const cls = booked ? "border-2 border-primary/70 bg-primary/10 text-foreground shadow-sm"
                  : extra ? "bg-primary text-primary-foreground shadow-sm hover:brightness-110 hover:scale-[1.03]"
                  : blocked ? "border border-dashed border-border/60 text-muted-foreground/50 line-through hover:border-primary hover:text-primary hover:no-underline"
                  : fixed ? "bg-muted/70 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  : off ? "bg-muted/20 text-transparent"
                  : "border border-dashed border-border/60 text-transparent hover:border-primary hover:bg-primary/5 hover:text-primary";
                const canClick = !past && !booked && !off;
                return (
                  <button
                    key={ymd}
                    disabled={!canClick || busy === ms}
                    onClick={() => (fixed && !extra ? toggleBlock(ymd, min) : toggle(ymd, min))}
                    title={booked ? "Call marcada" : extra ? "Remover horário avulso" : blocked ? "Restaurar horário fixo" : fixed ? "Remover este horário só deste dia" : past ? "" : "Liberar este horário"}
                    className={`group relative flex h-10 items-center justify-center gap-1 rounded-lg text-[11px] font-medium transition-all duration-200 ${past && !booked ? "opacity-25" : ""} ${past && booked ? "opacity-60" : ""} ${cls} disabled:cursor-default ${busy === ms ? "animate-pulse" : ""}`}
                  >
                    {isNowRow && <span className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-primary" style={{ top: `${((nowMin - min) / step) * 100}%` }}><i className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-primary" /></span>}
                    {booked ? <><CalendarCheck className="h-3.5 w-3.5 text-primary" />Marcada</>
                      : extra ? <><span className="group-hover:hidden">{hhmm(min)}</span><X className="hidden h-3.5 w-3.5 group-hover:block" /></>
                      : blocked ? <><span className="group-hover:hidden">{hhmm(min)}</span><span className="hidden text-[10px] font-semibold group-hover:inline">Restaurar</span></>
                      : fixed ? <><span className="group-hover:hidden">{hhmm(min)}</span><X className="hidden h-3.5 w-3.5 group-hover:block" /></>
                      : !past && !off && <><Plus className="h-3.5 w-3.5" /><span className="hidden lg:inline">Liberar</span></>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
