import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { closePastCalls } from "@/lib/mentor-auto-close";

const payloadSchema = z.object({ job: z.literal("close-past-calls") });

/**
 * Encerra as calls cujo horário já passou (status 'booked' -> 'done').
 * Disparado a cada minuto pelo agendador gerenciado; a autenticação do
 * chamada é feita por authenticateCronRequest (Bearer gerenciado).
 */
export const Route = createFileRoute("/api/public/jobs/close-past-calls")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const payload = await request.json().catch(() => null);
        if (!payloadSchema.safeParse(payload).success) {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const client = supabaseAdmin as unknown as Parameters<typeof closePastCalls>[0];
        try {
          const { closed } = await closePastCalls(client);
          // Também cria o Meet das calls futuras que ficaram sem evento no Google.
          const { syncMissingGoogleEvents } = await import("@/lib/google-calendar.server");
          const synced = await syncMissingGoogleEvents(supabaseAdmin).catch(() => 0);
          return Response.json({ closed, synced });
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : "falha ao encerrar" },
            { status: 500 },
          );
        }
      },
    },
  },
});
