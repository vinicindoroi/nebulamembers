import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Updates the user's last_seen_at every 2 minutes while they're active.
 */
export function usePresence() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const update = () => {
      (supabase as any)
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", user.id)
        .then(() => {});
    };

    // Update immediately on mount
    update();

    // Then every 2 minutes
    const interval = setInterval(update, 120_000);

    return () => clearInterval(interval);
  }, [user]);
}
