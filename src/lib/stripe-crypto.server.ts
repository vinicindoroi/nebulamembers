// AES-GCM encryption for students' Stripe keys (Web Crypto, works on the Worker runtime).

async function aesKey(): Promise<CryptoKey> {
  const secret = process.env["STRIPE_KEYS_SECRET"];
  if (!secret) throw new Error("STRIPE_KEYS_SECRET is not set");
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

const toB64 = (bytes: Uint8Array) => {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const fromB64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export async function encryptStripeKey(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), new TextEncoder().encode(plain)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return toB64(out);
}

export async function decryptStripeKey(stored: string): Promise<string> {
  const buf = fromB64(stored);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.subarray(0, 12) }, await aesKey(), buf.subarray(12));
  return new TextDecoder().decode(pt);
}
