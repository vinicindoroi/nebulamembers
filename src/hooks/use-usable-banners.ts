import { useEffect, useMemo, useRef, useState } from "react";
import { usableBanners, type CourseBanner } from "@/lib/course-banners";

const EMPTY_URLS: Record<string, string> = {};

/**
 * Preloads each banner image and drops the ones that cannot be displayed,
 * so the catalog never shows an empty banner block.
 */
export function useUsableBanners(banners: CourseBanner[], urls: Record<string, string> = EMPTY_URLS) {
  const [broken, setBroken] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const urlsRef = useRef(urls);
  urlsRef.current = urls;
  const paths = useMemo(
    () =>
      banners
        .filter((b) => b.active)
        .map((b) => b.path)
        .join("|"),
    [banners],
  );

  useEffect(() => {
    const list = paths ? paths.split("|") : [];
    if (!list.length) {
      setBroken([]);
      setReady(true);
      return;
    }
    let alive = true;
    const failed: string[] = [];
    let pending = list.length;
    setReady(false);
    const finish = (path: string, ok: boolean) => {
      if (!alive) return;
      if (!ok) failed.push(path);
      pending -= 1;
      if (pending === 0) {
        setBroken(failed);
        setReady(true);
      }
    };
    list.forEach((path) => {
      const url = urlsRef.current[path];
      if (!url) {
        finish(path, false);
        return;
      }
      const image = new Image();
      image.onload = () => finish(path, true);
      image.onerror = () => finish(path, false);
      image.src = url;
    });
    return () => {
      alive = false;
    };
  }, [paths]);

  const usable = useMemo(() => usableBanners(banners, urls, broken), [banners, urls, broken]);
  const markBroken = (path: string) => setBroken((prev) => (prev.includes(path) ? prev : [...prev, path]));
  return { usable, ready, markBroken };
}
