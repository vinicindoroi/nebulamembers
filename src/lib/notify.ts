import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

/**
 * Cria uma notificação para um usuário específico.
 * Não notifica se o autor da ação é o mesmo dono do conteúdo.
 */
export async function notifyUser({
  recipientId,
  actorId,
  title,
  content,
}: {
  recipientId: string;
  actorId: string;
  title: string;
  content: string;
}) {
  // Não notificar a si mesmo
  if (recipientId === actorId) return;

  await db.from("notifications").insert({
    title,
    content,
    audience: "all",
    sent_at: new Date().toISOString(),
    recipient_id: recipientId,
  });
}
