import { supabase } from "@/integrations/supabase/client";

export type ScheduleSettings = {
  id: number;
  enabled: boolean;
  slot_minutes: number;
  min_notice_hours: number;
  max_days_ahead: number;
  meeting_link: string | null;
  instructions: string | null;
  timezone: string;
  blocked_dates: string[];
  allowed_plans: string[];
};
export type Availability = { id: string; weekday: number; start_time: string; end_time: string };
export type Booking = {
  id: string;
  user_id: string;
  starts_at: string;
  ends_at: string;
  status: "booked" | "cancelled" | "done";
  notes: string | null;
  created_at: string;
};

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export async function fetchScheduleConfig() {
  const [s, a, e, b] = await Promise.all([
    supabase.from("mentor_schedule_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("mentor_availability").select("*").order("weekday").order("start_time"),
    supabase.from("mentor_extra_slots").select("starts_at").gte("starts_at", new Date(Date.now() - 86400_000).toISOString()),
    supabase.from("mentor_blocked_slots").select("starts_at").gte("starts_at", new Date(Date.now() - 86400_000).toISOString()),
  ]);
  if (s.error) throw s.error;
  if (a.error) throw a.error;
  return {
    settings: (s.data ?? null) as ScheduleSettings | null,
    availability: (a.data ?? []) as Availability[],
    extras: ((e.data ?? []) as { starts_at: string }[]).map((x) => x.starts_at),
    blockedSlots: ((b.data ?? []) as { starts_at: string }[]).map((x) => x.starts_at),
  };
}

/** Offset (ms) of a timezone at a given instant. */
function tzOffset(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date);
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
  return asUtc - date.getTime();
}

/** Converts a wall-clock date/time in `tz` to a real Date. */
export function zonedToDate(ymd: string, minutes: number, tz: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  const off = tzOffset(new Date(guess), tz);
  return new Date(guess - off);
}

export function ymdOf(date: Date, tz: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function weekdayOf(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** All bookable slot start instants for a local day, ignoring existing bookings. */
export function slotsForDay(ymd: string, settings: ScheduleSettings, availability: Availability[], now = new Date(), extras: string[] = [], blockedSlots: string[] = []) {
  const removed = new Set(blockedSlots.map((x) => new Date(x).getTime()));
  const extra = extras.map((x) => new Date(x)).filter((d) => d.getTime() > now.getTime() && ymdOf(d, settings.timezone) === ymd && !removed.has(d.getTime()));
  const merge = (list: Date[]) => {
    const seen = new Set(list.map((d) => d.getTime()));
    return [...list, ...extra.filter((d) => !seen.has(d.getTime()))].sort((a, b) => a.getTime() - b.getTime());
  };
  if (settings.blocked_dates.includes(ymd)) return merge([]);
  const wd = weekdayOf(ymd);
  const minStart = now.getTime() + settings.min_notice_hours * 3600_000;
  const maxStart = now.getTime() + settings.max_days_ahead * 86400_000;
  const out: Date[] = [];
  for (const a of availability.filter((x) => x.weekday === wd)) {
    const end = toMin(a.end_time);
    for (let t = toMin(a.start_time); t + settings.slot_minutes <= end; t += settings.slot_minutes) {
      const d = zonedToDate(ymd, t, settings.timezone);
      if (d.getTime() >= minStart && d.getTime() <= maxStart && !removed.has(d.getTime())) out.push(d);
    }
  }
  return merge(out);
}

/** Monday-based week key in the mentor's timezone (matches the database rule). */
export function weekKey(date: Date, tz: string) {
  const ymd = ymdOf(date, tz);
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  const dow = (utc.getUTCDay() + 6) % 7;
  utc.setUTCDate(utc.getUTCDate() - dow);
  return utc.toISOString().slice(0, 10);
}

export function fmtTime(d: Date | string, tz: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}
export function fmtDate(d: Date | string, tz: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, weekday: "long", day: "2-digit", month: "long" }).format(new Date(d));
}

export function dateFromYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function ymdFromLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}


