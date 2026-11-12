import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/members/AppShell";
import { PendingApproval } from "@/components/members/PendingApproval";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import { isAwaitingApproval, isPendingPlan } from "@/lib/approval";

export const Route = createFileRoute("/_app")({
  component: AppGate,
});

function AppGate() {
  const { session, user, loading, signOut } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  const planQuery = useQuery({
    queryKey: ["my-approval-plan", user?.id ?? null],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("plan").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return (data?.plan as string | null | undefined) ?? null;
    },
    // Enquanto pendente, confere a cada 20s para liberar sozinho quando o admin aprovar.
    refetchInterval: (q) => (isPendingPlan(q.state.data as string | null | undefined) ? 20_000 : false),
    refetchOnWindowFocus: true,
  });

  const planReady = planQuery.isSuccess || planQuery.isError;
  if (loading || !session || adminLoading || (!isAdmin && !planReady)) {
    return <LoadingScreen />;
  }

  if (isAwaitingApproval(planQuery.isError ? null : planQuery.data, !!isAdmin)) {
    return (
      <PendingApproval
        email={user?.email ?? ""}
        checking={planQuery.isFetching}
        onRefresh={() => void planQuery.refetch()}
        onSignOut={async () => {
          await queryClient.cancelQueries();
          queryClient.clear();
          await signOut();
          navigate({ to: "/login", replace: true });
        }}
      />
    );
  }

  return <AppShell />;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-[0_0_32px_oklch(0.65_0.22_290/0.4)]">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <div className="absolute inset-0 rounded-2xl gradient-primary blur-xl opacity-40 animate-pulse" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground mt-1">Carregando...</span>
      </div>
    </div>
  );
}
