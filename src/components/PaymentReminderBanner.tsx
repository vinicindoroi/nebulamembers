import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { dueLabel, formatBRL, formatDue, reminderStatus, studentVisibleReminders, ymd, type PaymentReminder } from "@/lib/payment-reminders";

/** Student panel: open installments that are overdue or due within the notice window. */
export function PaymentReminderBanner() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PaymentReminder[]>([]);
  const today = ymd(new Date());

  useEffect(() => {
    if (!user?.id) return;
    (supabase as any).from("payment_reminders").select("*").eq("user_id", user.id).is("paid_at", null).order("due_date")
      .then(({ data }: { data: PaymentReminder[] | null }) => setRows(studentVisibleReminders(data ?? [], today)));
  }, [user?.id]);

  if (!rows.length) return null;
  const anyOverdue = rows.some((r) => reminderStatus(r, today) === "overdue");

  return (
    <section className={`rounded-xl border p-4 ${anyOverdue ? "border-destructive/40 bg-destructive/5" : "border-primary/30 bg-primary/5"}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${anyOverdue ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
          <Wallet className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-sm font-medium">{rows.length === 1 ? "Lembrete de pagamento" : "Lembretes de pagamento"}</h2>
          <ul className="space-y-1.5">
            {rows.map((r) => {
              const late = reminderStatus(r, today) === "overdue";
              return (
                <li key={r.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                  <span className="font-medium">{r.label}</span>
                  {r.amount != null && <span className="tabular-nums">{formatBRL(r.amount)}</span>}
                  <span className="text-muted-foreground">· {formatDue(r.due_date)}</span>
                  <span className={`text-xs ${late ? "text-destructive" : "text-primary"}`}>{dueLabel(r, today)}</span>
                  {r.note && <span className="w-full text-xs text-muted-foreground">{r.note}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
