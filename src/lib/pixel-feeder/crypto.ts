/**
 * Utilities to hash parameters for Meta Conversions API (CAPI) using SHA-256.
 * Adheres to official Meta normalization guidelines:
 * - trim spaces
 * - convert to lowercase
 * - remove formatting from phones, zipcodes, etc.
 */

export async function sha256(value: string): Promise<string> {
  const clean = value.trim().toLowerCase();
  if (!clean) return "";
  const msgBuffer = new TextEncoder().encode(clean);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  // Retain only digits
  return phone.replace(/\D/g, "");
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-zÀ-ÿ]/g, "");
}

export function normalizeCity(city: string): string {
  return city.trim().toLowerCase().replace(/[^a-zÀ-ÿ\s]/g, "");
}

export function normalizeState(state: string): string {
  return state.trim().toLowerCase();
}

export function normalizeZip(zip: string): string {
  // Remove non-alphanumeric (dashes, spaces)
  return zip.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function normalizeCountry(country: string): string {
  return country.trim().toLowerCase().slice(0, 2);
}

export function generateEventId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "evt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10);
}

export function generateFbp(): string {
  const ts = Date.now();
  const rand = Math.floor(1000000000 + Math.random() * 9000000000);
  return `fb.1.${ts}.${rand}`;
}

export function generateFbc(): string {
  const ts = Date.now();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let randomPayload = "";
  for (let i = 0; i < 48; i++) {
    randomPayload += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `fb.1.${ts}.IwAR${randomPayload}`;
}
