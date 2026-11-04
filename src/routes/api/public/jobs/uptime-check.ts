import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/uptime-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: sites, error } = await supabaseAdmin
          .from("monitored_sites" as never)
          .select("id, workspace_id, url, label, check_interval_seconds, notify_push, notify_email, last_checked_at, last_ok")
          .eq("active", true);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        type Site = {
          id: string; workspace_id: string; url: string; label: string | null;
          check_interval_seconds: number; notify_push: boolean; notify_email: boolean;
          last_checked_at: string | null; last_ok: boolean | null;
        };
        const now = Date.now();
        const list = ((sites ?? []) as unknown as Site[]).filter((s) => {
          const interval = (s.check_interval_seconds ?? 300) * 1000;
          if (!s.last_checked_at) return true;
          return now - new Date(s.last_checked_at).getTime() >= interval - 5000;
        });
        const results: { id: string; ok: boolean; status: number | null; ms: number }[] = [];

        await Promise.all(
          list.map(async (site) => {
            const started = Date.now();
            let status: number | null = null;
            let ok = false;
            let errMsg: string | null = null;
            try {
              const ctrl = new AbortController();
              const timeout = setTimeout(() => ctrl.abort(), 15000);
              const res = await fetch(site.url, {
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
            // Fallback: se HTTPS falhar (ex.: certificado que não cobre o domínio), tenta HTTP.
            if (!ok && status === null && /^https:\/\//i.test(site.url)) {
              try {
                const ctrl = new AbortController();
                const timeout = setTimeout(() => ctrl.abort(), 15000);
                const res = await fetch(site.url.replace(/^https:\/\//i, "http://"), {
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
            const ms = Date.now() - started;
            results.push({ id: site.id, ok, status, ms });
            await supabaseAdmin.from("uptime_checks" as never).insert({
              site_id: site.id,
              workspace_id: site.workspace_id,
              status_code: status,
              response_ms: ms,
              ok,
              error: errMsg,
            } as never);
            await supabaseAdmin
              .from("monitored_sites" as never)
              .update({ last_checked_at: new Date().toISOString(), last_ok: ok } as never)
              .eq("id", site.id);

          }),
        );

        // Mantém só 7 dias de histórico
        await supabaseAdmin
          .from("uptime_checks" as never)
          .delete()
          .lt("checked_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString());

        return Response.json({ ok: true, checked: results.length, results });
      },
    },
  },
});
