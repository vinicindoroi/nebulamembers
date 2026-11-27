import assert from "node:assert/strict";
import { createMetaReader, MetaError } from "../src/lib/meta/api.server.ts";
process.env["META_APP_ID"] = "test-app";
process.env["META_APP_SECRET"] = "test-secret";
process.env["META_LOGIN_CONFIG_ID"] = "test-config";
process.env["META_GRAPH_VERSION"] = "v25.0";
const originalFetch = globalThis.fetch;
const calls = [];
globalThis.fetch = async (input, options) => {
  const url = new URL(input);
  const bearer = new Headers(options.headers).get("Authorization");
  calls.push({ path: url.pathname, after: url.searchParams.get("after"), bearer });
  assert.equal(url.hostname, "graph.facebook.com");
  assert.equal(url.searchParams.has("access_token"), false);
  if (bearer === "Bearer bad-token") return Response.json({ error: { code: 190, message: "Expired bad-token" } }, { status: 401 });
  if (!url.searchParams.get("after")) return Response.json({ data: [{ id: bearer === "Bearer token-a" ? "act_1" : "act_2", name: "Minha conta", currency: "BRL", timezone_name: "America/Sao_Paulo" }], paging: { next: "https://untrusted.test/?access_token=do-not-follow", cursors: { after: "cursor-2" } } });
  return Response.json({ data: [] });
};
try {
  assert.equal((await createMetaReader("token-a").accounts()).rows[0]?.id, "act_1");
  assert.equal((await createMetaReader("token-b").accounts()).rows[0]?.id, "act_2");
  assert.equal(calls.length, 4);
  assert.equal(calls[1]?.after, "cursor-2");
  await assert.rejects(() => createMetaReader("bad-token").accounts(), (error) => error instanceof MetaError && error.reconnect && !error.message.includes("bad-token"));
} finally { globalThis.fetch = originalFetch; }
console.log("meta-api: credenciais separadas, paginação segura e reconexão OK");