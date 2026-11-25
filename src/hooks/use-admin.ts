import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export function useAdmin() {
  const { user, loading } = useAuth();
  const roleQuery = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !loading && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  const isAdmin = !user ? false : roleQuery.data ?? (roleQuery.isError ? false : null);
  return { isAdmin, loading: loading || (!!user && roleQuery.isPending), user };
}