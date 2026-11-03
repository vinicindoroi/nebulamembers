import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lessonCountsByMember, type LessonCounts } from "@/lib/member-lessons";

/** Aulas concluídas por aluno, para as telas administrativas (Membros e Agendamento). */
export function useMemberLessons() {
  const [counts, setCounts] = useState<LessonCounts>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("lesson_progress")
      .select("user_id,lesson_id");
    setLoading(false);
    if (error) return;
    setCounts(lessonCountsByMember((data ?? []) as { user_id: string; lesson_id: string }[]));
  }, []);

  useEffect(() => {
    void reload();
    const refresh = () => { void reload(); };
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, [reload]);

  return { counts, loading, reload };
}
