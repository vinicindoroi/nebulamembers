// Isolated PostgreSQL fixture: no credentials or live project required.
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(`
create role authenticated; create role anon; create role service_role;
create schema auth; create schema storage;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth, storage to authenticated, anon;
create table public.profiles(id uuid primary key, plan text);
create table public.user_roles(user_id uuid, role text);
create table public.app_settings(key text, value jsonb);
create function public.has_role(uid uuid, wanted text) returns boolean language sql stable security definer as $$ select exists(select 1 from public.user_roles where user_id=uid and role=wanted) $$;
create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint);
create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to authenticated;
`);
const canonical = fs
  .readFileSync(
    "supabase/migrations/20260921224427_cb2f574e-d1d7-4ab0-8b2c-63786f12d89c.sql",
    "utf8",
  )
  .split("CREATE OR REPLACE FUNCTION public.plan_level")[0];
await db.exec(canonical);
await db.exec(fs.readFileSync("supabase/migrations/20261027165244_member_offers.sql", "utf8"));
const ids = {
  admin: "00000000-0000-0000-0000-000000000001",
  free: "00000000-0000-0000-0000-000000000002",
  pro: "00000000-0000-0000-0000-000000000003",
  custom: "00000000-0000-0000-0000-000000000004",
  pending: "00000000-0000-0000-0000-000000000005",
};
const offer = "10000000-0000-0000-0000-000000000001";
const draft = "10000000-0000-0000-0000-000000000002";
await db.query(`insert into public.app_settings values ('plans_config', $1)`, [
  JSON.stringify([{ slug: "mentoria", name: "Mentoria VIP", level: 5 }]),
]);
for (const [key, id] of Object.entries(ids))
  await db.query("insert into public.profiles values ($1,$2)", [
    id,
    key === "custom" ? "Mentoria VIP" : key,
  ]);
await db.query("insert into public.user_roles values ($1, 'admin')", [ids.admin]);
await db.query(
  `insert into public.member_offers(id,title,active,access_levels) values ($1,'Oferta',true,array['pro','mentoria']),($2,'Rascunho',false,array['pro'])`,
  [offer, draft],
);
for (const id of [offer, draft]) {
  await db.query(
    `insert into public.member_offer_files(offer_id,name,storage_path,size) values ($1,'kit.zip',$2,1234)`,
    [id, `${id}/kit.zip`],
  );
  await db.query(`insert into storage.objects(bucket_id,name) values ('member-offers',$1)`, [
    `${id}/kit.zip`,
  ]);
}
await db.query(`insert into storage.objects(bucket_id,name) values ('member-offers','orphan.zip')`);
let checks = 0;
async function asUser(key, fn) {
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [key ? ids[key] : ""]);
  await db.exec("set role authenticated");
  try {
    await fn();
  } finally {
    await db.exec("reset role");
  }
}
async function count(table, expected) {
  const result = await db.query(`select count(*)::int as n from ${table}`);
  assert.equal(result.rows[0].n, expected, table);
  checks++;
}
for (const key of ["free", "pending", null])
  await asUser(key, async () => {
    await count("public.member_offers", 0);
    await count("public.member_offer_files", 0);
    await count("storage.objects", 0);
  });
for (const key of ["pro", "custom"])
  await asUser(key, async () => {
    await count("public.member_offers", 1);
    await count("public.member_offer_files", 1);
    await count("storage.objects", 1);
  });
await asUser("admin", async () => {
  await count("public.member_offers", 2);
  await count("public.member_offer_files", 2);
  await count("storage.objects", 3);
});
await asUser("free", async () => {
  await assert.rejects(
    db.query(
      `insert into public.member_offers(title,access_levels) values ('hack', array['free'])`,
    ),
  );
  checks++;
  await assert.rejects(
    db.query(`insert into storage.objects(bucket_id,name) values ('member-offers','hack.zip')`),
  );
  checks++;
  const result = await db.query(
    `update public.member_offers set access_levels=array['free'] returning id`,
  );
  assert.equal(result.rows.length, 0);
  checks++;
});
await db.query("update public.member_offers set active=false where id=$1", [offer]);
await asUser("pro", async () => {
  await count("public.member_offers", 0);
  await count("storage.objects", 0);
});
await db.query(
  "update public.member_offers set active=true, access_levels=array['free'] where id=$1",
  [offer],
);
await asUser("pro", async () => {
  await count("storage.objects", 0);
});
await asUser("free", async () => {
  await count("storage.objects", 1);
});
await db.query("delete from public.member_offers where id=$1", [offer]);
await asUser("free", async () => {
  await count("public.member_offer_files", 0);
  await count("storage.objects", 0);
});
assert.equal(
  (await db.query(`select public from storage.buckets where id='member-offers'`)).rows[0].public,
  false,
);
checks++;
console.log(
  `${checks} verificações SQL passaram: planos, plano personalizado, pendente, sem sessão, admin, rascunho, acesso direto ao storage, escrita negada, revogação e exclusão.`,
);
await db.close();
