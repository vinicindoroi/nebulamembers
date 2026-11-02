import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeBannerConfig } from "@/lib/course-banners";

export const courseBannerQueryKey = ["course-banners"];
export function useCourseBanners() {
  return useQuery({
    queryKey: courseBannerQueryKey,
    staleTime: 60000,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("value").eq("key", "course_banners").maybeSingle();
      if (error) throw error;
      const config = normalizeBannerConfig(data?.value);
      const paths = config.banners.map((b) => b.path);
      const signed = paths.length ? await supabase.storage.from("course-banners").createSignedUrls(paths, 3600) : null;
      if (signed?.error) throw signed.error;
      const urls = Object.fromEntries((signed?.data ?? []).map((image) => [image.path, image.signedUrl]));
      return { config, urls };
    },
  });
}