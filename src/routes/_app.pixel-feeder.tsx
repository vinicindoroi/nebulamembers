import { createFileRoute } from "@tanstack/react-router";
import { PixelFeederView } from "@/components/pixel-feeder/PixelFeederView";

export const Route = createFileRoute("/_app/pixel-feeder")({
  head: () => ({ meta: [{ title: "Pixel Feeder — Nebula Members" }] }),
  component: PixelFeederView,
});
