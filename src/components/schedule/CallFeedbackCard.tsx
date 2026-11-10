import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "./StarRating";

const LABELS = ["", "Ruim", "Fraca", "Boa", "Muito boa", "Excelente"];

/** Post-call survey: 1–5 stars plus an optional comment, sent with the student's name. */
export function CallFeedbackCard({ bookingId, userId, label, onDone }: { bookingId: string; userId: string; label: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  async function send() {
    if (!rating) return toast.error("Escolha uma nota de 1 a 5.");
    setSaving(true);
    const { error } = await supabase.from("mentor_call_feedback").insert({
      booking_id: bookingId, user_id: userId, rating, comment: comment.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error("Não foi possível enviar sua avaliação.");
    toast.success("Obrigado pela avaliação!");
    onDone();
  }

  return (
    <section className="relative space-y-4 rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6">
      <button type="button" onClick={() => setHidden(true)} className="absolute right-3 top-3 rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Avaliar depois">
        <X className="h-4 w-4" />
      </button>
      <div>
        <h2 className="font-semibold">Como foi sua call de {label}?</h2>
        <p className="text-sm text-muted-foreground">Sua nota ajuda o mentor a melhorar as próximas calls.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <StarRating value={rating} onChange={setRating} size="lg" />
        {rating > 0 && <span className="text-sm font-medium text-primary">{LABELS[rating]}</span>}
      </div>
      {rating > 0 && (
        <>
          <Textarea rows={2} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Quer deixar um comentário? (opcional)" />
          <Button onClick={send} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Enviar avaliação</Button>
        </>
      )}
    </section>
  );
}
