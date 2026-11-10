import assert from "node:assert/strict";
import { normalizeOfferLink } from "../src/lib/offer-link.ts";

assert.equal(normalizeOfferLink("https://drive.google.com/x"), "https://drive.google.com/x");
assert.equal(normalizeOfferLink("  drive.google.com/abc "), "https://drive.google.com/abc");
assert.equal(normalizeOfferLink("javascript:alert(1)"), null);
assert.equal(normalizeOfferLink("ftp://site.com/a"), null);
assert.equal(normalizeOfferLink(""), null);
assert.equal(normalizeOfferLink("abc"), null);
console.log("offer-link: ok");
