import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { decryptMetaToken } from "./crypto.server";

export async function approvedMetaUser(client: SupabaseClient<Database>) {
  const { data, error } = await client.rpc("is_member_approved");
  if (error || !data) throw new Error("Seu acesso à plataforma precisa estar aprovado.");
}
export async function metaStore() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
export async function metaConnection(userId: string) {
  const db = await metaStore();
  const { data, error } = await db.from("student_meta_connections").select("token_ciphertext,facebook_name,expires_at,connected_at").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("Não foi possível consultar sua conexão Facebook.");
  return data;
}
export async function metaToken(userId: string) {
  const row = await metaConnection(userId);
  if (!row || Date.parse(row.expires_at) <= Date.now()) return null;
  return decryptMetaToken(row.token_ciphertext, userId);
}
export async function cachedMeta(userId: string, cacheKey: string) {
  const db = await metaStore();
  const { data, error } = await db.from("student_meta_reports").select("report").eq("user_id", userId).eq("cache_key", cacheKey).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error) throw new Error("Não foi possível carregar os relatórios guardados.");
  return data?.report ?? null;
}
export async function saveMetaCache(userId: string, cacheKey: string, report: Json, retryAt: string | null = null) {
  const db = await metaStore();
  const { error } = await db.from("student_meta_reports").upsert({ user_id: userId, cache_key: cacheKey, report, expires_at: new Date(Math.max(Date.now() + 15 * 60_000, retryAt ? Date.parse(retryAt) : 0)).toISOString() });
  if (error) throw new Error("Não foi possível guardar o relatório da Meta.");
}