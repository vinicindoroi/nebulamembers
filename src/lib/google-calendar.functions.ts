import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3/calendars/primary/events";

async function gcal(method: string, path: string, body?: unknown) {
  const lovable = process.env["LOVABLE_API_KEY"];
  const key = process.env["GOOGLE_CALENDAR_API_KEY"];
  if (!lovable || !key) throw new Error("Google Agenda não configurado");
  const res = await fetch(`${GATEWAY}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${lovable}`,
      "X-Connection-Api-Key": key,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok && !(method === "DELETE" && (res.status === 404 || res.status === 410))) {
    console.error(`Google Calendar [${res.status}]: ${text}`);
    throw new Error(`Google Calendar [${res.status}]`);
  }
  return text ? JSON.parse(text) : null;
}

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
      if (b.status === "cancelled") {
        if (b.google_event_id) {
          await gcal("DELETE", `/${encodeURIComponent(b.google_event_id)}`);
          await supabaseAdmin.from("mentor_bookings").update({ google_event_id: null }).eq("id", b.id);
        }
        return { ok: true };
      }
      const [{ data: p }, { data: s }] = await Promise.all([
        supabaseAdmin.from("profiles").select("full_name,email,phone").eq("id", b.user_id).maybeSingle(),
        supabaseAdmin.from("mentor_schedule_settings").select("meeting_link,timezone").eq("id", 1).maybeSingle(),
      ]);
      const name = p?.full_name || p?.email || "Aluno";
      const event = {
        summary: `Call Nebula — ${name}${b.status === "done" ? " (realizada)" : ""}`,
        description: [
          p?.email && `E-mail: ${p.email}`,
          p?.phone && `WhatsApp: ${p.phone}`,
          b.notes && `Assunto: ${b.notes}`,
          s?.meeting_link && `Link: ${s.meeting_link}`,
        ].filter(Boolean).join("\n"),
        location: s?.meeting_link ?? undefined,
        start: { dateTime: b.starts_at, timeZone: s?.timezone ?? "America/Sao_Paulo" },
        end: { dateTime: b.ends_at, timeZone: s?.timezone ?? "America/Sao_Paulo" },
      };
      if (b.google_event_id) {
        await gcal("PATCH", `/${encodeURIComponent(b.google_event_id)}`, event);
      } else {
        const created = await gcal("POST", "", event);
        await supabaseAdmin.from("mentor_bookings").update({ google_event_id: created.id }).eq("id", b.id);
      }
      return { ok: true };
    } catch (e) {
      console.error("syncBookingToGoogle", e);
      return { ok: false };
    }
  });
