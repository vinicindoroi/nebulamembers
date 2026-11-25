import { useEffect, useRef } from "react";
import { mountEdgesShader } from "@/lib/edges-shader";

export function EdgesBackground() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    return mountEdgesShader(host);
  }, []);
  return <div ref={ref} className="member-edge-background" aria-hidden="true" />;
}