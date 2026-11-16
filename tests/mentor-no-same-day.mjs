// Rule: a student can never book a call for the current day (mentor timezone),
// even with a make-up exception or on an extra slot.
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
const uid = "00000000-0000-0000-0000-000000000001";
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${uid}'::uuid $$;
CREATE FUNCTION public.can_access_mentor_schedule(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
CREATE TABLE mentor_schedule_settings(id int, enabled bool, slot_minutes int, min_notice_hours int, max_days_ahead int, meeting_link text, instructions text, timezone text, blocked_dates date[], updated_at timestamptz, allowed_plans text[]);
INSERT INTO mentor_schedule_settings VALUES (1,true,60,24,30,null,null,'America/Sao_Paulo','{}',now(),'{individual}');
CREATE TABLE mentor_extra_slots(starts_at timestamptz);
CREATE TABLE mentor_blocked_slots(starts_at timestamptz);
CREATE TABLE mentor_availability(weekday int, start_time time, end_time time);
CREATE TABLE mentor_bookings(id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id uuid, starts_at timestamptz, ends_at timestamptz, status text DEFAULT 'booked', notes text, makeup_pending bool DEFAULT false);
-- Admin-cancelled call => make-up exception active.
INSERT INTO mentor_bookings(user_id,starts_at,ends_at,status,makeup_pending) VALUES ('${uid}', now()-interval '7 days', now()-interval '7 days'+interval '1 hour','cancelled',true);
`);
await db.exec(fs.readFileSync("drizzle/migrations/0035_mentor_no_same_day_booking.sql", "utf8"));
const tz = "America/Sao_Paulo";
// Last minute of today (local) and noon tomorrow (local).
const { rows: [t] } = await db.query(`SELECT
  ((date_trunc('day', now() AT TIME ZONE '${tz}') + interval '23 hours 59 minutes') AT TIME ZONE '${tz}') AS today_late,
  ((date_trunc('day', now() AT TIME ZONE '${tz}') + interval '1 day 12 hours') AT TIME ZONE '${tz}') AS tomorrow_noon,
  (now() AT TIME ZONE '${tz}')::time > '23:58' AS too_late`);
if (!t.too_late) {
  await db.query("INSERT INTO mentor_extra_slots VALUES ($1),($2)", [t.today_late, t.tomorrow_noon]);
  // Same day: blocked even with make-up + extra slot.
  await assert.rejects(db.query("SELECT book_mentor_call($1)", [t.today_late]), /mesmo dia/);
  // Tomorrow: allowed (make-up skips the 24h notice).
  const r = await db.query("SELECT book_mentor_call($1) AS id", [t.tomorrow_noon]);
  assert.ok(r.rows[0].id);
}
console.log("mentor-no-same-day: ok");
