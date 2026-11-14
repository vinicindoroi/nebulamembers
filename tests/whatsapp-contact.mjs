import assert from "node:assert/strict";
import { waLink, hasWhatsapp } from "../src/lib/whatsapp.ts";

// Só mostra o contato de WhatsApp quando o número cadastrado tem dígitos suficientes.
assert.equal(hasWhatsapp(null), false);
assert.equal(hasWhatsapp(undefined), false);
assert.equal(hasWhatsapp(""), false);
assert.equal(hasWhatsapp("   "), false);
assert.equal(hasWhatsapp("123"), false);
assert.equal(hasWhatsapp("11 3333-4444"), true);
assert.equal(hasWhatsapp("(11) 99999-8888"), true);
assert.equal(hasWhatsapp("+55 11 99999-8888"), true);

// O link abre a conversa com o código do Brasil quando ele falta.
assert.equal(waLink("(11) 99999-8888"), "https://wa.me/5511999998888");
assert.equal(waLink("5511999998888"), "https://wa.me/5511999998888");
assert.equal(waLink("+55 11 99999-8888"), "https://wa.me/5511999998888");

console.log("whatsapp-contact: ok");
