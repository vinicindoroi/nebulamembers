export type CourseBanner = { id: string; path: string; label: string; courseId: string; active: boolean };
export type CourseBannerConfig = { intervalSeconds: number; banners: CourseBanner[] };
export const defaultBannerConfig: CourseBannerConfig = { intervalSeconds: 5, banners: [] };
export function normalizeBannerConfig(value: unknown): CourseBannerConfig {
  if (!value || typeof value !== "object") return defaultBannerConfig;
  const config = value as Partial<CourseBannerConfig>;
  return {
    intervalSeconds: Math.min(300, Math.max(1, Number(config.intervalSeconds) || 5)),
    banners: Array.isArray(config.banners) ? config.banners.filter((b) => b && typeof b.id === "string" && typeof b.path === "string").map((b) => ({ ...b, label: b.label || "Banner", courseId: b.courseId || "", active: b.active !== false })) : [],
  };
}
export function nextBannerIndex(current: number, count: number) { return count > 0 ? (current + 1) % count : 0; }