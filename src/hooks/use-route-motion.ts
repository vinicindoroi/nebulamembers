import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { routeMotion, type RouteMotion } from "@/lib/route-transition";

/**
 * Direção da navegação que trouxe a rota atual.
 * "none" só no primeiro paint, para a hidratação não animar.
 * O valor fica até a próxima troca, senão o fade-up da página recomeça no meio da transição.
 */
export function useRouteMotion(sections: readonly string[]): RouteMotion {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [tracked, setTracked] = useState<{ path: string; motion: RouteMotion }>(() => ({
    path,
    motion: "none",
  }));

  if (tracked.path !== path) {
    setTracked({ path, motion: routeMotion(tracked.path, path, sections) });
  }

  return tracked.path === path ? tracked.motion : "none";
}
