import {
  buildOrderBody,
  normalizeFunnel,
  normalizeSettings,
  randomCustomer,
  simulateBuyer,
  type FunnelStep,
  type GuruSettings,
} from "./core";

const UTMIFY_URL = "https://api.utmify.com.br/api-credentials/orders";

type AdminClient = {
  from: (t: string) => any;
};

export type GuruConfigRow = { user_id: string; api_token: string; settings: unknown; funnel: unknown };

async function postOrder(token: string, body: unknown) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(UTMIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-token": token },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, error: res.ok ? null : text.slice(0, 300) };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message.slice(0, 300) : "falha de rede" };
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Envia um pedido (pendente -> pago) de um produto. */
async function sendStep(token: string, step: FunnelStep, settings: GuruSettings, customer: { name: string; email: string }, orderId: string) {
  const now = new Date();
  const createdAt = new Date(now.getTime() - 60_000);
  const waiting = await postOrder(token, buildOrderBody({ orderId, step, settings, customer, status: "waiting_payment", createdAt, approvedAt: null }));
  if (!waiting.ok) return waiting;
  return postOrder(token, buildOrderBody({ orderId, step, settings, customer, status: "paid", createdAt, approvedAt: now }));
}

/**
 * Um comprador percorre o funil na ordem. Cada produto comprado vira um
 * pedido próprio na Utmify. Para no primeiro envio que falhar.
 */
export async function fireBuyer(admin: AdminClient, config: GuruConfigRow, source: "manual" | "auto") {
  const settings = normalizeSettings(config.settings);
  const funnel = normalizeFunnel(config.funnel);
  const bought = simulateBuyer(funnel);
  if (!config.api_token) return { ok: false, sent: 0, error: "Token da Utmify não configurado." };
  if (bought.length === 0) return { ok: false, sent: 0, error: "Nenhum produto com valor no funil." };

  const customer = settings.randomCustomer
    ? randomCustomer()
    : { name: settings.customerName || "Cliente", email: settings.customerEmail || "cliente@example.com" };
  const buyerId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const funnelSteps = funnel.filter((s) => s.priceCents > 0);

  let sent = 0;
  let lastError: string | null = null;
  for (let i = 0; i < bought.length; i++) {
    if (i > 0 && settings.stepDelaySec > 0) await sleep(settings.stepDelaySec * 1000);
    const step = bought[i];
    const orderId = `nb-${buyerId}-${i + 1}`;
    const r = await sendStep(config.api_token, step, settings, customer, orderId);
    await admin.from("gurufucker_logs").insert({
      user_id: config.user_id,
      ok: r.ok,
      status_code: r.status || null,
      order_id: orderId,
      buyer_id: buyerId,
      step_index: Math.max(0, funnelSteps.findIndex((s) => s.id === step.id)),
      product_name: step.name || "Produto",
      amount_cents: step.priceCents,
      currency: settings.currency,
      source,
      error: r.error,
    });
    if (!r.ok) {
      lastError = r.status ? `Utmify respondeu ${r.status}${r.error ? `: ${r.error}` : ""}` : r.error;
      break;
    }
    sent++;
  }
  return { ok: sent > 0 && !lastError, sent, error: lastError };
}
