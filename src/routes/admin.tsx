import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin")({ component: AdminGate });

function AdminGate() {
  const { session, loading: authLoading } = useAuth();
  const { isAdmin, loading } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!session) navigate({ to: "/login" });
    else if (isAdmin === false) navigate({ to: "/dashboard" });
  }, [authLoading, session, isAdmin, navigate]);

  if (loading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Verificando permissões...</div>;
  }
  return <AdminShell />;
}