import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import { addMonths, buildInstallments, reminderStatus, studentVisibleReminders, adminDueReminders, daysUntil } from "../src/lib/payment-reminders.ts";

// Monthly installments keep the due day and clamp to month end.
assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
assert.equal(addMonths("2026-11-15", 2), "2027-01-15");
const six = buildInstallments({ count: 6, firstDue: "2026-11-15", amount: 500 });
assert.equal(six.length, 6);
assert.equal(six[0].label, "Parcela 1/6");
assert.equal(six[5].label, "Parcela 6/6");
assert.equal(six[5].due_date, "2027-04-15");
// Starting at parcel 3 creates only the remaining 4, first one on the chosen date.
const rest = buildInstallments({ count: 6, firstDue: "2026-12-10", amount: 500, startAt: 3 });
assert.deepEqual(rest.map((r) => r.label), ["Parcela 3/6", "Parcela 4/6", "Parcela 5/6", "Parcela 6/6"]);
assert.equal(rest[0].due_date, "2026-12-10");
assert.equal(buildInstallments({ count: 1, firstDue: "2026-12-01", amount: null })[0].label, "Pagamento");

// Status around the due date.
const today = "2026-11-12";
assert.equal(daysUntil("2026-11-10", today), -2);
assert.equal(reminderStatus({ due_date: "2026-11-10", paid_at: null }, today), "overdue");
assert.equal(reminderStatus({ due_date: "2026-11-12", paid_at: null }, today), "today");
assert.equal(reminderStatus({ due_date: "2026-11-17", paid_at: null }, today), "soon");
assert.equal(reminderStatus({ due_date: "2026-11-18", paid_at: null }, today), "upcoming");
assert.equal(reminderStatus({ due_date: "2026-11-10", paid_at: "2026-11-10T10:00:00Z" }, today), "paid");

// Student sees overdue + up to 5 days ahead, never paid ones; admin sees up to 7 days ahead.
const mk = (id, due, paid = null) => ({ id, user_id: "u", label: id, amount: 1, due_date: due, note: null, paid_at: paid });
const list = [mk("late", "2026-11-01"), mk("paid", "2026-11-05", "x"), mk("in5", "2026-11-17"), mk("in6", "2026-11-18"), mk("in8", "2026-11-20")];
assert.deepEqual(studentVisibleReminders(list, today).map((r) => r.id), ["late", "in5"]);
assert.deepEqual(adminDueReminders(list, today).map((r) => r.id), ["late", "in5", "in6"]);

// RLS: admin manages everything; member reads only own, cannot write; pending member reads nothing.
const db = new PGlite();
const admin = "00000000-0000-0000-0000-000000000001";
const student = "00000000-0000-0000-0000-000000000002";
const other = "00000000-0000-0000-0000-000000000003";
const pending = "00000000-0000-0000-0000-000000000004";
await db.exec(`
CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE TYPE public.app_role AS ENUM ('admin','moderator','member');
CREATE TABLE public.profiles(id uuid PRIMARY KEY, plan text);
CREATE TABLE public.user_roles(user_id uuid, role public.app_role);
CREATE FUNCTION public.has_role(uid uuid, wanted public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=uid AND role=wanted) $$;
CREATE FUNCTION public.is_member_approved() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND plan <> 'pending') $$;
INSERT INTO public.profiles VALUES ('${admin}','Individual'),('${student}','Individual'),('${other}','Individual'),('${pending}','pending');
INSERT INTO public.user_roles VALUES ('${admin}','admin');
`);
await db.exec(fs.readFileSync(new URL("../drizzle/migrations/0034_payment_reminders.sql", import.meta.url), "utf8"));
async function asUser(id, action) {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("SET ROLE authenticated");
  try { await action(); } finally { await db.exec("RESET ROLE"); }
}
const count = async () => (await db.query("SELECT count(*)::int AS n FROM public.payment_reminders")).rows[0].n;
await asUser(admin, async () => {
  for (const u of [student, other, pending]) await db.query("INSERT INTO public.payment_reminders(user_id,label,amount,due_date) VALUES ($1,'Parcela 1/2',500,'2026-11-15')", [u]);
  assert.equal(await count(), 3);
});
await asUser(student, async () => {
  assert.equal(await count(), 1);
  await assert.rejects(db.query("INSERT INTO public.payment_reminders(user_id,due_date) VALUES ($1,'2026-12-01')", [student]));
  const upd = await db.query("UPDATE public.payment_reminders SET paid_at=now() RETURNING id");
  assert.equal(upd.rows.length, 0, "student cannot mark own reminder as paid");
});
await asUser(pending, async () => { assert.equal(await count(), 0); });
console.log("payment-reminders: ok");
