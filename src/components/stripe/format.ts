import { toMajor } from "@/lib/stripe-sales";

export function money(minor: number, currency: string | null) {
  if (!currency) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 2 }).format(toMajor(minor, currency));
}

let regionNames: Intl.DisplayNames | null = null;
export function countryName(code: string) {
  try {
    regionNames ??= new Intl.DisplayNames(["pt-BR"], { type: "region" });
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export function flag(code: string) {
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}
