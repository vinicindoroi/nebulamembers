import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

const payloadSchema = z.object({ job: z.literal("close-past-calls") });

/**
 * Encerra calls cujo horário já passou: status 'booked' -> 'done'.
 * Chamado a cada minuto pelo agendador gerenciado; autenticado por
 * authenticateCronRequest (Bearer do segredo gerenciado).
 */
export const Route = createFileRoute("/api/public/jobs/close-past-calls")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const payload = await request.json().catch(() => null);
        const parsed = payloadSchema.safeParse(payload);
        if (!parsed.success) {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("mentor_bookings")
          .update({ status: "done" })
          .eq("status", "booked")
          .lte("ends_at", new Date().toISOString())
          .select("id");

        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }

        return Response.json({ closed: data?.length ?? 0 });
      },
    },
  },
});
