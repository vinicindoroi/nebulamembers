import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export interface FunnelListItem {
  id: string;
  name: string;
  created_at: string;
}

/** Lista os funis do workspace, criando o "Funil principal" na primeira vez. */
export const listFunnels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("funnels" as never)
      .select("id, name, created_at")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    let list = (rows ?? []) as unknown as FunnelListItem[];
    if (!list.length) {
      const { data: created, error: createError } = await context.supabase
        .from("funnels" as never)
        .insert({ workspace_id: data.workspaceId, name: "Funil principal" } as never)
        .select("id, name, created_at")
        .single();
      if (createError) throw new Error(createError.message);
      list = [created as unknown as FunnelListItem];
    }
    return list;
  });

export const createFunnel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        name: z.string().min(1).max(80),
        copyStepsFromFunnelId: z.string().uuid().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: created, error } = await context.supabase
      .from("funnels" as never)
      .insert({ workspace_id: data.workspaceId, name: data.name } as never)
      .select("id, name, created_at")
      .single();
    if (error) throw new Error(error.message);
    const funnel = created as unknown as FunnelListItem;

    let steps: { key: string; label: string; position: number }[] = [];
    if (data.copyStepsFromFunnelId) {
      const { data: src } = await context.supabase
        .from("funnel_steps" as never)
        .select("key, label, position")
        .eq("funnel_id", data.copyStepsFromFunnelId)
        .order("position", { ascending: true });
      steps = (src ?? []) as unknown as typeof steps;
    }
    if (!steps.length) {
      steps = [
        { key: "chegou", label: "Chegou", position: 1 },
        { key: "engajou", label: "Engajou", position: 2 },
        { key: "checkout", label: "Checkout", position: 3 },
        { key: "pagamento_iniciado", label: "Pagamento iniciado", position: 4 },
        { key: "pagamento_aprovado", label: "Pagamento aprovado", position: 5 },
      ];
    }
    await context.supabase.from("funnel_steps" as never).insert(
      steps.map((s, i) => ({
        workspace_id: data.workspaceId,
        funnel_id: funnel.id,
        key: s.key,
        label: s.label,
        position: i + 1,
      })) as never,
    );
    return funnel;
  });

export const renameFunnel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ funnelId: z.string().uuid(), name: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("funnels" as never)
      .update({ name: data.name } as never)
      .eq("id", data.funnelId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFunnel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ funnelId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("funnels" as never).delete().eq("id", data.funnelId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getFunnelReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        funnelId: z.string().uuid(),
        from: z.string(),
        to: z.string(),
        compareFrom: z.string().nullable().optional(),
        compareTo: z.string().nullable().optional(),
        source: z.string().max(60).nullable().optional(),
        offer: z.enum(["all", "SPY", "Outras"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { computeFunnelReport } = await import("./funnel/compute.server");
    const { data: ws } = await context.supabase
      .from("workspaces")
      .select("display_currency")
      .eq("id", data.workspaceId)
      .maybeSingle();
    return computeFunnelReport({
      supabase: context.supabase,
      workspaceId: data.workspaceId,
      funnelId: data.funnelId,
      from: data.from,
      to: data.to,
      compare: data.compareFrom && data.compareTo ? { from: data.compareFrom, to: data.compareTo } : null,
      currency: (ws as { display_currency?: string } | null)?.display_currency ?? "BRL",
      source: data.source ?? null,
      offer: data.offer ?? "all",
    });
  });

export const getFunnelSteps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ funnelId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("funnel_steps" as never)
      .select("id, key, label, position")
      .eq("funnel_id", data.funnelId)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as { id: string; key: string; label: string; position: number }[];
  });

export const saveFunnelSteps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        funnelId: z.string().uuid(),
        steps: z
          .array(
            z.object({
              key: z.string().min(1).max(60).regex(/^[a-z0-9_]+$/, "use apenas letras minúsculas, números e _"),
              label: z.string().min(1).max(60),
            }),
          )
          .min(2)
          .max(20),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const keys = data.steps.map((s) => s.key);
    if (new Set(keys).size !== keys.length) throw new Error("chaves_duplicadas");

    await context.supabase
      .from("funnel_steps" as never)
      .delete()
      .eq("funnel_id", data.funnelId)
      .not("key", "in", `(${keys.join(",")})`);

    const { error } = await context.supabase
      .from("funnel_steps" as never)
      .upsert(
        data.steps.map((s, i) => ({
          workspace_id: data.workspaceId,
          funnel_id: data.funnelId,
          key: s.key,
          label: s.label,
          position: i + 1,
        })) as never,
        { onConflict: "funnel_id,key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listRecentFunnelEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ funnelId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("funnel_events" as never)
      .select("id, session_id, step, amount, utm_content, utm_campaign, utm_source, created_at")
      .eq("funnel_id", data.funnelId)
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as {
      id: string;
      session_id: string;
      step: string;
      amount: number | null;
      utm_content: string | null;
      utm_campaign: string | null;
      utm_source: string | null;
      created_at: string;
    }[];
  });

/** Usuários ao vivo por etapa (última atividade dentro da janela). */
export const getFunnelLive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        funnelId: z.string().uuid(),
        windowMinutes: z.number().int().min(1).max(120).optional(),
        offer: z.enum(["all", "SPY", "Outras"]).optional(),
        source: z.string().max(60).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { computeFunnelLive } = await import("./funnel/live.server");
    return computeFunnelLive({
      supabase: context.supabase,
      funnelId: data.funnelId,
      windowMinutes: data.windowMinutes ?? 5,
      offer: data.offer ?? "all",
      source: data.source ?? null,
    });
  });

/** Tráfego real x robôs das plataformas de anúncio, com quebra por origem. */
export const getFunnelTrafficQuality = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        funnelId: z.string().uuid(),
        from: z.string(),
        to: z.string(),
        offer: z.enum(["all", "SPY", "Outras"]).optional(),
        source: z.string().max(60).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { computeTrafficQuality } = await import("./funnel/traffic.server");
    return computeTrafficQuality({
      supabase: context.supabase,
      funnelId: data.funnelId,
      from: data.from,
      to: data.to,
      offer: data.offer ?? "all",
      source: data.source ?? null,
    });
  });
