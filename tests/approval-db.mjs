import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isPendingPlan } from "../src/lib/approval.ts";

const sql = readFileSync(new URL("../supabase/migrations/20261112020000_member_approval_gate.sql", import.meta.url), "utf8");

let passed = 0;
const ok = (label, fn) => {
  fn();
  passed++;
};

// The SQL predicate must reject exactly the plans the app treats as pending.
const PENDING = ["", "pending", "pendente", "Pendente", "  pending  "];
for (const plan of PENDING) assert.equal(isPendingPlan(plan), true, `${JSON.stringify(plan)} should be pending in the app`);
for (const plan of ["Free", "Pro", "Individual", "Nebula Members"]) assert.equal(isPendingPlan(plan), false);

ok("sql rejects the same pending plans as the app", () => {
  const list = sql.match(/plan_slug\(p\.plan\) NOT IN \(([^)]*)\)/);
  assert.ok(list, "approval predicate missing");
  const rejected = list[1].split(",").map((s) => s.trim().replace(/^'|'$/g, ""));
  assert.deepEqual(rejected.slice().sort(), ["", "pendente", "pending"]);
});

ok("predicate is security definer and granted to both api roles", () => {
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.is_member_approved\(_user_id uuid DEFAULT auth\.uid\(\)\)/);
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.is_member_approved\(uuid\) TO anon, authenticated;/);
});

// Every table that used to be readable by any signed-in account must now be gated.
const GATED_READ = [
  "app_settings", "categories", "courses", "modules", "comments", "community_stories",
  "forum_posts", "forum_replies", "forum_likes", "forum_tags", "forum_post_tags",
  "posts", "post_likes", "notifications", "mentor_blocked_slots", "mentor_extra_slots",
];
const GATED_WRITE = [
  "comments", "community_stories", "forum_posts", "forum_replies", "forum_likes",
  "forum_post_tags", "posts", "post_likes", "lesson_progress", "lesson_bookmarks",
  "lesson_video_progress", "lesson_questions",
];

for (const table of GATED_READ) {
  ok(`${table} read requires approval`, () => {
    const block = sql.match(new RegExp(`CREATE POLICY[^;]*ON public\\.${table}\\b[^;]*FOR SELECT[^;]*;`, "i"));
    assert.ok(block, `no SELECT policy for ${table}`);
    assert.match(block[0], /USING \(\(SELECT public\.is_member_approved\(\)\)\)/);
  });
}

for (const table of GATED_WRITE) {
  ok(`${table} write requires approval`, () => {
    const block = sql.match(new RegExp(`CREATE POLICY[^;]*ON public\\.${table}\\b[^;]*FOR INSERT[^;]*;`, "i"));
    assert.ok(block, `no INSERT policy for ${table}`);
    assert.match(block[0], /WITH CHECK \(\(SELECT public\.is_member_approved\(\)\)\)/);
  });
}

ok("views are gated too (they bypass base-table RLS)", () => {
  for (const view of ["lesson_content", "lessons_public", "public_profiles"]) {
    const block = sql.match(new RegExp(`CREATE OR REPLACE VIEW public\\.${view}\\b[^;]*;`, "i"));
    assert.ok(block, `view ${view} not rewritten`);
    assert.match(block[0], /WHERE \(SELECT public\.is_member_approved\(\)\)/);
  }
});

ok("no gated policy keeps an open USING (true)", () => {
  const open = [...sql.matchAll(/CREATE POLICY[^;]*?USING \(true\)[^;]*;/gis)].map((m) => m[0]);
  assert.equal(open.length, 0, `open policies: ${open.length}`);
});

ok("extra slots are admin-created only", () => {
  const block = sql.match(/CREATE POLICY "admin insert extra slots"[^;]*;/i);
  assert.ok(block);
  assert.match(block[0], /WITH CHECK \(public\.has_role\(auth\.uid\(\), 'admin'\)\)/);
});

console.log(`approval-db: ${passed} checks passed`);
