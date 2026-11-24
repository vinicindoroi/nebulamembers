import assert from "node:assert/strict";
import { liveVisitors, rankFunnels, topBy } from "../src/lib/funnel-live.ts";

const now = Date.parse("2026-11-24T20:00:00Z");
const at = (minAgo) => new Date(now - minAgo * 60000).toISOString();
const ev = (f, v, type, min, country = "BR") => ({ funnel_id: f, event_type: type, visitor_id: v, session_id: null, country, created_at: at(min) });

// Ao vivo = últimos 5 minutos, cada visitante conta uma vez
const live = liveVisitors([ev("a", "1", "pageview", 1), ev("a", "1", "click", 2), ev("b", "2", "pageview", 4, "US"), ev("a", "3", "pageview", 6)], now);
assert.equal(live.total, 2);
assert.equal(live.byFunnel.get("a"), 1);
assert.equal(live.byCountry.get("US"), 1);

// Funil que mais traz vendas e acessos
const r = rankFunnels([ev("a", "1", "pageview", 10), ev("a", "2", "pageview", 10), ev("a", "3", "pageview", 10), ev("b", "4", "purchased", 10), ev("b", "5", "purchased", 10)]);
assert.equal(topBy(r, "visitors").funnelId, "a");
assert.equal(topBy(r, "sales").funnelId, "b");
assert.equal(topBy([{ funnelId: "x", visitors: 0, sales: 0 }], "sales"), null);
console.log("funnel-live ok");
