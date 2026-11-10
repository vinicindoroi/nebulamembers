import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarClock, ChevronDown, History, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtTime, ymdOf, type Booking } from "@/lib/mentor-schedule";

type Event = {
  id: string;
  booking_id: string;
  user_id: string;
  kind: "cancelled" | "rescheduled";
  old_starts_at: string;
  new_starts_at: string | null;
  reason: string | null;
  by_admin: boolean;
  created_at: string;
};
type Profile = { full_name: string | null; email: string | null };
type Filter = "all" | "cancelled" | "rescheduled";

const PAGE_DAYS = 7;

/** Admin history of cancelled and rescheduled calls, grouped by the day the change was made. */
export function CallHistory({ tz, bookings, profiles }: {
  tz: string;
  bookings: Booking[];
  profiles: Record<string, Profile>;
}) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [days, setDays] = useState(PAGE_DAYS);

  // Refetch whenever bookings change (parent reloads on realtime/polling).
  useEffect(() => {
    (supabase as any)
      .from("mentor_booking_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }: { data: Event[] | null }) => setEvents(data ?? []));
  }, [bookings]);

  const status = useMemo(() => Object.fromEntries(bookings.map((b) => [b.id, b.status])), [bookings]);
  const shown = events.filter((e) => filter === "all" || e.kind === filter);
  const groups = useMemo(() => {
    const m = new Map<string, Event[]>();
    for (const e of shown) {
      const k = ymdOf(new Date(e.created_at), tz);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    return [...m.entries()];
  }, [shown, tz]);

  const todayYmd = ymdOf(new Date(), tz);
  const yesterdayYmd = ymdOf(new Date(Date.now() - 86400_000), tz);
  const dayTitle = (ymd: string, iso: string) => {
    const label = new Date(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: tz });
    if (ymd === todayYmd) return `Hoje · ${label}`;
    if (ymd === yesterdayYmd) return `Ontem · ${label}`;
    return label;
  };
  const callDate = (iso: string) =>
    `${new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: tz })} às ${fmtTime(iso, tz)}`;
  const count = (k: Filter) => (k === "all" ? events.length : events.filter((e) => e.kind === k).length);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-muted/25">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <History className="h-4 w-4" /> Histórico de cancelamentos e remarcações
        </span>
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">{events.length}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="space-y-5 border-t border-border p-4">
          <div className="flex flex-wrap gap-2" role="tablist">
            {([["all", "Tudo"], ["cancelled", "Canceladas"], ["rescheduled", "Remarcadas"]] as [Filter, string][]).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={filter === k}
                onClick={() => { setFilter(k); setDays(PAGE_DAYS); }}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${filter === k ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                {label} <span className="tabular-nums opacity-70">{count(k)}</span>
              </button>
            ))}
          </div>

          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada por aqui ainda.</p>
          ) : (
            <>
              {groups.slice(0, days).map(([ymd, list]) => (
                <div key={ymd} className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground first-letter:uppercase">
                    {dayTitle(ymd, list[0].created_at)} <span className="font-normal">· {list.length}</span>
                  </p>
                  <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                    {list.map((e) => {
                      const p = profiles[e.user_id];
                      const name = p?.full_name || p?.email || "Aluno";
                      const later = e.kind === "cancelled" ? status[e.booking_id] : undefined;
                      return (
                        <li key={e.id} className="flex flex-wrap items-start gap-3 px-4 py-3 text-sm">
                          {e.kind === "cancelled"
                            ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-label="Cancelada" />
                            : <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-label="Remarcada" />}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="font-semibold">{name}</span>
                              {e.kind === "cancelled" ? (
                                <span className="text-muted-foreground">call de <span className="font-medium text-foreground tabular-nums">{callDate(e.old_starts_at)}</span> cancelada</span>
                              ) : (
                                <span className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
                                  remarcada <span className="tabular-nums line-through">{callDate(e.old_starts_at)}</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                  <span className="font-medium text-foreground tabular-nums">{e.new_starts_at ? callDate(e.new_starts_at) : "—"}</span>
                                </span>
                              )}
                              {later === "done" && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Depois registrada como realizada</span>}
                              {later === "booked" && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Depois devolvida</span>}
                            </div>
                            {e.reason && <p className="text-xs text-muted-foreground">Motivo: {e.reason}</p>}
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {e.by_admin ? "por você" : "pelo aluno"} · {fmtTime(e.created_at, tz)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {groups.length > days && (
                <button type="button" onClick={() => setDays((d) => d + PAGE_DAYS)} className="text-xs font-medium text-primary hover:underline">
                  Ver dias anteriores
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
