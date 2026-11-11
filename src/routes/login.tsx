import { createFileRoute } from "@tanstack/react-router";
import { AuthCard, type AuthMode } from "@/components/auth/AuthCard";

type LoginSearch = {
  mode?: AuthMode;
};

const MODES: AuthMode[] = ["signin", "signup", "forgot"];

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    return {
      mode: MODES.includes(search.mode as AuthMode) ? (search.mode as AuthMode) : undefined,
    };
  },
  component: LoginPage,
  head: () => ({ meta: [
    { title: "Entrar — Nebula Members" },
    { name: "description", content: "Acesse sua área exclusiva Nebula Members." },
    { property: "og:title", content: "Entrar — Nebula Members" },
    { property: "og:description", content: "Acesse sua área exclusiva Nebula Members." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function LoginPage() {
  const search = Route.useSearch();
  return <AuthCard initialMode={search.mode || "signin"} />;
}
