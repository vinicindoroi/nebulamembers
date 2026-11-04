import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listMonitoredSites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: sites, error } = await supabase
      .from("monitored_sites" as never)
      .select("*")
      .eq("workspace_id", data.workspaceId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (sites ?? []) as any[];
  });

async function probe(url: string) {
  const started = Date.now();
  let status: number | null = null;
  let ok = false;
  let errMsg: string | null = null;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "Nebula-Uptime/1.0" },
    });
    clearTimeout(timeout);
    status = res.status;
    ok = res.status >= 200 && res.status < 400;
  } catch (e: any) {
    errMsg = String(e?.message ?? e).slice(0, 300);
  }
  // Fallback: se HTTPS falhar (ex.: certificado que não cobre o domínio),
  // tenta HTTP — se o servidor responde, o domínio está no ar.
  if (!ok && status === null && /^https:\/\//i.test(url)) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(url.replace(/^https:\/\//i, "http://"), {
        method: "GET",
        redirect: "manual",
        signal: ctrl.signal,
        headers: { "user-agent": "Nebula-Uptime/1.0" },
      });
      clearTimeout(timeout);
      if (res.status < 500) {
        ok = res.status >= 200 && res.status < 400;
        status = res.status;
        errMsg = res.status >= 400 ? `HTTP ${res.status} (fallback, SSL inválido)` : "SSL inválido (monitorado via HTTP)";
      }
    } catch {
      /* mantém o erro original */
    }
  }
  return { ok, status, ms: Date.now() - started, errMsg };
}

export const INTERVAL_OPTIONS = [60, 300, 900, 1800, 3600, 86400, 172800] as const;

export const addMonitoredSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ workspaceId: z.string().uuid(), url: z.string().min(4), label: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let url = data.url.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    const { data: inserted, error } = await supabase
      .from("monitored_sites" as never)
      .insert({ workspace_id: data.workspaceId, url, label: data.label?.trim() || null } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Primeira verificação imediata
    const site = inserted as unknown as { id: string };
    const r = await probe(url);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("uptime_checks" as never).insert({
      site_id: site.id,
      workspace_id: data.workspaceId,
      status_code: r.status,
      response_ms: r.ms,
      ok: r.ok,
      error: r.errMsg,
    } as never);
    await supabaseAdmin
      .from("monitored_sites" as never)
      .update({ last_checked_at: new Date().toISOString(), last_ok: r.ok } as never)
      .eq("id", site.id);

    return { ok: true };
  });

export const updateMonitoredSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        siteId: z.string().uuid(),
        url: z.string().min(4),
        label: z.string().optional(),
        check_interval_seconds: z.number().int().refine((v) => (INTERVAL_OPTIONS as readonly number[]).includes(v)),
        notify_email: z.boolean(),
        notify_push: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let url = data.url.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    const { error } = await supabase
      .from("monitored_sites" as never)
      .update({
        url,
        label: data.label?.trim() || null,
        check_interval_seconds: data.check_interval_seconds,
        notify_email: data.notify_email,
        notify_push: data.notify_push,
      } as never)
      .eq("id", data.siteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const checkSiteNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ siteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: site, error } = await supabase
      .from("monitored_sites" as never)
      .select("id, workspace_id, url")
      .eq("id", data.siteId)
      .single();
    if (error || !site) throw new Error(error?.message ?? "Site não encontrado");
    const s = site as unknown as { id: string; workspace_id: string; url: string };
    const r = await probe(s.url);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("uptime_checks" as never).insert({
      site_id: s.id,
      workspace_id: s.workspace_id,
      status_code: r.status,
      response_ms: r.ms,
      ok: r.ok,
      error: r.errMsg,
    } as never);
    await supabaseAdmin
      .from("monitored_sites" as never)
      .update({ last_checked_at: new Date().toISOString(), last_ok: r.ok } as never)
      .eq("id", s.id);
    return { ok: r.ok };
  });

export const removeMonitoredSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ siteId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("monitored_sites" as never).delete().eq("id", data.siteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleMonitoredSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ siteId: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("monitored_sites" as never)
      .update({ active: data.active } as never)
      .eq("id", data.siteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getUptimeStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ workspaceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const { data: checks, error } = await supabase
      .from("uptime_checks" as never)
      .select("site_id, ok, response_ms, status_code, error, checked_at")
      .eq("workspace_id", data.workspaceId)
      .gte("checked_at", since7d)
      .order("checked_at", { ascending: false });
    if (error) throw new Error(error.message);

    const rows = (checks ?? []) as any[];
    const bySite: Record<string, any> = {};
    for (const c of rows) {
      const s = (bySite[c.site_id] ??= {
        last: null as any,
        total7d: 0, ok7d: 0,
        total24h: 0, ok24h: 0,
        sumMs24h: 0,
        recent: [] as any[],
      });
      if (!s.last) s.last = c;
      s.total7d++; if (c.ok) s.ok7d++;
      if (c.checked_at >= since24h) {
        s.total24h++; if (c.ok) s.ok24h++;
        if (c.response_ms != null) s.sumMs24h += c.response_ms;
      }
      if (s.recent.length < 48) s.recent.push({ ok: c.ok, at: c.checked_at });
    }
    for (const id of Object.keys(bySite)) {
      const s = bySite[id];
      s.uptime24h = s.total24h ? Math.round((s.ok24h / s.total24h) * 10000) / 100 : null;
      s.uptime7d = s.total7d ? Math.round((s.ok7d / s.total7d) * 10000) / 100 : null;
      s.avgMs24h = s.ok24h ? Math.round(s.sumMs24h / s.ok24h) : null;
      s.recent.reverse();
    }
    return bySite;
  });
