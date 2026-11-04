import { creativeKey, parseCreative } from "./creative";
import { scopeJourney, type OfferScope } from "./offer-scope";
import { offerOf } from "./offer-classification";
import type { FunnelBreakdownRow, FunnelReport, FunnelStepRow, FunnelSummary } from "./types";

interface EventRow {
  session_id: string;
  step: string;
  amount: number | null;
  click_id: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface StepDef { key: string; label: string; position: number }

export const DEFAULT_STEPS: StepDef[] = [
  { key: "chegou", label: "Chegou", position: 1 },
  { key: "engajou", label: "Engajou", position: 2 },
  { key: "dados", label: "Deu dados", position: 3 },
  { key: "viu_oferta", label: "Viu oferta", position: 4 },
  { key: "checkout", label: "Checkout", position: 5 },
  { key: "pagamento_iniciado", label: "Pagamento iniciado", position: 6 },
  { key: "pagamento_aprovado", label: "Pagamento aprovado", position: 7 },
];

interface Ctx {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  workspaceId: string;
  funnelId: string;
  from: string;
  to: string;
  /** Filtro de origem (utm_source), ex.: "tiktok". Null = todas. */
  source?: string | null;
  offer?: OfferScope;
}

async function loadSteps(ctx: Ctx): Promise<StepDef[]> {
  const { data } = await ctx.supabase
    .from("tracker_funnel_steps")
    .select("key, label, position")
    .eq("funnel_id", ctx.funnelId)
    .order("position", { ascending: true });
  const rows = (data ?? []) as StepDef[];
  return rows.length ? rows : DEFAULT_STEPS;
}

async function loadEvents(ctx: Ctx): Promise<EventRow[]> {
  const out: EventRow[] = [];
  const pageSize = 1000;
  for (let page = 0; page < 20; page++) {
    const { data, error } = await ctx.supabase
      .from("tracker_funnel_events")
      .select("session_id, step, amount, click_id, utm_source, utm_campaign, utm_content, metadata, created_at, is_bot")
      .eq("funnel_id", ctx.funnelId)
      .gte("created_at", ctx.from)
      .lte("created_at", ctx.to)
      .order("created_at", { ascending: true })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as EventRow[];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  // Classificação por SESSÃO: o "início" dispara no carregamento, antes de
  // qualquer toque, então vem marcado como bot mesmo em humanos. Se a sessão
  // teve qualquer evento humano, a sessão inteira é humana.
  const human = new Set<string>();
  for (const e of out as any[]) if (!e.is_bot) human.add(e.session_id);
  return out.filter((e) => human.has(e.session_id));
}

/** Vendas pagas já registradas pelos webhooks de checkout, casadas pelo click_id ou UTM. */
async function loadPaidOrders(ctx: Ctx): Promise<
  { clickId: string; amount: number; createdAt: string; utmContent: string | null; utmCampaign: string | null }[]
> {
  let q = ctx.supabase
    .from("orders")
    .select("click_id, amount, status, created_at, utm_content, utm_campaign")
    .eq("workspace_id", ctx.workspaceId)
    .eq("status", "paid")
    .gte("created_at", ctx.from)
    .lte("created_at", ctx.to)
    .limit(5000);
  if (ctx.source) q = q.ilike("utm_source", `%${ctx.source}%`);
  const { data } = await q;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).filter((o) => !ctx.offer || ctx.offer === "all" || !o.utm_campaign || offerOf(o.utm_campaign) === ctx.offer).map((o) => ({
    clickId: o.click_id ? String(o.click_id) : "",
    amount: Number(o.amount ?? 0),
    createdAt: String(o.created_at),
    utmContent: o.utm_content ? String(o.utm_content) : null,
    utmCampaign: o.utm_campaign ? String(o.utm_campaign) : null,
  }));
}

async function loadRefusedCount(ctx: Ctx): Promise<number> {
  if (ctx.offer && ctx.offer !== "all") {
    const rows: { utm_campaign: string | null; click_id: string | null }[] = [];
    for (let from = 0; ; from += 1000) {
      let query = ctx.supabase.from("orders").select("utm_campaign,click_id")
        .eq("workspace_id", ctx.workspaceId).in("status", ["refused", "canceled"])
        .gte("created_at", ctx.from).lte("created_at", ctx.to).order("id").range(from, from + 999);
      if (ctx.source) query = query.ilike("utm_source", `%${ctx.source}%`);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return rows.filter((row) => offerOf(row.utm_campaign ?? "") === ctx.offer).length;
  }
  let q = ctx.supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", ctx.workspaceId)
    .in("status", ["refused", "canceled"])
    .gte("created_at", ctx.from)
    .lte("created_at", ctx.to);
  if (ctx.source) q = q.ilike("utm_source", `%${ctx.source}%`);
  const { count } = await q;
  return count ?? 0;
}

function eventContainsClickId(event: EventRow, clickId: string) {
  if (event.click_id === clickId || event.utm_source === clickId || event.utm_campaign === clickId || event.utm_content === clickId) {
    return true;
  }
  return JSON.stringify(event.metadata ?? {}).includes(clickId);
}

function pct(a: number, b: number) {
  return b > 0 ? (a / b) * 100 : 0;
}

function normalizedStepName(step: StepDef) {
  return `${step.key} ${step.label}`.toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "_");
}

function resolveConversionSteps(stepDefs: StepDef[]) {
  const paidStep = [...stepDefs].reverse().find((step) =>
    /(?:^|_)(?:pagamento_)?(?:aprovado|pago|pagou|paid)(?:_|$)/.test(normalizedStepName(step)),
  );
  const generatedStep = [...stepDefs].reverse().find((step) =>
    /checkout|pagamento_iniciado|iniciou_pagamento|gerou_pagamento|gerado/.test(normalizedStepName(step)),
  );

  return {
    paidKey: paidStep?.key ?? null,
    generatedKey: generatedStep?.key ?? paidStep?.key ?? stepDefs[stepDefs.length - 1]?.key ?? "pagamento_aprovado",
  };
}

interface Group {
  label: string;
  sublabel: string | null;
  campaign?: string | null;
  content?: string | null;
  source?: string | null;
  sessions: Set<string>;
  sales: Set<string>;
  revenue: number;
}

/** Limpa nomes de campanha poluídos com "utm_term:"/"utm_content:" concatenados. */
export function cleanCampaign(raw: string | null | undefined): string {
  const v = (raw ?? "").trim();
  if (!v) return "(sem campanha)";
  return v.split(/\s+utm_(?:term|content|source|medium)\s*:/i)[0]!.trim() || v;
}

function buildBreakdown(groups: Map<string, Group>): FunnelBreakdownRow[] {
  return [...groups.entries()]
    .map(([key, g]) => ({
      key,
      label: g.label,
      sublabel: g.sublabel,
      campaign: g.campaign ?? null,
      content: g.content ?? null,
      source: g.source ?? null,
      sessions: g.sessions.size,
      sales: g.sales.size,
      revenue: g.revenue,
      conv: pct(g.sales.size, g.sessions.size),
    }))
    .sort((a, b) => b.sales - a.sales || b.sessions - a.sessions);
}

function summarize(steps: FunnelStepRow[], revenue: number, generatedKey: string, paidOrders: number, refused = 0): FunnelSummary {
  const arrived = steps[0]?.sessions ?? 0;
  const generated = steps.find((s) => s.key === generatedKey)?.sessions ?? 0;
  const paid = paidOrders;
  return {
    arrived,
    paid,
    refused,
    generated,
    revenue,
    convOverall: pct(paid, arrived),
    payRate: pct(paid, generated),
  };
}


async function computeCore(ctx: Ctx, stepDefs: StepDef[]) {
  const [rawEvents, orders, refusedCount] = await Promise.all([loadEvents(ctx), loadPaidOrders(ctx), loadRefusedCount(ctx)]);

  // A marcação do navegador já separa pré-carregamentos de visitas com
  // interação. Não descarte sessões pela velocidade: páginas automatizadas
  // podem emitir várias tags legítimas em poucos segundos.
  const events = scopeJourney(rawEvents, (e) => e.session_id, ctx.offer, ctx.source);

  const { paidKey, generatedKey } = resolveConversionSteps(stepDefs);

  const sessionsByStep = new Map<string, Set<string>>();
  const attr = new Map<string, { content: string | null; campaign: string | null; source: string | null }>();
  let revenue = 0;

  for (const e of events) {
    if (!sessionsByStep.has(e.step)) sessionsByStep.set(e.step, new Set());
    sessionsByStep.get(e.step)!.add(e.session_id);
    const prev = attr.get(e.session_id);
    if (!prev || (!prev.content && e.utm_content)) {
      attr.set(e.session_id, {
        content: e.utm_content ?? prev?.content ?? null,
        campaign: e.utm_campaign ?? prev?.campaign ?? null,
        source: e.utm_source ?? prev?.source ?? null,
      });
    }
    if (paidKey && e.step === paidKey) revenue += Number(e.amount ?? 0);
  }

  // 🛡️ Normalização de aliases de etapas (retrocompatibilidade entre chaves antigas e novas)
  const STEP_ALIASES: Record<string, string[]> = {
    comeco: ['comeco', 'inicio', 'chegou', 'iniciouspt'],
    inicio: ['comeco', 'inicio', 'chegou', 'iniciouspt'],
    avaliacao1: ['avaliacao1', 'avaliacao'],
    avaliacao: ['avaliacao1', 'avaliacao'],
    start_verification1: ['start_verification1', 'start_verification'],
    start_verification: ['start_verification1', 'start_verification'],
    yes_i_do1: ['yes_i_do1', 'yes_i_do'],
    yes_i_do: ['yes_i_do1', 'yes_i_do'],
    coleta_de_nome1: ['coleta_de_nome1', 'coleta_de_nome', 'dados'],
    coleta_de_nome: ['coleta_de_nome1', 'coleta_de_nome', 'dados'],
    elegibilidade1: ['elegibilidade1', 'elegibilidade'],
    elegibilidade: ['elegibilidade1', 'elegibilidade'],
    recibo1: ['recibo1', 'recibo'],
    recibo: ['recibo1', 'recibo'],
    vsl_checkout1: ['vsl_checkout1', 'vsl_checkout', 'vslspt', 'viu_oferta'],
    vsl_checkout: ['vsl_checkout1', 'vsl_checkout', 'vslspt', 'viu_oferta'],
    checkout1: ['checkout1', 'checkout', 'checkoutspt', 'iniciou_checkout'],
    checkout: ['checkout1', 'checkout', 'checkoutspt', 'iniciou_checkout'],
    upsell_1: ['upsell_1', 'upsell1'],
    upsell1: ['upsell_1', 'upsell1'],
    upsell_2: ['upsell_2', 'upsell2'],
    upsell2: ['upsell_2', 'upsell2'],
  };

  for (const [targetKey, aliases] of Object.entries(STEP_ALIASES)) {
    if (!sessionsByStep.has(targetKey)) sessionsByStep.set(targetKey, new Set());
    const targetSet = sessionsByStep.get(targetKey)!;
    for (const alias of aliases) {
      const aliasSet = sessionsByStep.get(alias);
      if (aliasSet) {
        for (const sid of aliasSet) targetSet.add(sid);
      }
    }
  }

  // Funil monotônico: quem chegou na etapa N passou pelas anteriores
  // (eventos perdidos/antigos não podem deixar o topo menor que o meio).
  {
    const genIdx = generatedKey ? stepDefs.findIndex((s) => s.key === generatedKey) : -1;
    const limit = genIdx >= 0 ? genIdx : stepDefs.length;
    const maxIdx = new Map<string, number>();
    stepDefs.forEach((s, i) => {
      if (i >= limit) return;
      for (const sid of sessionsByStep.get(s.key) ?? []) maxIdx.set(sid, Math.max(maxIdx.get(sid) ?? -1, i));
    });
    for (const [sid, mi] of maxIdx) for (let i = 0; i < mi; i++) {
      const k = stepDefs[i].key;
      if (!sessionsByStep.has(k)) sessionsByStep.set(k, new Set());
      sessionsByStep.get(k)!.add(sid);
    }
  }

  // Vendas dos webhooks. O checkout devolve o identificador externo (sck/src),
  // enquanto o tracker usa outro session_id; recupere a sessão pelo evento que
  // preservou esse identificador nos UTMs/referrer/metadata.
  const paidSet = paidKey ? (sessionsByStep.get(paidKey) ?? new Set<string>()) : new Set<string>();
  const funnelSessions = new Set<string>();
  for (const set of sessionsByStep.values()) for (const sid of set) funnelSessions.add(sid);
  // cada pedido conta como uma venda, mesmo que várias venham da mesma sessão
  const paidFromEvents = new Set(paidSet);
  const consumedEventPaid = new Set<string>();
  let paidOrders = paidFromEvents.size;
  for (const o of orders) {
    const directSession = o.clickId && funnelSessions.has(o.clickId) ? o.clickId : null;
    const matchedEvent = directSession || !o.clickId
      ? null
      : events
          .filter((event) => eventContainsClickId(event, o.clickId))
          .sort((a, b) => Math.abs(Date.parse(a.created_at) - Date.parse(o.createdAt)) - Math.abs(Date.parse(b.created_at) - Date.parse(o.createdAt)))[0];
    // Alguns checkouts removem o identificador antes de disparar o webhook.
    // Nesse caso, case pela UTM da venda com a sessão mais recente do funil que
    // tenha a mesma UTM; se não houver, use o checkout imediatamente anterior.
    const orderTime = Date.parse(o.createdAt);
    const isCheckoutStep = (step: string) => step === generatedKey || /checkout/i.test(step);
    const byUtm = directSession || matchedEvent || !(o.utmContent || o.utmCampaign)
      ? null
      : events
          .filter((event) => {
            const elapsed = orderTime - Date.parse(event.created_at);
            if (elapsed < 0 || elapsed > 24 * 60 * 60 * 1000) return false;
            if (o.utmContent && event.utm_content) return event.utm_content === o.utmContent;
            if (o.utmCampaign && event.utm_campaign) return event.utm_campaign === o.utmCampaign;
            return false;
          })
          .sort((a, b) => {
            const ca = isCheckoutStep(a.step) ? 1 : 0;
            const cb = isCheckoutStep(b.step) ? 1 : 0;
            if (ca !== cb) return cb - ca;
            return Date.parse(b.created_at) - Date.parse(a.created_at);
          })[0];
    // Venda com UTM de campanha pertence ao anúncio: se não casou com nenhuma
    // sessão do funil, não joga no "checkout mais próximo" (isso encostava
    // venda de ads em funis de tráfego direto que nem venderam).
    const nearbyCheckout =
      directSession || matchedEvent || byUtm || o.utmContent || o.utmCampaign || (ctx.offer && ctx.offer !== "all")
        ? null
        : events
          .filter((event) => {
            if (!isCheckoutStep(event.step)) return false;
            const elapsed = orderTime - Date.parse(event.created_at);
            return elapsed >= 0 && elapsed <= 3 * 60 * 60 * 1000;
          })
          .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
    const session = directSession ?? matchedEvent?.session_id ?? byUtm?.session_id ?? nearbyCheckout?.session_id;
    if (!session) continue;
    // se a sessão já tinha evento de pagamento, o primeiro pedido é o mesmo evento
    if (paidFromEvents.has(session) && !consumedEventPaid.has(session)) {
      consumedEventPaid.add(session);
      continue;
    }
    paidSet.add(session);
    paidOrders += 1;
    revenue += o.amount;
  }

  if (paidKey) sessionsByStep.set(paidKey, paidSet);


  const total = sessionsByStep.get(stepDefs[0]?.key ?? "")?.size ?? 0;
  const raw = stepDefs.map((d) => ({ ...d, sessions: sessionsByStep.get(d.key)?.size ?? 0 }));

  let worstIdx = -1;
  let worstDrop = 0;
  raw.forEach((s, i) => {
    if (i === 0) return;
    const prev = raw[i - 1]!.sessions;
    const drop = prev - s.sessions;
    if (prev > 0 && drop > worstDrop) { worstDrop = drop; worstIdx = i; }
  });

  const steps: FunnelStepRow[] = raw.map((s, i) => {
    const prev = i === 0 ? null : raw[i - 1]!.sessions;
    return {
      key: s.key,
      label: s.label,
      position: s.position,
      sessions: s.sessions,
      retention: prev === null ? null : pct(s.sessions, prev),
      dropped: prev === null ? 0 : Math.max(0, prev - s.sessions),
      ofTotal: pct(s.sessions, total),
      bottleneck: i === worstIdx,
    };
  });

  // breakdowns
  const byCreative = new Map<string, Group>();
  const bySource = new Map<string, Group>();

  for (const [session, a] of attr.entries()) {
    const campaign = cleanCampaign(a.campaign);
    const parsed = parseCreative(a.content);
    // criativo separado por campanha: o mesmo criativo pode rodar em campanhas diferentes
    const ck = `${campaign}::${creativeKey(a.content)}`;
    if (!byCreative.has(ck)) {
      byCreative.set(ck, {
        label: parsed.name,
        sublabel: parsed.id,
        campaign,
        content: a.content ?? null,
        source: a.source ?? null,
        sessions: new Set(),
        sales: new Set(),
        revenue: 0,
      });
    }
    const c = byCreative.get(ck)!;
    c.sessions.add(session);
    if (paidSet.has(session)) c.sales.add(session);

    const sk = `${a.source ?? "(direto)"}::${campaign}`;
    if (!bySource.has(sk)) {
      bySource.set(sk, {
        label: campaign,
        sublabel: a.source ?? "(direto)",
        campaign,
        source: a.source ?? "(direto)",
        content: null,
        sessions: new Set(),
        sales: new Set(),
        revenue: 0,
      });
    }
    const s = bySource.get(sk)!;
    s.sessions.add(session);
    if (paidSet.has(session)) s.sales.add(session);
  }

  return {
    steps,
    summary: summarize(steps, revenue, generatedKey, paidOrders, refusedCount),
    byCreative: buildBreakdown(byCreative),
    bySource: buildBreakdown(bySource),
    totalEvents: events.length,
  };
}

export async function computeFunnelReport(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  workspaceId: string;
  funnelId: string;
  from: string;
  to: string;
  compare?: { from: string; to: string } | null;
  currency?: string;
  source?: string | null;
  offer?: OfferScope;
}): Promise<FunnelReport> {
  const base: Ctx = { supabase: args.supabase, workspaceId: args.workspaceId, funnelId: args.funnelId, from: args.from, to: args.to, source: args.source ?? null, offer: args.offer ?? "all" };
  const stepDefs = await loadSteps(base);
  const main = await computeCore(base, stepDefs);
  let compare: FunnelSummary | null = null;
  if (args.compare) {
    const c = await computeCore({ ...base, from: args.compare.from, to: args.compare.to }, stepDefs);
    compare = c.summary;
  }
  return { currency: args.currency ?? "BRL", ...main, compare };
}
