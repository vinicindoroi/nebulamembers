import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
    { id: "plan-free", name: "Free", slug: "free" },
    { id: "plan-pro", name: "Pro", slug: "pro" },
    { id: "plan-premium", name: "Premium", slug: "premium" },
  ];
}

/** List of plans configured in the admin (Planos page). */
export function usePlans() {
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchPlans().then((p) => {
      if (!alive) return;
      setPlans(p);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { plans, loading };
}
