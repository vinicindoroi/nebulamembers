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
