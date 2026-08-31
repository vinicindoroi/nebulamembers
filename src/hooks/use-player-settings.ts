import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlayerSettings = {
  id: string;
  accent_color: string;
  controls_bg: string;
  progress_color: string;
  logo_url: string | null;
  watermark_enabled: boolean;
  watermark_text: string | null;
  watermark_position: string;
  watermark_opacity: number;
  block_right_click: boolean;
  block_download: boolean;
  block_devtools: boolean;
  speed_control: boolean;
  bookmarks_enabled: boolean;
  notes_enabled: boolean;
  autoplay_next: boolean;
  resume_playback: boolean;
};

const SETTINGS_ID = "00000000-0000-4000-8000-000000000001";

// Use type-cast to bypass generated types that haven't been regenerated after migrations
const db = supabase as any;

const DEFAULT_SETTINGS: PlayerSettings = {
  id: SETTINGS_ID,
  accent_color: "#8b5cf6",
  controls_bg: "rgba(0,0,0,0.8)",
  progress_color: "#8b5cf6",
  logo_url: null,
  watermark_enabled: false,
  watermark_text: null,
  watermark_position: "top-right",
  watermark_opacity: 0.5,
  block_right_click: false,
  block_download: false,
  block_devtools: false,
  speed_control: true,
  bookmarks_enabled: true,
  notes_enabled: false,
  autoplay_next: true,
  resume_playback: true,
};

export function usePlayerSettings() {
  return useQuery({
    queryKey: ["player-settings"],
    queryFn: async (): Promise<PlayerSettings> => {
      const { data, error } = await db
        .from("player_settings")
        .select("*")
        .eq("id", SETTINGS_ID)
        .maybeSingle();
      if (error) throw error;
      return (data as PlayerSettings) ?? DEFAULT_SETTINGS;
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: DEFAULT_SETTINGS,
  });
}

export function useUpdatePlayerSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<PlayerSettings, "id">>) => {
      const { error } = await db
        .from("player_settings")
        .update(patch)
        .eq("id", SETTINGS_ID);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["player-settings"] });
    },
  });
}

export type VideoProgress = {
  user_id: string;
  lesson_id: string;
  current_time: number;
  duration: number | null;
  playback_rate: number;
};

export function useVideoProgress(lessonId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["video-progress", lessonId, userId],
    enabled: !!lessonId && !!userId,
    queryFn: async (): Promise<VideoProgress | null> => {
      const { data, error } = await db
        .from("lesson_video_progress")
        .select("*")
        .eq("user_id", userId!)
        .eq("lesson_id", lessonId!)
        .maybeSingle();
      if (error) throw error;
      return data as VideoProgress | null;
    },
    staleTime: 0,
  });
}

export function useSaveVideoProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { userId: string; lessonId: string; currentTime: number; duration?: number; playbackRate?: number }) => {
      const { error } = await db
        .from("lesson_video_progress")
        .upsert({
          user_id: params.userId,
          lesson_id: params.lessonId,
          current_time: params.currentTime,
          duration: params.duration ?? null,
          playback_rate: params.playbackRate ?? 1.0,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,lesson_id" });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["video-progress", vars.lessonId, vars.userId] });
    },
  });
}

export type Bookmark = {
  id: string;
  user_id: string;
  lesson_id: string;
  time_seconds: number;
  label: string | null;
  created_at: string;
};

export function useBookmarks(lessonId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["bookmarks", lessonId, userId],
    enabled: !!lessonId && !!userId,
    queryFn: async (): Promise<Bookmark[]> => {
      const { data, error } = await db
        .from("lesson_bookmarks")
        .select("*")
        .eq("user_id", userId!)
        .eq("lesson_id", lessonId!)
        .order("time_seconds");
      if (error) throw error;
      return (data ?? []) as Bookmark[];
    },
  });
}

export function useAddBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { userId: string; lessonId: string; timeSeconds: number; label?: string }) => {
      const { error } = await db
        .from("lesson_bookmarks")
        .insert({
          user_id: params.userId,
          lesson_id: params.lessonId,
          time_seconds: params.timeSeconds,
          label: params.label ?? null,
        });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["bookmarks", vars.lessonId, vars.userId] });
    },
  });
}

export function useRemoveBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; lessonId: string; userId: string }) => {
      const { error } = await db
        .from("lesson_bookmarks")
        .delete()
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["bookmarks", vars.lessonId, vars.userId] });
    },
  });
}
