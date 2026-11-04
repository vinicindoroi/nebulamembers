export type Offer = "SPY" | "Outras";

// A campanha identifica a oferta mesmo quando ela muda de conta de anúncios.
// UncoverAI é tratada junto com SPY (mesma oferta para acompanhamento).
export function offerOf(campaign: string): Offer {
  const name = String(campaign ?? "").split("|")[0];
  if (/\[\s*(spy|uncoverai)\s*\]/i.test(name)) return "SPY";
  return "Outras";
}
