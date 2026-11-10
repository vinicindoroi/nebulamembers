import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { CURRENCY_CODES } from "@/lib/gurufucker/core";

const T = (t: string) => t as never;

export const getGuruState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const [cfg, job, logs] = await Promise.all([
      supabase.from(T("gurufucker_configs")).select("api_token, settings, funnel").eq("user_id", userId).maybeSingle(),
      supabase.from(T("gurufucker_jobs")).select("active, total, remaining, interval_sec, random_enabled, random_min_sec, random_max_sec, next_run_at, last_run_at, last_status").eq("user_id", userId).maybeSingle(),
      supabase.from(T("gurufucker_logs")).select("id, fired_at, ok, status_code, order_id, buyer_id, step_index, product_name, amount_cents, currency, source, error").eq("user_id", userId).order("fired_at", { ascending: false }).limit(60),
    ]);
    if (cfg.error) throw new Error(cfg.error.message);
    if (job.error) throw new Error(job.error.message);
    if (logs.error) throw new Error(logs.error.message);
    return {
      config: (cfg.data as any) ?? null,
      job: (job.data as any) ?? null,
      logs: ((logs.data as any[]) ?? []) as Array<{
        id: string; fired_at: string; ok: boolean; status_code: number | null; order_id: string | null;
        buyer_id: string | null; step_index: number; product_name: string | null; amount_cents: number;
        currency: string; source: string; error: string | null;
      }>,
    };
  });

const stepSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().max(120),
  priceCents: z.number().int().min(0).max(100_000_000),
  conv: z.number().min(0).max(100),
});

const settingsSchema = z.object({
  platform: z.string().max(60),
  paymentMethod: z.enum(["pix", "credit_card", "boleto"]),
  currency: z.enum(CURRENCY_CODES as [string, ...string[]]),
  isTest: z.boolean(),
  randomCustomer: z.boolean(),
  customerName: z.string().max(120),
  customerEmail: z.string().max(200),
  stepDelaySec: z.number().int().min(0).max(30),
  utm_source: z.string().max(300),
  utm_campaign: z.string().max(300),
  utm_medium: z.string().max(300),
  utm_content: z.string().max(300),
  utm_term: z.string().max(300),
});

export const saveGuruConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ apiToken: z.string().max(300), settings: settingsSchema, funnel: z.array(stepSchema).max(20) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from(T("gurufucker_configs")).upsert(
      {
        user_id: userId,
        api_token: data.apiToken.trim(),
        settings: data.settings,
        funnel: data.funnel,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const fireGuruNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: cfg, error } = await supabase
      .from(T("gurufucker_configs"))
      .select("user_id, api_token, settings, funnel")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!cfg) throw new Error("Salve a configuração antes de disparar.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { fireBuyer } = await import("@/lib/gurufucker/send.server");
    return fireBuyer(supabaseAdmin as never, cfg as never, "manual");
  });

export const startGuruJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        quantity: z.number().int().min(1).max(5000),
        intervalSec: z.number().int().min(1).max(86400),
        randomEnabled: z.boolean(),
        randomMinSec: z.number().int().min(1).max(86400),
        randomMaxSec: z.number().int().min(1).max(86400),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: cfg } = await supabase.from(T("gurufucker_configs")).select("api_token, funnel").eq("user_id", userId).maybeSingle();
    const c = cfg as { api_token?: string; funnel?: Array<{ priceCents?: number }> } | null;
    if (!c?.api_token) throw new Error("Configure o token da Utmify.");
    if (!Array.isArray(c.funnel) || !c.funnel.some((s) => (s.priceCents ?? 0) > 0)) throw new Error("Adicione ao menos um produto com valor.");
    const { error } = await supabase.from(T("gurufucker_jobs")).upsert(
      {
        user_id: userId,
        active: true,
        total: data.quantity,
        remaining: data.quantity,
        interval_sec: data.intervalSec,
        random_enabled: data.randomEnabled,
        random_min_sec: data.randomMinSec,
        random_max_sec: data.randomMaxSec,
        next_run_at: new Date().toISOString(),
        last_status: null,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const stopGuruJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from(T("gurufucker_jobs")).update({ active: false } as never).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearGuruLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from(T("gurufucker_logs")).delete().eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
