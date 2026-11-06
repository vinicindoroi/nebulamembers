import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
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
export function WeekAgenda({ settings, availability, extras, bookings, reload }: {
  settings: ScheduleSettings; availability: Availability[]; extras: string[]; bookings: Booking[]; reload: () => void;
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

  const label = (ymd: string) => ymd.slice(8, 10) + "/" + ymd.slice(5, 7);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setOffset(offset - 1)} disabled={offset <= 0}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setOffset(0)}>Esta semana</Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setOffset(offset + 1)}><ChevronRight className="h-4 w-4" /></Button>
          <span className="ml-2 text-sm text-muted-foreground">{label(days[0])} – {label(days[6])}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-muted" />Fixo</span>
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-primary/60" />Avulso</span>
          <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-accent ring-1 ring-primary" />Marcado</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[640px] gap-1" style={{ gridTemplateColumns: "52px repeat(7, minmax(0,1fr))" }}>
          <div />
          {days.map((ymd) => {
            const off = settings.blocked_dates.includes(ymd);
            return (
              <div key={ymd} className={`rounded-md py-1.5 text-center text-xs ${ymd === today ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>
                <p className="font-semibold">{SHORT[weekdayOf(ymd)]}</p>
                <p className="tabular-nums">{label(ymd)}{off && " · folga"}</p>
              </div>
            );
          })}
          {rows.map((min) => (
            <div key={min} className="contents">
              <div className="pr-1 pt-1.5 text-right text-[11px] tabular-nums text-muted-foreground">{hhmm(min)}</div>
              {days.map((ymd) => {
                const ms = zonedToDate(ymd, min, tz).getTime();
                const past = ms <= now;
                const fixed = fixedMins(weekdayOf(ymd)).has(min) && !settings.blocked_dates.includes(ymd);
                const extra = extraSet.has(ms);
                const booked = bookedSet.has(ms);
                const cls = booked ? "bg-accent ring-1 ring-primary text-foreground"
                  : extra ? "bg-primary/60 text-primary-foreground hover:bg-primary/40"
                  : fixed ? "bg-muted text-muted-foreground"
                  : "border border-dashed border-border text-transparent hover:border-primary hover:text-primary";
                const canClick = !past && !booked && !(fixed && !extra);
                return (
                  <button
                    key={ymd}
                    disabled={!canClick || busy === ms}
                    onClick={() => toggle(ymd, min)}
                    title={booked ? "Call marcada" : extra ? "Remover horário avulso" : fixed ? "Horário fixo" : past ? "" : "Liberar este horário"}
                    className={`flex h-8 items-center justify-center rounded-md text-[11px] font-medium transition-colors ${past ? "opacity-30" : ""} ${cls} disabled:cursor-default`}
                  >
                    {booked ? "Marcada" : extra ? <X className="h-3 w-3" /> : fixed ? hhmm(min) : !past && <Plus className="h-3 w-3" />}
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
