import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/meta/callback")({
  head: () => ({ meta: [
    { title: "Conexão Facebook — Nebula Members" },
    { name: "description", content: "Conclusão segura da conexão individual do Facebook na Nebula Members." },
    { property: "og:title", content: "Conexão Facebook — Nebula Members" },
    { property: "og:description", content: "Conclusão segura da conexão individual do Facebook na Nebula Members." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  server: { handlers: { GET: ({ request }) => {
    const url = new URL(request.url);
    const payload = JSON.stringify({ type: "nebula-meta-oauth", code: url.searchParams.get("code"), state: url.searchParams.get("state"), cancelled: !!url.searchParams.get("error") }).replace(/</g, "\\u003c");
    const nonce = crypto.randomUUID();
    // This public callback never exchanges credentials or accesses private records.
    // The authenticated opener validates and consumes the stored state before exchange.
    return new Response(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Conexão Facebook — Nebula Members</title></head><body><p>Volte ao painel para concluir a conexão do Facebook.</p><script nonce="${nonce}">if(window.opener){window.opener.postMessage(${payload},window.location.origin);window.close();}history.replaceState(null,"",location.pathname);</script></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'` } });
  } } },
});