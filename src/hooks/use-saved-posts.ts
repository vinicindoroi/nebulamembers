import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const db = supabase as any;

export function useSavedPosts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["saved-posts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("saved_posts")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; user_id: string; post_id: string; post_type: string; created_at: string }>;
    },
  });
}

export function useToggleSave() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, postType, saved }: { postId: string; postType: "community" | "forum"; saved: boolean }) => {
      if (!user) throw new Error("Não autenticado");
      if (saved) {
        const { error } = await db.from("saved_posts").delete().eq("user_id", user.id).eq("post_id", postId);
        if (error) throw error;
      } else {
        const { error } = await db.from("saved_posts").insert({ user_id: user.id, post_id: postId, post_type: postType });
        if (error) throw error;
      }
      return { saved };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["saved-posts"] });
      toast.success(variables.saved ? "Removido dos salvos" : "Post salvo");
    },
    onError: (e: any) => {
      toast.error(e.message || "Erro ao salvar post");
    },
  });
}
