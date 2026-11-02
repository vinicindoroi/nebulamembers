import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SNOOZE_KEY = "nebula:whatsapp-snooze";

export function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

export function WhatsappPrompt() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const snooze = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    if (snooze > Date.now()) return;
    supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data && onlyDigits(data.phone ?? "").length < 10) setOpen(true);
    });
  }, [user?.id]);

  async function save() {
    const digits = onlyDigits(value);
    if (digits.length < 10 || digits.length > 15) return toast.error("Digite um WhatsApp válido com DDD.");
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ phone: value.trim() }).eq("id", user!.id);
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar.");
    toast.success("WhatsApp salvo!");
    setOpen(false);
  }

  function later() {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + 24 * 3600_000));
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : later())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MessageCircle className="h-5 w-5" />
          </div>
          <DialogTitle>Cadastre seu WhatsApp</DialogTitle>
          <DialogDescription>Assim conseguimos manter contato com você sobre calls, avisos e novidades.</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          inputMode="tel"
          placeholder="(11) 99999-9999"
          value={value}
          maxLength={20}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={later}>Agora não</Button>
          <Button onClick={save} disabled={saving}>Salvar WhatsApp</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
