import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/respostas")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/forms" });
  },
});
