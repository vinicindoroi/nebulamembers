import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type CourseWithProgress = {
  id: string;
  title: string;
  description: string | null;
  tag: string | null;
  cover_url: string | null;
  gradient_from: string | null;
  gradient_to: string | null;
  totalLessons: number;
  completedLessons: number;
  progress: number;
};

export function useCourses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["courses", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CourseWithProgress[]> => {
      const [coursesRes, lessonsRes, progressRes] = await Promise.all([
        supabase.from("courses").select("*").eq("status", "published").order("created_at"),
        supabase.from("lessons").select("id, course_id"),
        supabase.from("lesson_progress").select("lesson_id").eq("user_id", user!.id),
      ]);
      if (coursesRes.error) throw coursesRes.error;
      if (lessonsRes.error) throw lessonsRes.error;
      if (progressRes.error) throw progressRes.error;

      const completedSet = new Set((progressRes.data ?? []).map((p) => p.lesson_id));
      return (coursesRes.data ?? []).map((c) => {
        const lessons = (lessonsRes.data ?? []).filter((l) => l.course_id === c.id);
        const completed = lessons.filter((l) => completedSet.has(l.id)).length;
        const total = lessons.length || 1;
        return {
          id: c.id,
          title: c.title,
          description: c.description,
          tag: c.tag,
          cover_url: c.cover_url ?? null,
          gradient_from: c.gradient_from ?? null,
          gradient_to: c.gradient_to ?? null,
          totalLessons: lessons.length,
          completedLessons: completed,
          progress: Math.round((completed / total) * 100),
        };
      });
    },
  });
}