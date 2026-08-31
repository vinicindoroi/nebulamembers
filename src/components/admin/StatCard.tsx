import { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";

export function StatCard({ label, value, delta, icon: Icon }: { label: string; value: string; delta?: number; icon: LucideIcon }) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Icon className="h-4 w-4" /></div>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
      {delta !== undefined && (
        <div className={`mt-1 inline-flex items-center gap-1 text-[11px] ${positive ? "text-emerald-400" : "text-red-400"}`}>
          {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          {Math.abs(delta).toFixed(1)}% vs mês anterior
        </div>
      )}
    </div>
  );
}