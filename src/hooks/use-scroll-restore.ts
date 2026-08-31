import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

const positions: Record<string, number> = {};

export function useScrollRestore(containerRef: React.RefObject<HTMLElement | null>) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const saved = positions[path];
    el.scrollTop = saved ?? 0;

    return () => {
      positions[path] = el.scrollTop;
    };
  }, [path, containerRef]);
}
