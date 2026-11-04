import { offerOf, type Offer } from "./offer-classification";

export type OfferScope = "all" | Offer;
type AttributedRow = { utm_campaign?: string | null; utm_source?: string | null };

/** Preserve all stages when only one event carries the campaign UTM. */
export function scopeJourney<T extends AttributedRow>(
  rows: T[], idOf: (row: T) => string, offer: OfferScope = "all", source?: string | null,
): T[] {
  if (offer === "all" && !source) return rows;
  const attrs = new Map<string, AttributedRow>();
  for (const row of rows) {
    const id = idOf(row);
    const prev = attrs.get(id);
    attrs.set(id, {
      utm_campaign: prev?.utm_campaign || row.utm_campaign,
      utm_source: prev?.utm_source || row.utm_source,
    });
  }
  const selected = new Set<string>();
  for (const [id, attr] of attrs) {
    if (offer !== "all" && offerOf(attr.utm_campaign ?? "") !== offer) continue;
    if (source && !(attr.utm_source ?? "").toLowerCase().includes(source.toLowerCase())) continue;
    selected.add(id);
  }
  return rows.filter((row) => selected.has(idOf(row)));
}