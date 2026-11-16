// Sincronização das calls com o Google Agenda do mentor (somente servidor).
type Admin = any; // eslint-disable-line @typescript-eslint/no-explicit-any

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

type Booking = {
  id: string; user_id: string; status: string; starts_at: string; ends_at: string;
  notes: string | null; google_event_id: string | null;
};

/** Cria, atualiza ou remove o evento da call no Google Agenda e guarda o link do Meet. */
export async function syncBooking(admin: Admin, b: Booking): Promise<void> {
  if (b.status === "cancelled") {
    if (b.google_event_id) {
      await gcal("DELETE", `/${encodeURIComponent(b.google_event_id)}`);
      await admin.from("mentor_bookings").update({ google_event_id: null }).eq("id", b.id);
    }
    return;
  }
  const [{ data: p }, { data: s }, { data: link }] = await Promise.all([
    admin.from("profiles").select("full_name,email,phone").eq("id", b.user_id).maybeSingle(),
    admin.from("mentor_schedule_settings").select("timezone").eq("id", 1).maybeSingle(),
    admin.from("mentor_booking_links").select("url").eq("booking_id", b.id).maybeSingle(),
  ]);
  const name = p?.full_name || p?.email || "Aluno";
  const needsMeet = !link?.url;
  const tz = s?.timezone ?? "America/Sao_Paulo";
  const event: Record<string, unknown> = {
    summary: `Call Nebula — ${name}${b.status === "done" ? " (realizada)" : ""}`,
    description: [
      p?.email && `E-mail: ${p.email}`,
      p?.phone && `WhatsApp: ${p.phone}`,
      b.notes && `Assunto: ${b.notes}`,
    ].filter(Boolean).join("\n"),
    start: { dateTime: b.starts_at, timeZone: tz },
    end: { dateTime: b.ends_at, timeZone: tz },
    ...(p?.email ? { attendees: [{ email: p.email }] } : {}),
  };
  if (needsMeet) {
    event.conferenceData = {
      createRequest: { requestId: `nebula-${b.id}-${Date.now()}`, conferenceSolutionKey: { type: "hangoutsMeet" } },
    };
  }
  const qs = "?conferenceDataVersion=1&sendUpdates=all";
  if (b.google_event_id) {
    const ev = await gcal("PATCH", `/${encodeURIComponent(b.google_event_id)}${qs}`, event);
    await saveMeet(admin, b.id, ev, needsMeet);
    return;
  }
  const ev = await gcal("POST", qs, event);
  // Só grava se ninguém criou o evento ao mesmo tempo; senão apaga o duplicado.
  const { data: claimed } = await admin
    .from("mentor_bookings").update({ google_event_id: ev.id })
    .eq("id", b.id).is("google_event_id", null).select("id");
  if (!claimed?.length) {
    await gcal("DELETE", `/${encodeURIComponent(ev.id)}?sendUpdates=none`).catch(() => {});
    return;
  }
  await saveMeet(admin, b.id, ev, needsMeet);
}

async function saveMeet(admin: Admin, bookingId: string, ev: any, needsMeet: boolean) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const meet: string | undefined = ev?.hangoutLink
    ?? ev?.conferenceData?.entryPoints?.find((x: { entryPointType?: string; uri?: string }) => x.entryPointType === "video")?.uri;
  if (needsMeet && meet) {
    await admin.from("mentor_booking_links").upsert({ booking_id: bookingId, url: meet, updated_at: new Date().toISOString() });
  }
}

/**
 * Rede de segurança: cria o evento/Meet das calls futuras que ficaram sem evento
 * (ex.: o aluno fechou a página logo depois de marcar). Ignora as criadas há
 * menos de 1 minuto para não disputar com a sincronização feita pela tela.
 */
export async function syncMissingGoogleEvents(admin: Admin, limit = 5): Promise<number> {
  const now = Date.now();
  const { data } = await admin
    .from("mentor_bookings")
    .select("id,user_id,status,starts_at,ends_at,notes,google_event_id")
    .eq("status", "booked")
    .is("google_event_id", null)
    .gt("ends_at", new Date(now).toISOString())
    .lt("created_at", new Date(now - 60_000).toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit);
  let n = 0;
  for (const b of (data ?? []) as Booking[]) {
    try { await syncBooking(admin, b); n++; } catch (e) { console.error("syncMissingGoogleEvents", b.id, e); }
  }
  return n;
}
