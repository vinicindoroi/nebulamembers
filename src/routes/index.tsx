import { createFileRoute } from "@tanstack/react-router";
import { AuthCard, type AuthMode } from "@/components/auth/AuthCard";

type LoginSearch = {
  mode?: AuthMode;
};

const MODES: AuthMode[] = ["signin", "signup", "forgot"];

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    return {
      mode: MODES.includes(search.mode as AuthMode) ? (search.mode as AuthMode) : undefined,
    };
  },
  component: LoginPage,
  head: () => ({ meta: [
    { title: "Acesso à plataforma — Nebula Members" },
    { name: "description", content: "Acesso à plataforma na plataforma Nebula Members." },
    { property: "og:title", content: "Acesso à plataforma — Nebula Members" },
    { property: "og:description", content: "Acesso à plataforma na plataforma Nebula Members." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function LoginPage() {
  const search = Route.useSearch();
  return <AuthCard initialMode={search.mode || "signin"} />;
}
