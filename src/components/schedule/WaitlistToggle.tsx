import { useState } from "react";
import { BellRing, Hourglass, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

/** Join/leave the waiting list. Everyone on it is notified when a slot opens. */
export function WaitlistToggle({ userId, joined, onChange }: { userId: string; joined: boolean; onChange: (v: boolean) => void }) {
  const [saving, setSaving] = useState(false);

  async function toggle() {
    setSaving(true);
    const { error } = joined
      ? await supabase.from("mentor_waitlist").delete().eq("user_id", userId)
      : await supabase.from("mentor_waitlist").insert({ user_id: userId });
    setSaving(false);
    if (error) return toast.error("Não foi possível atualizar a lista de espera.");
    onChange(!joined);
    toast.success(joined ? "Você saiu da lista de espera." : "Pronto! Avisaremos quando abrir um horário.");
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {joined ? <BellRing className="h-4 w-4" /> : <Hourglass className="h-4 w-4" />}
        </div>
        <div>
          <p className="text-sm font-semibold">{joined ? "Você está na lista de espera" : "Não achou um horário bom?"}</p>
          <p className="text-xs text-muted-foreground">
            {joined
              ? "Quando alguém cancelar ou o mentor liberar um horário, você recebe um aviso. Quem marcar primeiro fica com ele."
              : "Entre na lista de espera e receba um aviso quando abrir um horário."}
          </p>
        </div>
      </div>
      <Button size="sm" variant={joined ? "outline" : "default"} onClick={toggle} disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} {joined ? "Sair da lista" : "Entrar na lista de espera"}
      </Button>
    </div>
  );
}
