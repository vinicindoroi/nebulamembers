// Mensagens de erro de autenticação em português.
const MAP: Array<[RegExp, string]> = [
  [/known to be weak/i, "Essa senha é muito fraca ou já vazou em outros sites. Escolha uma senha diferente."],
  [/password should be at least/i, "A senha deve ter pelo menos 6 caracteres."],
  [/invalid login credentials/i, "E-mail ou senha incorretos."],
  [/user already registered/i, "Este e-mail já possui conta. Faça login."],
  [/email rate limit|over_email_send_rate/i, "Muitas tentativas. Aguarde alguns minutos e tente de novo."],
  [/unable to validate email|invalid email/i, "E-mail inválido."],
  [/rate limit/i, "Muitas tentativas. Aguarde alguns minutos e tente de novo."],
  [/auth session missing|not found|invalid recovery/i, "Esse link de recuperação expirou ou já foi usado. Solicite um novo."],
];

export function friendlyAuthError(err: unknown): string {
  const raw = String((err as { message?: string } | null)?.message || "");
  return MAP.find(([re]) => re.test(raw))?.[1] || raw || "Erro ao autenticar";
}
