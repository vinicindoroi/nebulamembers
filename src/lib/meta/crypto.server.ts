function base64(bytes: Uint8Array) { return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join("")); }
function bytes(value: string) { return Uint8Array.from(atob(value), (c) => c.charCodeAt(0)); }
async function key() {
  const secret = process.env["META_TOKENS_SECRET"];
  if (!secret) throw new Error("A conexão Facebook ainda não foi configurada.");
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function encryptMetaToken(token: string, userId: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(userId) }, await key(), new TextEncoder().encode(token)));
  const packed = new Uint8Array(iv.length + ciphertext.length);
  packed.set(iv); packed.set(ciphertext, iv.length);
  return base64(packed);
}
export async function decryptMetaToken(value: string, userId: string) {
  const packed = bytes(value);
  const result = await crypto.subtle.decrypt({ name: "AES-GCM", iv: packed.subarray(0, 12), additionalData: new TextEncoder().encode(userId) }, await key(), packed.subarray(12));
  return new TextDecoder().decode(result);
}
export async function hashState(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), (b) => b.toString(16).padStart(2, "0")).join("");
}