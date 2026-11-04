/** Parse o utm_content nos dois formatos possíveis para extrair o criativo. */
export interface ParsedCreative {
  /** Nome legível do criativo */
  name: string;
  /** id do criativo (content_id do catálogo ou ad.id) */
  id: string | null;
  /** origem do formato */
  kind: "catalog" | "ad" | "raw";
}

export function parseCreative(utmContent: string | null | undefined): ParsedCreative {
  const raw = (utmContent ?? "").trim();
  if (!raw) return { name: "(sem criativo)", id: null, kind: "raw" };

  // Anúncio único: "NomeDoAnuncio|123456789"
  if (raw.includes("|")) {
    const parts = raw.split("|");
    const id = (parts[parts.length - 1] ?? "").trim();
    const name = parts.slice(0, -1).join("|").trim() || raw;
    if (/^\d{5,}$/.test(id)) return { name, id, kind: "ad" };
    return { name: raw, id: null, kind: "raw" };
  }

  // Catálogo Meta: "Image1676-62110634-83791727-9.png"
  const withoutExt = raw.replace(/\.(png|jpe?g|webp|gif|mp4|mov)$/i, "");
  const seg = withoutExt.split("-");
  if (seg.length >= 2 && /^\d{5,}$/.test(seg[1] ?? "")) {
    return { name: seg[0] ?? raw, id: seg[1] ?? null, kind: "catalog" };
  }

  return { name: raw, id: null, kind: "raw" };
}

export function creativeKey(utmContent: string | null | undefined): string {
  const p = parseCreative(utmContent);
  return p.id ? `${p.name}#${p.id}` : p.name;
}
