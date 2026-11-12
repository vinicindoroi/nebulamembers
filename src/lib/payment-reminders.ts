/** Payment reminders for installment-paid mentorships. Pure helpers shared by admin and student screens. */

export type PaymentReminder = {
  id: string;
  user_id: string;
  label: string;
  amount: number | null;
  due_date: string; // YYYY-MM-DD
  note: string | null;
  paid_at: string | null;
  created_at?: string;
};

export type ReminderStatus = "paid" | "overdue" | "today" | "soon" | "upcoming";

/** Days before the due date when the reminder starts showing on the student's panel. */
export const STUDENT_NOTICE_DAYS = 5;
/** Days ahead the admin dashboard lists open reminders. */
export const ADMIN_NOTICE_DAYS = 7;

const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Whole days from `today` to `due` (both YYYY-MM-DD). Negative when overdue. */
export function daysUntil(due: string, today: string) {
  const a = Date.UTC(+due.slice(0, 4), +due.slice(5, 7) - 1, +due.slice(8, 10));
  const b = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
  return Math.round((a - b) / 86400000);
}

export function reminderStatus(r: Pick<PaymentReminder, "due_date" | "paid_at">, today: string, soonDays = STUDENT_NOTICE_DAYS): ReminderStatus {
  if (r.paid_at) return "paid";
  const d = daysUntil(r.due_date, today);
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d <= soonDays) return "soon";
  return "upcoming";
}

/** Same day `months` later, clamped to the last day of the target month (31 Jan + 1 → 28/29 Feb). */
export function addMonths(date: string, months: number) {
  const y = +date.slice(0, 4), m = +date.slice(5, 7) - 1, d = +date.slice(8, 10);
  const target = new Date(Date.UTC(y, m + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return `${target.getUTCFullYear()}-${pad(target.getUTCMonth() + 1)}-${pad(Math.min(d, last))}`;
}

/** Monthly installments "Parcela i/N" starting at `firstDue`. `startAt` lets the admin skip parcels already paid. */
export function buildInstallments(opts: { count: number; firstDue: string; amount: number | null; startAt?: number; note?: string | null }) {
  const count = Math.max(1, Math.min(60, Math.floor(opts.count)));
  const startAt = Math.max(1, Math.min(count, Math.floor(opts.startAt ?? 1)));
  const rows: Array<{ label: string; due_date: string; amount: number | null; note: string | null }> = [];
  for (let i = startAt; i <= count; i++) {
    rows.push({
      label: count === 1 ? "Pagamento" : `Parcela ${i}/${count}`,
      due_date: addMonths(opts.firstDue, i - startAt),
      amount: opts.amount,
      note: opts.note?.trim() || null,
    });
  }
  return rows;
}

/** Open reminders the student should see now: overdue, due today or within the notice window. */
export function studentVisibleReminders(list: PaymentReminder[], today: string) {
  return list
    .filter((r) => !r.paid_at && daysUntil(r.due_date, today) <= STUDENT_NOTICE_DAYS)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
}

/** Open reminders for the admin dashboard: overdue first, then due within ADMIN_NOTICE_DAYS. */
export function adminDueReminders(list: PaymentReminder[], today: string) {
  return list
    .filter((r) => !r.paid_at && daysUntil(r.due_date, today) <= ADMIN_NOTICE_DAYS)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
}

export function formatBRL(v: number | null | undefined) {
  if (v == null) return "";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDue(date: string) {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
}

export function dueLabel(r: Pick<PaymentReminder, "due_date" | "paid_at">, today: string) {
  if (r.paid_at) return "Pago";
  const d = daysUntil(r.due_date, today);
  if (d < 0) return d === -1 ? "Venceu ontem" : `Venceu há ${-d} dias`;
  if (d === 0) return "Vence hoje";
  if (d === 1) return "Vence amanhã";
  return `Vence em ${d} dias`;
}
