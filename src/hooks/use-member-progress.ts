import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  weekDays: { date: string; active: boolean }[];
  todayDone: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji
  unlocked: boolean;
  progress?: number; // 0-100
  target?: number;
  current?: number;
}

export interface LastLesson {
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  moduleName: string | null;
  completedAt: string;
  position: number;
  totalLessons: number;
}

/**
 * Hook that computes streak, achievements, and last lesson from lesson_progress
 */
export function useMemberProgress() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["member-progress", user?.id],
    enabled: !!user,
    staleTime: 1000 * 30,
    queryFn: async () => {
      const db = supabase as any;

      // Fetch all progress for this user with lesson + course info
      const { data: progress, error: progressError } = await db
        .from("lesson_progress")
        .select("lesson_id, completed_at, lessons(id, title, position, course_id, module_id, duration_min, courses(id, title, status), modules(id, title))")
        .eq("user_id", user!.id)
        .order("completed_at", { ascending: false });

      if (progressError) throw progressError;

      const items = ((progress ?? []) as any[]).filter(
        (i) => !i.lessons?.courses || i.lessons.courses.status === "published"
      );

      // --- STREAK CALCULATION ---
      const streak = computeStreak(items);

      // --- ACHIEVEMENTS ---
      const achievements = computeAchievements(items, streak);

      // --- LAST LESSON ---
      const lastLesson = computeLastLesson(items);

      return { streak, achievements, lastLesson };
    },
  });
}

function computeStreak(items: any[]): StreakData {
  // Get unique dates (YYYY-MM-DD) when user completed lessons
  const datesSet = new Set<string>();
  items.forEach((item) => {
    if (item.completed_at) {
      const d = new Date(item.completed_at);
      datesSet.add(d.toISOString().split("T")[0]);
    }
  });

  const sortedDates = Array.from(datesSet).sort().reverse(); // most recent first
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Current streak
  let currentStreak = 0;
  let checkDate = today;

  // If today has activity, start counting from today
  // If not, check if yesterday had activity (streak still alive)
  if (datesSet.has(today)) {
    currentStreak = 1;
    checkDate = yesterday;
  } else if (datesSet.has(yesterday)) {
    currentStreak = 1;
    checkDate = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];
  } else {
    currentStreak = 0;
  }

  if (currentStreak > 0) {
    let d = new Date(checkDate);
    while (datesSet.has(d.toISOString().split("T")[0])) {
      currentStreak++;
      d = new Date(d.getTime() - 86400000);
    }
  }

  // Longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  const allDatesAsc = Array.from(datesSet).sort();
  for (let i = 0; i < allDatesAsc.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prev = new Date(allDatesAsc[i - 1]);
      const curr = new Date(allDatesAsc[i]);
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      if (diff === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  // Week days (last 7 days)
  const weekDays: { date: string; active: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().split("T")[0];
    weekDays.push({ date: dateStr, active: datesSet.has(dateStr) });
  }

  return {
    currentStreak,
    longestStreak,
    weekDays,
    todayDone: datesSet.has(today),
  };
}

function computeAchievements(items: any[], streak: StreakData): Achievement[] {
  const totalCompleted = items.length;
  const uniqueCourses = new Set(items.map((i) => i.lessons?.course_id).filter(Boolean));
  const coursesCompleted = uniqueCourses.size; // simplified — courses with at least 1 lesson done

  // Count fully completed courses (all lessons done)
  // For now we approximate with courses that have progress
  const achievements: Achievement[] = [
    {
      id: "first_lesson",
      title: "Primeiro Passo",
      description: "Complete sua primeira aula",
      icon: "🎯",
      unlocked: totalCompleted >= 1,
      current: Math.min(totalCompleted, 1),
      target: 1,
      progress: totalCompleted >= 1 ? 100 : 0,
    },
    {
      id: "five_lessons",
      title: "Dedicado",
      description: "Complete 5 aulas",
      icon: "📚",
      unlocked: totalCompleted >= 5,
      current: Math.min(totalCompleted, 5),
      target: 5,
      progress: Math.min(100, Math.round((totalCompleted / 5) * 100)),
    },
    {
      id: "twenty_lessons",
      title: "Estudante Avançado",
      description: "Complete 20 aulas",
      icon: "🚀",
      unlocked: totalCompleted >= 20,
      current: Math.min(totalCompleted, 20),
      target: 20,
      progress: Math.min(100, Math.round((totalCompleted / 20) * 100)),
    },
    {
      id: "streak_3",
      title: "Consistente",
      description: "Mantenha um streak de 3 dias",
      icon: "🔥",
      unlocked: streak.longestStreak >= 3,
      current: Math.min(streak.currentStreak, 3),
      target: 3,
      progress: Math.min(100, Math.round((streak.currentStreak / 3) * 100)),
    },
    {
      id: "streak_7",
      title: "Imparável",
      description: "Mantenha um streak de 7 dias",
      icon: "⚡",
      unlocked: streak.longestStreak >= 7,
      current: Math.min(streak.currentStreak, 7),
      target: 7,
      progress: Math.min(100, Math.round((streak.currentStreak / 7) * 100)),
    },
    {
      id: "explorer",
      title: "Explorador",
      description: "Estude em 3 cursos diferentes",
      icon: "🧭",
      unlocked: coursesCompleted >= 3,
      current: Math.min(coursesCompleted, 3),
      target: 3,
      progress: Math.min(100, Math.round((coursesCompleted / 3) * 100)),
    },
  ];

  return achievements;
}

function computeLastLesson(items: any[]): LastLesson | null {
  if (items.length === 0) return null;

  // items are already sorted by completed_at desc
  const last = items[0];
  const lesson = last.lessons;
  if (!lesson) return null;

  return {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    courseId: lesson.courses?.id ?? lesson.course_id,
    courseTitle: lesson.courses?.title ?? "Curso",
    moduleName: lesson.modules?.title ?? null,
    completedAt: last.completed_at,
    position: lesson.position,
    totalLessons: 0, // will be enriched in the dashboard
  };
}
