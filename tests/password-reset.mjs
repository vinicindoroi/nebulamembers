import assert from "node:assert/strict";
import { isRecoveryHash, resetRedirectUrl } from "../src/lib/password-reset.ts";
import { friendlyAuthError } from "../src/lib/auth-errors.ts";

// Para onde o link de recuperação leva o aluno
assert.equal(resetRedirectUrl("https://nebulamembers.online"), "https://nebulamembers.online/reset-password");
assert.equal(resetRedirectUrl("https://nebulamembers.online/"), "https://nebulamembers.online/reset-password");
assert.equal(resetRedirectUrl("http://localhost:8080"), "http://localhost:8080/reset-password");

// O link que a Utmify/Supabase abre traz type=recovery no hash
assert.equal(isRecoveryHash("#access_token=abc&token_type=bearer&type=recovery"), true);
assert.equal(isRecoveryHash("#type=recovery&access_token=abc"), true);
assert.equal(isRecoveryHash(""), false);
assert.equal(isRecoveryHash("#access_token=abc&token_type=bearer"), false);
assert.equal(isRecoveryHash("#type=signup"), false);

// Erros de senha traduzidos
assert.equal(friendlyAuthError(new Error("Password is known to be weak and should not be used")), "Essa senha é muito fraca ou já vazou em outros sites. Escolha uma senha diferente.");
assert.equal(friendlyAuthError(new Error("Invalid login credentials")), "E-mail ou senha incorretos.");
assert.match(friendlyAuthError(new Error("Email rate limit exceeded")), /Muitas tentativas/);
assert.equal(friendlyAuthError(null), "Erro ao autenticar");

console.log("password-reset: ok");
