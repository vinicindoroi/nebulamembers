export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const money = (n: number, currency: string = "BRL") => {
  const cur = (currency || "BRL").toUpperCase();
  const locale = cur === "BRL" ? "pt-BR" : "en-US";
  try {
    return (isFinite(n) ? n : 0).toLocaleString(locale, { style: "currency", currency: cur });
  } catch {
    return brl(n);
  }
};

export const pct = (n: number) =>
  (isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });

export const compact = (n: number) =>
  n.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

export const num = (n: number, decimals = 2) =>
  (isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export function shortId(len = 10) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export function buildTrackedUrl(destination: string, params: Record<string, string | undefined | null>) {
  const url = new URL(destination);
  for (const [k, v] of Object.entries(params)) {
    if (v && v.length > 0) url.searchParams.set(k, v);
  }
  return url.toString();
}
