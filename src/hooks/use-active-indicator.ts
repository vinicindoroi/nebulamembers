import { useEffect, useLayoutEffect, useState, type RefObject } from "react";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export type ActiveIndicator = { x: number; ready: boolean; animate: boolean };

/**
 * Centro horizontal do item com aria-current="page", para um traço que desliza.
 * A primeira medida entra sem transição; as seguintes animam.
 */
export function useActiveIndicator(ref: RefObject<HTMLElement | null>, dep: string): ActiveIndicator {
  const [pos, setPos] = useState({ x: 0, ready: false });
  const [animate, setAnimate] = useState(false);

  useIsoLayoutEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    let frame = 0;
    const measure = () => {
      const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active || active.offsetWidth < 1) {
        setPos((s) => (s.ready ? { x: s.x, ready: false } : s));
        return;
      }
      const x = active.offsetLeft + active.offsetWidth / 2;
      setPos((s) => (s.ready && Math.abs(s.x - x) < 0.5 ? s : { x, ready: true }));
    };
    measure();
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    ro.observe(nav);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref, dep]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return { x: pos.x, ready: pos.ready, animate };
}
