import assert from "node:assert/strict";
import { isAwaitingApproval, isPendingPlan } from "../src/lib/approval.ts";

// Conta nova (plano "pending") sem aprovação vê só a tela de espera.
assert.equal(isAwaitingApproval("pending", false), true);
assert.equal(isAwaitingApproval("", false), true);
assert.equal(isAwaitingApproval(null, false), true);
assert.equal(isAwaitingApproval("Pendente", false), true);
// Com nível definido pelo admin, entra normalmente.
assert.equal(isAwaitingApproval("Free", false), false);
assert.equal(isAwaitingApproval("Individual", false), false);
// Admin nunca fica preso na tela de espera.
assert.equal(isAwaitingApproval("pending", true), false);
assert.equal(isPendingPlan(" PENDING "), true);
console.log("approval: ok");
