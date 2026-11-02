import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";
import { matchesMemberTag } from "../src/lib/member-tags.ts";

const db = new PGlite();
const admin = "00000000-0000-0000-0000-000000000001";
const student = "00000000-0000-0000-0000-000000000002";
await db.exec(`
CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE TABLE public.profiles(id uuid PRIMARY KEY);
CREATE TABLE public.user_roles(user_id uuid, role text);
CREATE FUNCTION public.has_role(uid uuid, wanted text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=uid AND role=wanted) $$;
INSERT INTO public.profiles VALUES ('${admin}'),('${student}');
INSERT INTO public.user_roles VALUES ('${admin}','admin');
`);
await db.exec(fs.readFileSync("drizzle/migrations/0009_member_custom_tags.sql", "utf8"));
async function asUser(id, action) {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("SET ROLE authenticated");
  try { await action(); } finally { await db.exec("RESET ROLE"); }
}
let tagId;
await asUser(admin, async () => {
  const result = await db.query("INSERT INTO public.member_tags(name) VALUES ('Pagantes') RETURNING id");
  tagId = result.rows[0].id;
  await db.query("INSERT INTO public.member_tag_assignments(member_id,tag_id) VALUES ($1,$2)", [student, tagId]);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM public.member_tag_assignments")).rows[0].n, 1);
  await assert.rejects(db.query("INSERT INTO public.member_tags(name) VALUES ('pagantes')"));
  await db.query("INSERT INTO public.member_tags(name) VALUES ('Acompanhamento')");
  assert.equal((await db.query("SELECT count(*)::int AS n FROM public.member_tags")).rows[0].n, 2);
});
await asUser(student, async () => {
  assert.equal((await db.query("SELECT count(*)::int AS n FROM public.member_tags")).rows[0].n, 0);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM public.member_tag_assignments")).rows[0].n, 0);
  await assert.rejects(db.query("INSERT INTO public.member_tags(name) VALUES ('Fraude')"));
  await assert.rejects(db.query("INSERT INTO public.member_tag_assignments(member_id,tag_id) VALUES ($1,$2)", [admin, tagId]));
  await db.query("DELETE FROM public.member_tag_assignments WHERE member_id=$1", [student]);
});
await asUser(admin, async () => {
  assert.equal((await db.query("SELECT count(*)::int AS n FROM public.member_tag_assignments")).rows[0].n, 1);
  await db.query("DELETE FROM public.member_tags WHERE id=$1", [tagId]);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM public.member_tag_assignments")).rows[0].n, 0);
});
const links = [{ member_id: student, tag_id: "pagantes" }];
assert.equal(matchesMemberTag(student, "pagantes", links), true);
assert.equal(matchesMemberTag(admin, "pagantes", links), false);
assert.equal(matchesMemberTag(admin, "untagged", links), true);
assert.equal(matchesMemberTag(student, "untagged", links), false);
assert.equal(matchesMemberTag(admin, "all", links), true);
await db.close();
console.log("Member tags: custom names, filtering and admin-only permissions passed.");