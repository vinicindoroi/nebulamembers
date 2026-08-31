import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/funnels")({
  beforeLoad: () => { throw redirect({ to: "/dashboard" }); },
  component: () => null,
});
