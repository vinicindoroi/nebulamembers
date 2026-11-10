export type OfferLink = { label: string; url: string };
export type OfferPrompt = { title: string; text: string };

export const MAX_OFFER_LABEL = 40;
export const MAX_OFFER_PROMPT = 20_000;

/** Normalizes an admin-entered offer link; returns null when it is not a valid http(s) URL. */
export function normalizeOfferLink(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    const out = url.toString();
    return out.length <= 2000 ? out : null;
  } catch {
    return null;
  }
}

/** Short label for showing a link to students (host + path, no scheme). */
export function offerLinkLabel(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "" : u.pathname;
    return `${u.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return url;
  }
}

/** Drops empty rows, normalizes URLs; reports the first invalid row (1-based). */
export function cleanOfferLinks(
  rows: OfferLink[],
): { ok: true; links: OfferLink[] } | { ok: false; row: number } {
  const links: OfferLink[] = [];
  for (const [i, r] of rows.entries()) {
    const label = r.label.trim().slice(0, MAX_OFFER_LABEL);
    if (!r.url.trim() && !label) continue;
    const url = normalizeOfferLink(r.url);
    if (!url) return { ok: false, row: i + 1 };
    links.push({ label, url });
  }
  return { ok: true, links };
}

/** Drops prompts without text; trims title/text. */
export function cleanOfferPrompts(rows: OfferPrompt[]): OfferPrompt[] {
  return rows
    .map((r) => ({ title: r.title.trim().slice(0, 120), text: r.text.trim().slice(0, MAX_OFFER_PROMPT) }))
    .filter((r) => r.text.length > 0);
}

/** Reads stored links defensively; anything that is not a safe http(s) URL is skipped. */
export function readOfferLinks(value: unknown, legacy?: string | null): OfferLink[] {
  const list = Array.isArray(value) ? value : [];
  const out: OfferLink[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const { label, url } = item as Record<string, unknown>;
    const safe = typeof url === "string" ? normalizeOfferLink(url) : null;
    if (safe) out.push({ label: typeof label === "string" ? label : "", url: safe });
  }
  if (!out.length && legacy) {
    const safe = normalizeOfferLink(legacy);
    if (safe) out.push({ label: "", url: safe });
  }
  return out;
}

export function readOfferPrompts(value: unknown): OfferPrompt[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const { title, text } = item as Record<string, unknown>;
    return typeof text === "string" && text.trim()
      ? [{ title: typeof title === "string" ? title : "", text }]
      : [];
  });
}
