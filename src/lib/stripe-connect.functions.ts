import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { bestDay, dailySeries, isRestrictedStripeKey, keyLast4, recentSales, SALES_PERIODS, summarizeSales, validateRange } from "@/lib/stripe-sales";

const TABLE = "student_stripe_connections" as never;

async function assertApproved(supabase: any) {
  const { data, error } = await supabase.rpc("is_member_approved");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Seu cadastro ainda não foi aprovado.");
}

export const getStripeConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertApproved(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("key_last4, account_name, livemode, connected_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error((error as any).message);
    return (data as { key_last4: string; account_name: string | null; livemode: boolean; connected_at: string } | null) ?? null;
  });

export const connectStripe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ key: z.string().trim().min(10).max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertApproved(context.supabase);
    const key = data.key.trim();
    if (!isRestrictedStripeKey(key)) {
      throw new Error("Use uma chave restrita da Stripe (começa com rk_live_ ou rk_test_).");
    }
    const { stripeGet, StripeError } = await import("./stripe-api.server");
    try {
      await stripeGet(key, "/charges", [["limit", "1"]]);
    } catch (e) {
      if (e instanceof StripeError && e.status === 401) throw new Error("A Stripe recusou essa chave. Confira se copiou ela inteira.");
      if (e instanceof StripeError && e.status === 403) throw new Error("A chave não tem permissão de leitura em Charges. Ative “Leitura” e tente de novo.");
      throw new Error("Não foi possível falar com a Stripe agora. Tente de novo em instantes.");
    }
    let accountName: string | null = null;
    try {
      const acct = await stripeGet(key, "/account");
      accountName = acct?.settings?.dashboard?.display_name || acct?.business_profile?.name || acct?.email || null;
    } catch { /* restricted keys may not read the account */ }

    const { encryptStripeKey } = await import("./stripe-crypto.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from(TABLE).upsert(
      {
        user_id: context.userId,
        key_ciphertext: await encryptStripeKey(key),
        key_last4: keyLast4(key),
        account_name: accountName,
        livemode: key.startsWith("rk_live_"),
        connected_at: now,
        updated_at: now,
      } as never,
      { onConflict: "user_id" },
    );
    if (error) throw new Error((error as any).message);
    return { ok: true, accountName };
  });

export const disconnectStripe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from(TABLE).delete().eq("user_id", context.userId);
    if (error) throw new Error((error as any).message);
    return { ok: true };
  });

export const getStripeSales = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ days: z.number().int().refine((n) => (SALES_PERIODS as readonly number[]).includes(n)) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertApproved(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from(TABLE)
      .select("key_ciphertext, account_name, livemode")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error((error as any).message);
    if (!row) return { connected: false as const };
    const r = row as { key_ciphertext: string; account_name: string | null; livemode: boolean };

    const { decryptStripeKey } = await import("./stripe-crypto.server");
    const { fetchSales, StripeError } = await import("./stripe-api.server");
    const key = await decryptStripeKey(r.key_ciphertext);
    const since = Math.floor(Date.now() / 1000) - data.days * 86400;
    try {
      const { sales, truncated, checkoutRead } = await fetchSales(key, since);
      return {
        connected: true as const,
        accountName: r.account_name,
        livemode: r.livemode,
        truncated,
        checkoutRead,
        summary: summarizeSales(sales),
      };
    } catch (e) {
      if (e instanceof StripeError && (e.status === 401 || e.status === 403)) {
        return { connected: true as const, invalidKey: true as const, accountName: r.account_name, livemode: r.livemode };
      }
      throw new Error("Não foi possível buscar suas vendas na Stripe agora.");
    }
  });

/** Sales history for a custom range: totals, top countries/campaigns, daily series and latest sales. */
export const getStripeSalesHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        from: z.number().int().min(0),
        to: z.number().int().min(0),
        offset: z.number().int().min(-840).max(840),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertApproved(context.supabase);
    const now = Math.floor(Date.now() / 1000);
    const to = Math.min(data.to, now);
    const invalid = validateRange(data.from, to, now);
    if (invalid) throw new Error(invalid);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from(TABLE)
      .select("key_ciphertext, livemode")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error((error as any).message);
    if (!row) return { connected: false as const };
    const r = row as { key_ciphertext: string; livemode: boolean };

    const { decryptStripeKey } = await import("./stripe-crypto.server");
    const { fetchSales, StripeError } = await import("./stripe-api.server");
    const key = await decryptStripeKey(r.key_ciphertext);
    try {
      const { sales, truncated } = await fetchSales(key, data.from, to);
      const summary = summarizeSales(sales);
      const series = dailySeries(sales, summary.currency, data.from, to, data.offset);
      return {
        connected: true as const,
        livemode: r.livemode,
        truncated,
        summary,
        series,
        bestDay: bestDay(series),
        recent: recentSales(sales.filter((s) => s.currency === summary.currency), 8),
      };
    } catch (e) {
      if (e instanceof StripeError && (e.status === 401 || e.status === 403)) return { connected: true as const, invalidKey: true as const };
      throw new Error("Não foi possível buscar seu histórico na Stripe agora.");
    }
  });
