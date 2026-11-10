import assert from "node:assert/strict";
import {
  normalizeOfferLink,
  cleanOfferLinks,
  cleanOfferPrompts,
  readOfferLinks,
} from "../src/lib/offer-link.ts";

assert.equal(normalizeOfferLink("https://drive.google.com/x"), "https://drive.google.com/x");
assert.equal(normalizeOfferLink("  drive.google.com/abc "), "https://drive.google.com/abc");
assert.equal(normalizeOfferLink("javascript:alert(1)"), null);
assert.equal(normalizeOfferLink("ftp://site.com/a"), null);
assert.equal(normalizeOfferLink(""), null);
assert.equal(normalizeOfferLink("abc"), null);

// Multiple links, each with its own tag; empty rows dropped
assert.deepEqual(
  cleanOfferLinks([
    { label: " Drive ", url: "drive.google.com/a" },
    { label: "", url: "" },
    { label: "Página", url: "https://site.com/" },
  ]),
  {
    ok: true,
    links: [
      { label: "Drive", url: "https://drive.google.com/a" },
      { label: "Página", url: "https://site.com/" },
    ],
  },
);
// Tag without a valid URL is rejected with its row number
assert.deepEqual(cleanOfferLinks([{ label: "a", url: "https://x.com" }, { label: "b", url: "" }]), {
  ok: false,
  row: 2,
});

// Prompts without text are dropped
assert.deepEqual(
  cleanOfferPrompts([
    { title: " Copy ", text: " Escreva um anúncio " },
    { title: "Vazio", text: "   " },
  ]),
  [{ title: "Copy", text: "Escreva um anúncio" }],
);

// Stored unsafe links are never rendered; legacy single link still shows
assert.deepEqual(readOfferLinks([{ label: "x", url: "javascript:alert(1)" }]), []);
assert.deepEqual(readOfferLinks([], "https://old.com/a"), [{ label: "", url: "https://old.com/a" }]);

console.log("offer-link: ok");
