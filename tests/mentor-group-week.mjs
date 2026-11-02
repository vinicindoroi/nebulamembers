import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
const a = '00000000-0000-0000-0000-000000000001';
const b = '00000000-0000-0000-0000-000000000002';
const c = '00000000-0000-0000-0000-000000000003';
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${a}'::uuid $$;
CREATE FUNCTION public.can_access_mentor_schedule(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
CREATE TABLE mentor_schedule_settings(id int, timezone text);
INSERT INTO mentor_schedule_settings VALUES(1,'America/Sao_Paulo');
CREATE TABLE member_group_members(member_id uuid PRIMARY KEY,group_id uuid);
INSERT INTO member_group_members VALUES ('${a}','${a}'),('${b}','${a}');
CREATE TABLE mentor_bookings(id uuid DEFAULT gen_random_uuid() PRIMARY KEY,user_id uuid,starts_at timestamptz,status text);
`);
await db.exec(fs.readFileSync('drizzle/migrations/0011_mentor_group_weekly_limit.sql','utf8'));
const insert = (uid, date, status='booked') => db.query('INSERT INTO mentor_bookings(user_id,starts_at,status) VALUES($1,$2,$3) RETURNING id',[uid,date,status]);
const first = (await insert(a,'2026-11-02T15:00:00Z')).rows[0].id;
await assert.rejects(insert(b,'2026-11-06T18:00:00Z'), /Seu grupo já tem uma call/);
await insert(c,'2026-11-06T18:00:00Z'); // Ungrouped students are unaffected.
const next = (await insert(b,'2026-11-09T15:00:00Z')).rows[0].id;
await assert.rejects(db.query('UPDATE mentor_bookings SET starts_at=$1 WHERE id=$2',['2026-11-05T16:00:00Z',next]), /Seu grupo já tem uma call/);
await db.query("UPDATE mentor_bookings SET status='done' WHERE id=$1",[first]);
await assert.rejects(insert(b,'2026-11-07T15:00:00Z'), /Seu grupo já tem uma call/);
await db.query("UPDATE mentor_bookings SET status='cancelled' WHERE id=$1",[first]);
await insert(b,'2026-11-08T23:00:00Z'); // Sunday in Brasilia.
await assert.rejects(insert(a,'2026-11-09T02:59:00Z'), /Seu grupo já tem uma call/); // Still Sunday locally.
await insert(a,'2026-11-16T03:00:00Z'); // Monday locally, a different week.
const weeks = (await db.query('SELECT * FROM mentor_group_booked_weeks() ORDER BY week_start')).rows;
assert.equal(weeks.length,3);
assert.deepEqual(Object.keys(weeks[0]),['week_start']);
await db.close();
console.log('Group limit: same week blocked, cancellation releases, completed counts, reschedule protected, Brasilia boundary and private weeks passed.');