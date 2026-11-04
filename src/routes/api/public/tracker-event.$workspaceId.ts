import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function pick(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, 300);
    if (typeof v === "number") return String(v);
  }
  return null;
}

export const Route = createFileRoute("/api/public/tracker-event/$workspaceId")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ params, request }) => {
        // Permite instrumentar também via GET (pixel/redirect simples)
        return handle(params.workspaceId, Object.fromEntries(new URL(request.url).searchParams), request);
      },
      POST: async ({ params, request }) => {
        const url = new URL(request.url);
        let body: Record<string, unknown> = {};
        try {
          const text = await request.text();
          if (text) body = JSON.parse(text) as Record<string, unknown>;
        } catch {
          body = {};
        }
        const merged = { ...Object.fromEntries(url.searchParams), ...body };
        return handle(params.workspaceId, merged, request);
      },
    },
  },
});

async function handle(workspaceId: string, payload: Record<string, unknown>, request: Request) {
  if (!/^[0-9a-f-]{36}$/i.test(workspaceId)) return json({ error: "invalid_workspace" }, 400);

  // Crawlers/pré-carregadores (Meta, Google, TikTok...) são gravados, mas marcados como bot.
  // O script também envia bot=1 quando detecta sinais de automatizado no navegador
  // (webdriver/headless) — o pré-carregador do Meta usa UA real, então o UA sozinho não basta.
  const { isBotUserAgent } = await import("@/lib/funnel-tracker/bot-detect");
  const clientBot = payload.bot === 1 || payload.bot === "1" || payload.bot === true || payload.bot === "true";
  const isBot = clientBot || isBotUserAgent(request.headers.get("user-agent"));

  const step = pick(payload, ["step", "etapa", "event"]);
  const sessionId = pick(payload, ["sessionId", "session_id", "session", "src", "click_id", "clickId"]);
  if (!step) return json({ error: "missing_step" }, 400);
  if (!sessionId) return json({ error: "missing_session" }, 400);

  const amountRaw = pick(payload, ["amount", "valor", "value"]);
  const amount = amountRaw ? Number(String(amountRaw).replace(",", ".")) : null;
  const tsRaw = pick(payload, ["ts", "timestamp", "created_at"]);
  let createdAt = new Date().toISOString();
  if (tsRaw) {
    const d = new Date(/^\d+$/.test(tsRaw) ? Number(tsRaw) : tsRaw);
    if (!Number.isNaN(d.getTime())) createdAt = d.toISOString();
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { resolveFunnelId } = await import("@/lib/funnel-tracker/resolve.server");

  const { data: ws } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", workspaceId)
    .maybeSingle();
  if (!ws) return json({ error: "workspace_not_found" }, 404);

  const funnelId = await resolveFunnelId(
    supabaseAdmin,
    workspaceId,
    pick(payload, ["funnel_id", "funnelId", "funnel", "f"]),
  );
  if (!funnelId) return json({ error: "funnel_not_found" }, 404);

  const row = {
    workspace_id: workspaceId,
    funnel_id: funnelId,
    session_id: sessionId,
    step,
    amount: amount !== null && Number.isFinite(amount) ? amount : null,
    currency: pick(payload, ["currency", "moeda"]),
    transaction_id: pick(payload, ["transaction_id", "transactionId", "txid"]),
    click_id: pick(payload, ["click_id", "clickId", "src"]),
    utm_source: pick(payload, ["utm_source", "utmSource"]),
    utm_medium: pick(payload, ["utm_medium", "utmMedium"]),
    utm_campaign: pick(payload, ["utm_campaign", "utmCampaign"]),
    utm_content: pick(payload, ["utm_content", "utmContent"]),
    utm_term: pick(payload, ["utm_term", "utmTerm"]),
    referrer: pick(payload, ["referrer", "referer"]),
    user_agent: request.headers.get("user-agent"),
    ip: request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for"),
    is_bot: isBot,
    metadata: payload,
    created_at: createdAt,
  };

  const { error } = await supabaseAdmin
    .from("tracker_funnel_events" as never)
    .upsert(row as never, { onConflict: "funnel_id,session_id,step", ignoreDuplicates: true });

  if (error) return json({ error: error.message }, 500);

  // O primeiro evento da sessão pode ter chegado sem UTMs (ex.: o script leu a
  // URL antes do redirect com os parâmetros). Como o upsert ignora duplicados,
  // preenche aqui os campos de atribuição que ainda estão vazios no registro.
  const patchKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "click_id", "referrer"] as const;
  await Promise.all(
    patchKeys
      .filter((k) => typeof row[k] === "string" && (row[k] as string).length > 0)
      .map((k) =>
        supabaseAdmin
          .from("tracker_funnel_events" as never)
          .update({ [k]: row[k] } as never)
          .eq("funnel_id", funnelId)
          .eq("session_id", sessionId)
          .eq("step", step)
          .is(k, null),
      )
      .map((q) => Promise.resolve(q).catch(() => null)),
  );
  return json({ ok: true, step, session_id: sessionId, funnel_id: funnelId });
}
