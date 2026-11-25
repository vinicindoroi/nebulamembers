/**
 * Direção da troca de abas. Puro (sem DOM) para tests/route-transition.mjs.
 * A ordem segue o menu lateral: descer na lista (e ir para a direita na barra
 * mobile, que é uma subsequência) é "forward".
 */

export const MEMBER_NAV_ORDER = [
  "/dashboard",
  "/organizer",
  "/courses",
  "/offers",
  "/schedule",
  "/community",
  "/forum",
  "/saved",
  "/notes",
  "/funnels",
  "/funnel-tracker",
  "/uptime",
  "/pixel-feeder",
  "/gurufucker",
  "/transcript",
  "/profile",
  "/settings",
] as const;

export const ADMIN_NAV_ORDER = [
  "/admin/dashboard",
  "/admin/courses",
  "/admin/modules",
  "/admin/categories",
  "/admin/player",
  "/admin/community",
  "/admin/comments",
  "/admin/questions",
  "/admin/members",
  "/admin/schedule",
  "/admin/forms",
  "/admin/offers",
  "/admin/plans",
  "/admin/access",
  "/admin/sales",
  "/admin/coupons",
  "/admin/notifications",
  "/admin/settings",
  "/admin/logs",
] as const;

export type RouteMotion = "forward" | "back" | "rise" | "none";

/** Seção mais específica que contém o pathname, ou null. */
export function matchSection(pathname: string, sections: readonly string[]): string | null {
  let best: string | null = null;
  for (const section of sections) {
    if (pathname === section || pathname.startsWith(section + "/")) {
      if (!best || section.length > best.length) best = section;
    }
  }
  return best;
}

export function routeMotion(
  fromPath: string | undefined,
  toPath: string,
  sections: readonly string[],
): RouteMotion {
  if (!fromPath || fromPath === toPath) return fromPath ? "none" : "rise";
  const from = matchSection(fromPath, sections);
  const to = matchSection(toPath, sections);
  if (!from || !to || from === to) return "rise";
  const delta = sections.indexOf(to) - sections.indexOf(from);
  if (delta === 0) return "rise";
  return delta > 0 ? "forward" : "back";
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function sectionsFor(fromPath: string, toPath: string): readonly string[] | null {
  const fromAdmin = fromPath.startsWith("/admin");
  const toAdmin = toPath.startsWith("/admin");
  if (fromAdmin && toAdmin) return ADMIN_NAV_ORDER;
  if (!fromAdmin && !toAdmin) return MEMBER_NAV_ORDER;
  return null;
}

/**
 * Tipos da View Transitions API. `false` pula a transição
 * (hash, mesma rota, movimento reduzido).
 */
export function viewTransitionTypes(fromPath: string | undefined, toPath: string): string[] | false {
  if (prefersReducedMotion()) return false;
  if (!fromPath || fromPath === toPath) return false;
  const sections = sectionsFor(fromPath, toPath);
  const motion = sections ? routeMotion(fromPath, toPath, sections) : "rise";
  if (motion === "none") return false;
  return [`nav-${motion}`];
}
