import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Sincroniza uma call com o Google Agenda do mentor (cria, atualiza ou remove o evento). */
export const syncBookingToGoogle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookingId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(input?.bookingId ?? "")) throw new Error("invalid id");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: b } = await supabaseAdmin.from("mentor_bookings").select("*").eq("id", data.bookingId).maybeSingle();
    if (!b) return { ok: false };
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (b.user_id !== userId && !isAdmin) throw new Error("Forbidden");

    try {
      const { syncBooking } = await import("./google-calendar.server");
      await syncBooking(supabaseAdmin, b);
      return { ok: true };
    } catch (e) {
      console.error("syncBookingToGoogle", e);
      return { ok: false };
    }
  });
