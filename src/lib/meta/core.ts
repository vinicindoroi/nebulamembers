import { z } from "zod";

export const META_PERIODS = ["today", 7, 30, 90] as const;
export type MetaPeriod = (typeof META_PERIODS)[number];
export const metaPeriodSchema = z.union([z.literal("today"), z.literal(7), z.literal(30), z.literal(90)]);
export const accountSchema = z.object({ id: z.string().regex(/^act_\d+$/), name: z.string(), currency: z.string(), timezone_name: z.string(), account_status: z.number().optional() });
export type MetaAccount = z.infer<typeof accountSchema>;
const actionSchema = z.object({ action_type: z.string(), value: z.string() });
export const campaignSchema = z.object({ id: z.string(), name: z.string(), objective: z.string().optional(), effective_status: z.string() });
export const insightSchema = z.object({ campaign_id: z.string(), spend: z.string().optional(), impressions: z.string().optional(), inline_link_clicks: z.string().optional(), actions: z.array(actionSchema).optional(), action_values: z.array(actionSchema).optional() });

export function metaDateRange(period: MetaPeriod, timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find((p) => p.type === type)?.value;
  const until = `${value("year")}-${value("month")}-${value("day")}`;
  const day = new Date(`${until}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - (period === "today" ? 0 : period - 1));
  return { since: day.toISOString().slice(0, 10), until };
}

export function campaignMetrics(campaign: z.infer<typeof campaignSchema>, insight?: z.infer<typeof insightSchema>, complete = true) {
  const number = (value?: string) => value === undefined ? 0 : Number(value) || 0;
  const spend = number(insight?.spend);
  const impressions = number(insight?.impressions);
  const linkClicks = number(insight?.inline_link_clicks);
  // These purchase counters overlap: choose one, never sum aliases.
  const purchase = ["offsite_conversion.fb_pixel_purchase", "omni_purchase", "purchase"]
    .map((type) => insight?.actions?.find((action) => action.action_type === type)).find(Boolean);
  const purchaseValue = purchase ? insight?.action_values?.find((action) => action.action_type === purchase.action_type) : undefined;
  return {
    id: campaign.id, name: campaign.name, objective: campaign.objective ?? null,
    metricsAvailable: !!insight || complete,
    status: campaign.effective_status, spend, impressions, linkClicks,
    ctr: impressions ? linkClicks / impressions * 100 : 0,
    purchases: purchase ? number(purchase.value) : null,
    roas: purchaseValue && spend > 0 ? number(purchaseValue.value) / spend : null,
  };
}

export type MetaCampaign = ReturnType<typeof campaignMetrics>;
export interface MetaReport {
  account: MetaAccount;
  range: { since: string; until: string };
  campaigns: MetaCampaign[];
  partial: boolean;
  fetchedAt: string;
  warning: string | null;
  retryAt: string | null;
}

export const metaReportSchema = z.object({
  account: accountSchema,
  range: z.object({ since: z.string(), until: z.string() }),
  campaigns: z.array(z.object({ id: z.string(), name: z.string(), objective: z.string().nullable(), status: z.string(), metricsAvailable: z.boolean(), spend: z.number(), impressions: z.number(), linkClicks: z.number(), ctr: z.number(), purchases: z.number().nullable(), roas: z.number().nullable() })),
  partial: z.boolean(), fetchedAt: z.string(), warning: z.string().nullable(), retryAt: z.string().nullable(),
});

export function oauthStateValid(row: { user_id: string; expires_at: string } | null, userId: string, now = Date.now()) {
  return !!row && row.user_id === userId && Date.parse(row.expires_at) > now;
}