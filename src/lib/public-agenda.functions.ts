import { createServerFn } from "@tanstack/react-start";
import { slotsForDay, ymdOf, type Availability, type ScheduleSettings } from "@/lib/mentor-schedule";

export type PublicAgendaDay = { ymd: string; slots: string[] };

/** Public, anonymous: returns only free slot times (no names, notes or links). */
export const getPublicAgenda = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [s, a, e, b] = await Promise.all([
    supabaseAdmin.from("mentor_schedule_settings").select("*").eq("id", 1).maybeSingle(),
    supabaseAdmin.from("mentor_availability").select("*"),
    supabaseAdmin.from("mentor_extra_slots").select("starts_at"),
    supabaseAdmin.from("mentor_blocked_slots").select("starts_at"),
  ]);
  const extras = ((e.data ?? []) as { starts_at: string }[]).map((x) => x.starts_at);
  const blockedSlots = ((b.data ?? []) as { starts_at: string }[]).map((x) => x.starts_at);
  const settings = s.data as ScheduleSettings | null;
  if (!settings) return { enabled: false, timezone: "America/Sao_Paulo", slotMinutes: 30, days: [] as PublicAgendaDay[] };
  const now = new Date();
  const to = new Date(now.getTime() + (settings.max_days_ahead + 1) * 86400_000);
  const { data: booked } = await supabaseAdmin
    .from("mentor_bookings").select("starts_at")
    .in("status", ["booked", "done"])
    .gte("starts_at", now.toISOString()).lte("starts_at", to.toISOString());
  const busy = new Set((booked ?? []).map((b) => new Date(b.starts_at).getTime()));
  const days: PublicAgendaDay[] = [];
  const blocked = settings.blocked_dates ?? [];
  for (let i = 0; i <= settings.max_days_ahead; i++) {
    const ymd = ymdOf(new Date(now.getTime() + i * 86400_000), settings.timezone);
    if (days.some((d) => d.ymd === ymd)) continue;
    const slots = slotsForDay(ymd, { ...settings, blocked_dates: blocked }, (a.data ?? []) as Availability[], now, extras, blockedSlots)
      .filter((d) => !busy.has(d.getTime()))
      .map((d) => d.toISOString());
    if (slots.length) days.push({ ymd, slots });
  }
  return { enabled: settings.enabled, timezone: settings.timezone, slotMinutes: settings.slot_minutes, days };
});
