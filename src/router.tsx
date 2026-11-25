import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { viewTransitionTypes } from "@/lib/route-transition";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    defaultPreloadStaleTime: 0,
    // Troca de aba: View Transitions API, com direção (frente/trás/subida).
    // Sem suporte a `types`, cai no morph padrão; sem a API, o CSS do .route-stage anima.
    defaultViewTransition: {
      types: ({ fromLocation, toLocation, pathChanged }) => {
        if (!pathChanged) return false;
        return viewTransitionTypes(fromLocation?.pathname, toLocation.pathname);
      },
    },
  });

  return router;
};
