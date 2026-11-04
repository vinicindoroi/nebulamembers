import { scopeJourney, type OfferScope } from "./offer-scope";

/** Usuários "ao vivo": sessões cujo último evento aconteceu na janela recente. */
export async function computeFunnelLive(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  funnelId: string;
  windowMinutes: number;
  offer?: OfferScope;
  source?: string | null;
}): Promise<{ total: number; byStep: Record<string, number>; windowMinutes: number }> {
  const since = new Date(Date.now() - args.windowMinutes * 60_000).toISOString();

  const { data, error } = await args.supabase
    .from("tracker_funnel_events")
    .select("session_id, step, created_at, utm_campaign, utm_source")
    .eq("funnel_id", args.funnelId)
    .eq("is_bot", false)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(5000);
  if (error) throw new Error(error.message);

  const lastStep = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const e of scopeJourney((data ?? []) as any[], (e) => String(e.session_id), args.offer, args.source)) {
    lastStep.set(String(e.session_id), String(e.step));
  }

  const byStep: Record<string, number> = {};
  for (const step of lastStep.values()) byStep[step] = (byStep[step] ?? 0) + 1;

  return { total: lastStep.size, byStep, windowMinutes: args.windowMinutes };
}
