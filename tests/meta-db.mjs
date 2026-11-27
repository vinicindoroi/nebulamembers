import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE TABLE public.profiles(id uuid PRIMARY KEY);");
await db.exec(await readFile(new URL("../drizzle/migrations/0040_student_meta_connections.sql", import.meta.url), "utf8"));
const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
await db.query("INSERT INTO public.profiles(id) VALUES ($1), ($2)", [a, b]);
await db.query("INSERT INTO public.student_meta_connections(user_id,token_ciphertext,facebook_name,expires_at) VALUES ($1,'opaque-a','Aluno A',now()+interval '1 day'),($2,'opaque-b','Aluno B',now()+interval '1 day')", [a, b]);

// Alunos e acesso público não podem sequer ler tokens, estados ou cache de outro aluno.
for (const role of ["anon", "authenticated"]) {
  await db.exec(`SET ROLE ${role}`);
  for (const table of ["student_meta_connections", "student_meta_oauth_states", "student_meta_reports"]) {
    await assert.rejects(() => db.query(`SELECT * FROM public.${table}`), /permission denied/);
  }
  await db.exec("RESET ROLE");
}

// A consulta usada na conclusão é atômica, self-scoped e de uso único.
await db.query("INSERT INTO public.student_meta_oauth_states(state_hash,user_id,redirect_uri,expires_at) VALUES ('state-a',$1,'https://example.test/api/public/meta/callback',now()+interval '10 minutes')", [a]);
const consume = (user) => db.query("DELETE FROM public.student_meta_oauth_states WHERE state_hash=$1 AND user_id=$2 AND expires_at > now() RETURNING user_id", ["state-a", user]);
assert.equal((await consume(b)).rows.length, 0);
assert.equal((await consume(a)).rows.length, 1);
assert.equal((await consume(a)).rows.length, 0);
await db.close();
console.log("meta-db: autorizações inacessíveis no navegador e estados de uso único OK");