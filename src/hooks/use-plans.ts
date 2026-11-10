import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type PlanFeatureFlags = {
  courses_access?: boolean;
  community_access?: boolean;
  forum_access?: boolean;
  organizer_access?: boolean;
  notes_access?: boolean;
  funnels_access?: boolean;
  [key: string]: unknown;
};

export type PlanOption = {
  id: string;
  name: string;
  slug: string;
  /** Hierarquia: níveis maiores herdam acesso dos menores. */
  level?: number;
  features?: PlanFeatureFlags;
};

export const PENDING_PLAN = "pending";

export const NO_ACCESS_FEATURES: PlanFeatureFlags = {
  courses_access: false,
  community_access: false,
  forum_access: false,
  organizer_access: false,
  notes_access: false,
  funnels_access: false,
};

export const FULL_ACCESS_FEATURES: PlanFeatureFlags = {
  courses_access: true,
  community_access: true,
  forum_access: true,
  organizer_access: true,
  notes_access: true,
  funnels_access: true,
};


export function isPendingPlan(plan: string | null | undefined) {
  const p = (plan ?? "").trim().toLowerCase();
  return p === "" || p === "pending" || p === "pendente";
}

export async function fetchPlans(): Promise<PlanOption[]> {
  try {
    const { data } = await (supabase.from("app_settings" as any) as any)
      .select("value")
      .eq("key", "plans_config")
      .maybeSingle();
    const value = (data as any)?.value;
    if (Array.isArray(value) && value.length > 0) return value as PlanOption[];
  } catch {
    /* ignore */
  }
  return [
    { id: "plan-free", name: "Free", slug: "free", features: FULL_ACCESS_FEATURES },
    { id: "plan-pro", name: "Pro", slug: "pro", features: FULL_ACCESS_FEATURES },
    { id: "plan-premium", name: "Premium", slug: "premium", features: FULL_ACCESS_FEATURES },
  ];
}

/** List of plans configured in the admin (Planos page). */
export function usePlans() {
  const { user } = useAuth();
  // Cached and shared: opening a form no longer waits for a fresh plans request.
  const { data, isPending } = useQuery({
    queryKey: ["plans-config", user?.id ?? null],
    queryFn: fetchPlans,
    staleTime: 30_000,
  });
  return { plans: data ?? EMPTY_PLANS, loading: isPending };
}
const EMPTY_PLANS: PlanOption[] = [];
