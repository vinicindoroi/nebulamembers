// Helpers do fluxo "esqueci minha senha".
// Mantidos separados para que login e a página de recuperação usem exatamente o mesmo link.

export function resetRedirectUrl(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/reset-password`;
}

export function isRecoveryHash(hash: string): boolean {
  return /(?:^|[#&])type=recovery(?:&|$)/.test(hash || "");
}
