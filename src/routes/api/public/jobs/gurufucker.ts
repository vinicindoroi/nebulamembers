import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { nextDelaySec } from "@/lib/gurufucker/core";

type JobRow = {
  user_id: string;
  remaining: number;
  interval_sec: number;
  random_enabled: boolean;
  random_min_sec: number;
  random_max_sec: number;
  next_run_at: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Disparos automáticos do Gurufucker. Chamado a cada minuto pelo agendador;
 * dentro da chamada continua disparando por ~50s enquanto houver disparos ativos.
 */
export const Route = createFileRoute("/api/public/jobs/gurufucker")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { fireBuyer } = await import("@/lib/gurufucker/send.server");
        const db = supabaseAdmin as any;
        const started = Date.now();
        const BUDGET = 50_000;
        let processed = 0;

        while (Date.now() - started < BUDGET) {
          const { data: active, error } = await db
            .from("gurufucker_jobs")
            .select("user_id, remaining, interval_sec, random_enabled, random_min_sec, random_max_sec, next_run_at")
            .eq("active", true)
            .order("next_run_at", { ascending: true })
            .limit(50);
          if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
          const jobs = (active ?? []) as JobRow[];
          if (jobs.length === 0) break;

          const now = Date.now();
          const due = jobs.filter((j) => new Date(j.next_run_at).getTime() <= now);
          if (due.length === 0) {
            const wait = new Date(jobs[0].next_run_at).getTime() - now;
            if (Date.now() - started + wait > BUDGET) break;
            await sleep(Math.min(Math.max(wait, 250), 2000));
            continue;
          }

          await Promise.all(
            due.map(async (job) => {
              // Reserva o disparo para evitar envio duplicado entre chamadas sobrepostas.
              const next = new Date(Date.now() + nextDelaySec(job) * 1000).toISOString();
              const { data: claimed } = await db
                .from("gurufucker_jobs")
                .update({ next_run_at: next })
                .eq("user_id", job.user_id)
                .eq("active", true)
                .eq("next_run_at", job.next_run_at)
                .select("user_id");
              if (!claimed || claimed.length === 0) return;

              const { data: cfg } = await db
                .from("gurufucker_configs")
                .select("user_id, api_token, settings, funnel")
                .eq("user_id", job.user_id)
                .maybeSingle();
              if (!cfg) {
                await db.from("gurufucker_jobs").update({ active: false, last_status: "sem configuração" }).eq("user_id", job.user_id);
                return;
              }
              const r = await fireBuyer(db, cfg, "auto");
              const badToken = !r.ok && /token/i.test(r.error ?? "");
              const remaining = badToken ? 0 : Math.max(0, job.remaining - 1);
              await db
                .from("gurufucker_jobs")
                .update({
                  remaining,
                  active: remaining > 0,
                  last_run_at: new Date().toISOString(),
                  last_status: r.ok ? `ok (${r.sent} produto${r.sent === 1 ? "" : "s"})` : `falha: ${r.error ?? "erro"}`.slice(0, 300),
                })
                .eq("user_id", job.user_id)
                .eq("active", true);
              processed++;
            }),
          );
        }

        return Response.json({ ok: true, processed });
      },
    },
  },
});
