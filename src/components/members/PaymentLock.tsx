import { useState } from "react";
import { Copy, Check, Lock, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDue, PIX_KEY, type PaymentReminder } from "@/lib/payment-reminders";

/** Full-screen lock shown to members with an installment due today or overdue. */
export function PaymentLock({ rows, checking, onRefresh, onSignOut }: { rows: PaymentReminder[]; checking: boolean; onRefresh: () => void; onSignOut: () => void }) {
  const [copied, setCopied] = useState(false);
  const total = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/15 text-destructive"><Lock className="h-5 w-5" /></div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Acesso pausado por pagamento pendente</h1>
          <p className="text-sm text-muted-foreground">Sua parcela venceu. Faça o Pix abaixo e envie o comprovante para liberar seu acesso.</p>
        </div>
        <ul className="divide-y divide-border rounded-xl border border-border text-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex justify-between gap-3 px-3 py-2">
              <span>{r.label} · {formatDue(r.due_date)}</span>
              {r.amount != null && <span className="tabular-nums font-medium">{formatBRL(r.amount)}</span>}
            </li>
          ))}
          {rows.length > 1 && total > 0 && (
            <li className="flex justify-between px-3 py-2 font-medium"><span>Total</span><span className="tabular-nums">{formatBRL(total)}</span></li>
          )}
        </ul>
        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground">Chave Pix</div>
          <button
            onClick={async () => { await navigator.clipboard.writeText(PIX_KEY); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm font-medium hover:bg-muted/70"
          >
            <span className="truncate">{PIX_KEY}</span>
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" variant="outline" onClick={onRefresh} disabled={checking}>
            <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} /> Verificar
          </Button>
          <Button variant="ghost" onClick={onSignOut}><LogOut className="h-4 w-4" /> Sair</Button>
        </div>
      </div>
    </div>
  );
}
