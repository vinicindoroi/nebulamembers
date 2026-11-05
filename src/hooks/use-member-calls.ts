import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { callCountsByMember, type CallCounts } from "@/lib/member-calls";

/** Calls já realizadas por aluno, para as telas administrativas (Membros e Agendamento). */
export function useMemberCalls() {
  const [counts, setCounts] = useState<CallCounts>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data, error } = await supabase
      .from("mentor_bookings")
      .select("user_id,status");
    setLoading(false);
    if (error) return;
    setCounts(callCountsByMember((data ?? []) as { user_id: string; status: string }[]));
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
