import { scopeJourney, type OfferScope } from "./offer-scope";

export interface TrafficPlatformRow {
  platform: string;
  human: number;
  bot: number;
}

export interface TrafficQuality {
  humanSessions: number;
  botSessions: number;
  humanEvents: number;
  botEvents: number;
  botRate: number;
  platforms: TrafficPlatformRow[];
  hourly: { hour: string; human: number; bot: number }[];
}

function classify(source: string | null, ua: string | null, referrer: string | null): string {
  const s = `${source ?? ""} ${referrer ?? ""}`.toLowerCase();
  const u = (ua ?? "").toLowerCase();
  const hit = (re: RegExp) => re.test(s) || re.test(u);
  if (hit(/tiktok|bytespider|bytedance|ttclid/)) return "TikTok";
  if (hit(/facebook|instagram|meta-external|whatsapp|\bfb\b|\big\b|fbclid/)) return "Facebook / Meta";
  if (hit(/google|adwords|adsbot|youtube|gclid/)) return "Google";
  if (hit(/kwai/)) return "Kwai";
  if (hit(/taboola|outbrain/)) return "Nativa";
  if (!s.trim()) return "Direto / desconhecido";
  return "Outros";
}

export async function computeTrafficQuality(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  funnelId: string;
  from: string;
  to: string;
  offer?: OfferScope;
  source?: string | null;
}): Promise<TrafficQuality> {
  const pageSize = 1000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = [];
  for (let page = 0; page < 20; page++) {
    const { data, error } = await args.supabase
      .from("tracker_funnel_events")
      .select("session_id, is_bot, utm_source, utm_campaign, referrer, user_agent, created_at")
      .eq("funnel_id", args.funnelId)
      .gte("created_at", args.from)
      .lte("created_at", args.to)
      .order("created_at", { ascending: true })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) throw new Error(error.message);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chunk = (data ?? []) as any[];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
  }

  const humanSessions = new Set<string>();
  const botSessions = new Set<string>();
  let humanEvents = 0;
  let botEvents = 0;
  const byPlatform = new Map<string, { human: Set<string>; bot: Set<string> }>();
  const sessions = new Map<string, { createdAt: string; human: boolean; platform: string }>();

  for (const r of scopeJourney(rows, (r) => String(r.session_id), args.offer, args.source)) {
    const sid = String(r.session_id);
    const bot = Boolean(r.is_bot);
    const platform = classify(r.utm_source ?? null, r.user_agent ?? null, r.referrer ?? null);
    const current = sessions.get(sid);
    if (!current) sessions.set(sid, { createdAt: String(r.created_at), human: !bot, platform });
    else if (!bot) current.human = true;
    if (bot) botEvents++; else humanEvents++;
  }

  // Uma visita é humana quando qualquer etapa registrou interação. Isso evita
  // contar a mesma sessão como humana e robô porque o primeiro pageview ocorre
  // antes do primeiro toque.
  for (const [sid, session] of sessions) {
    if (session.human) humanSessions.add(sid);
    else botSessions.add(sid);
    if (!byPlatform.has(session.platform)) byPlatform.set(session.platform, { human: new Set(), bot: new Set() });
    const group = byPlatform.get(session.platform);
    if (group) (session.human ? group.human : group.bot).add(sid);
  }

  const total = humanSessions.size + botSessions.size;
  const hourlyMap = new Map<string, { human: number; bot: number }>();
  for (const { createdAt, human } of sessions.values()) {
    const date = new Date(createdAt);
    date.setMinutes(0, 0, 0);
    const hour = date.toISOString();
    const current = hourlyMap.get(hour) ?? { human: 0, bot: 0 };
    if (human) current.human += 1;
    else current.bot += 1;
    hourlyMap.set(hour, current);
  }

  const hourly: { hour: string; human: number; bot: number }[] = [];
  if (sessions.size > 0) {
    const start = new Date(args.from);
    start.setMinutes(0, 0, 0);
    const end = new Date(args.to);
    end.setMinutes(0, 0, 0);
    for (let cursor = start.getTime(); cursor <= end.getTime(); cursor += 60 * 60 * 1000) {
      const hour = new Date(cursor).toISOString();
      const values = hourlyMap.get(hour) ?? { human: 0, bot: 0 };
      hourly.push({ hour, ...values });
    }
  }

  return {
    humanSessions: humanSessions.size,
    botSessions: botSessions.size,
    humanEvents,
    botEvents,
    botRate: total > 0 ? (botSessions.size / total) * 100 : 0,
    hourly,
    platforms: [...byPlatform.entries()]
      .map(([platform, g]) => ({ platform, human: g.human.size, bot: g.bot.size }))
      .sort((a, b) => b.human + b.bot - (a.human + a.bot)),
  };
}
