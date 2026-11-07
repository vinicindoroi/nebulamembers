import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
fs.mkdirSync("test-results", { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  serviceWorkers: "allow",
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
try {
  await page.goto((process.env.MOBILE_BASE_URL || "http://127.0.0.1:4173") + "/offline.html");
  const manifest = await page.evaluate(async () => fetch("/manifest.json").then((r) => r.json()));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.orientation, "any");
  for (const icon of manifest.icons) {
    const dimensions = await page.evaluate(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return `${img.naturalWidth}x${img.naturalHeight}`;
    }, icon.src);
    assert.equal(dimensions, icon.sizes);
  }
  await page.evaluate(async () => {
    await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.goto((process.env.MOBILE_BASE_URL || "http://127.0.0.1:4173") + "/dashboard");
  await page.getByRole("heading", { name: "Você está sem conexão" }).waitFor();
  const paths = await page.evaluate(async () => {
    const cache = await caches.open("nebula-static-v3");
    return (await cache.keys()).map((r) => new URL(r.url).pathname);
  });
  assert.ok(paths.includes("/offline.html"));
  assert.ok(!paths.includes("/dashboard"));
  assert.ok(!paths.some((p) => p.includes("/api/")));
  const apiFailed = await page.evaluate(async () => {
    try {
      await fetch("/api/private");
      return false;
    } catch {
      return true;
    }
  });
  assert.ok(apiFailed);
  await page.screenshot({ path: "test-results/pwa-offline.png" });
  await context.setOffline(false);
  console.log(
    "PWA: manifest, dimensões dos ícones, service worker, fallback offline e ausência de cache de páginas privadas/API passaram.",
  );
} finally {
  await browser.close();
}
