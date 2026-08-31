import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const db = supabase as any;

// XP rewards per action
export const XP_REWARDS = {
  complete_lesson: 10,
  comment: 5,
  forum_reply: 5,
  forum_post: 8,
  like: 2,
  streak_day: 3,
} as const;

// Level thresholds
export function getLevel(xp: number): { level: number; title: string; currentXp: number; nextLevelXp: number } {
  const levels = [
    { min: 0, title: "Iniciante" },
    { min: 50, title: "Aprendiz" },
    { min: 150, title: "Estudante" },
    { min: 350, title: "Dedicado" },
    { min: 600, title: "Avançado" },
    { min: 1000, title: "Expert" },
    { min: 1500, title: "Mestre" },
    { min: 2500, title: "Lenda" },
  ];

  let current = levels[0];
  let next = levels[1];

  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].min) {
      current = levels[i];
      next = levels[i + 1] ?? { min: levels[i].min + 1000, title: "Max" };
      break;
    }
  }

  const level = levels.indexOf(current) + 1;
  return {
    level,
    title: current.title,
    currentXp: xp - current.min,
    nextLevelXp: next.min - current.min,
  };
}

export function useXp() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-xp", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db
        .from("profiles")
        .select("xp")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.xp ?? 0) as number;
    },
    staleTime: 1000 * 10,
  });
}

export function useAddXp() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (action: keyof typeof XP_REWARDS) => {
      if (!user) return;
      const amount = XP_REWARDS[action];

      // Get current XP
      const { data: profile } = await db
        .from("profiles")
        .select("xp")
        .eq("id", user.id)
        .maybeSingle();

      const currentXp = profile?.xp ?? 0;
      const newXp = currentXp + amount;

      const { error } = await db
        .from("profiles")
        .update({ xp: newXp })
        .eq("id", user.id);

      if (error) throw error;
      return { newXp, amount, action };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-xp"] });
    },
  });
}
