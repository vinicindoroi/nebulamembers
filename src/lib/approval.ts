/** Conta sem nível definido pelo admin (plano vazio, "pending" ou "pendente"). */
export function isPendingPlan(plan: string | null | undefined): boolean {
  const p = (plan ?? "").trim().toLowerCase();
  return p === "" || p === "pending" || p === "pendente";
}

/** Só admins passam sem aprovação; qualquer outra conta pendente vê apenas a tela de espera. */
export function isAwaitingApproval(plan: string | null | undefined, isAdmin: boolean): boolean {
  if (isAdmin) return false;
  return isPendingPlan(plan);
}
