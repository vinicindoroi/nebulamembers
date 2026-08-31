import { supabase } from "@/integrations/supabase/client";

export const LESSON_VIDEOS_BUCKET = "lesson-videos";
export const LESSON_ATTACHMENTS_BUCKET = "lesson-attachments";

export async function getSignedVideoUrl(path: string, expiresIn = 60 * 60 * 2) {
  const { data, error } = await supabase.storage
    .from(LESSON_VIDEOS_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadLessonVideo(
  file: File,
  opts?: { onProgress?: (pct: number) => void }
) {
  const ext = file.name.split(".").pop() || "mp4";
  const path = `videos/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(LESSON_VIDEOS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
  if (error) throw error;
  opts?.onProgress?.(100);
  return path;
}

export async function uploadLessonPoster(file: File) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `posters/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(LESSON_VIDEOS_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type || undefined });
  if (error) throw error;
  const { data } = await supabase.storage.from(LESSON_VIDEOS_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? path;
}

export async function removeStoragePath(path: string) {
  if (!path) return;
  await supabase.storage.from(LESSON_VIDEOS_BUCKET).remove([path]);
}

export function isStoragePath(value: string | null | undefined) {
  if (!value) return false;
  return !/^https?:\/\//i.test(value);
}

// ─── Attachments ────────────────────────────────────────────────────────────

const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024; // 50MB

export async function uploadAttachment(
  file: File,
  onProgress?: (pct: number) => void
) {
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error("Arquivo excede o limite de 50MB");
  }
  const ext = file.name.split(".").pop() || "bin";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(LESSON_ATTACHMENTS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });
  if (error) throw error;
  onProgress?.(100);
  return path;
}

export async function getAttachmentDownloadUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(LESSON_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, 60 * 60); // 1h
  if (error) throw error;
  return data.signedUrl;
}

export async function removeAttachment(path: string) {
  if (!path) return;
  await supabase.storage.from(LESSON_ATTACHMENTS_BUCKET).remove([path]);
}
