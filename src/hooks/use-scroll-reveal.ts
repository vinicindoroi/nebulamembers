import { useEffect, useRef, type CSSProperties } from "react";

/**
 * Reveals every `[data-reveal]` descendant with a soft blur/fade/rise as it
 * scrolls into view (stagger via the `--rd` CSS variable). Also feeds the
 * cursor position into `.dash-card` elements for the hover spotlight.
 * Content stays fully visible without JS or with reduced motion.
 */
export function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const onMove = (e: PointerEvent) => {
      const card = (e.target as Element | null)?.closest?.(".dash-card") as HTMLElement | null;
      if (!card || !root.contains(card)) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    root.addEventListener("pointermove", onMove, { passive: true });

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      return () => root.removeEventListener("pointermove", onMove);
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-revealed", "");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.08 },
    );
    const seen = new WeakSet<Element>();
    const scan = () => {
      root.querySelectorAll("[data-reveal]").forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        io.observe(el);
      });
    };
    scan();
    root.setAttribute("data-reveal-armed", "");
    const mo = new MutationObserver(scan);
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      root.removeEventListener("pointermove", onMove);
      io.disconnect();
      mo.disconnect();
      root.removeAttribute("data-reveal-armed");
    };
  }, []);

  return ref;
}

export const revealDelay = (i: number, step = 70): CSSProperties =>
  ({ "--rd": `${i * step}ms` }) as CSSProperties;
