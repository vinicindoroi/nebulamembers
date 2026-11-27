import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { PanelBottomClose, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import './canvas-dock.css';

/** Enhance existing controls without duplicating their handlers or menu state. */
export function CanvasDock({ children, label, className = '' }: { children: ReactNode; label: string; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const prepare = () => {
      element.querySelectorAll<HTMLButtonElement>('.canvas-dock-items button').forEach(button => {
        const title = button.getAttribute('aria-label') || button.title || button.textContent?.trim();
        if (title) {
          button.dataset['dockLabel'] = title;
          button.setAttribute('aria-label', title);
        }
      });
    };
    prepare();
    const observer = new MutationObserver(prepare);
    observer.observe(element, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      setOpen(false); toggle.current?.focus();
    };
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || root.current?.contains(target) || target.closest('[data-radix-popper-content-wrapper]')) return;
      setOpen(false);
    };
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', outside); };
  }, [open]);
  const reset = () => root.current?.querySelectorAll<HTMLElement>('.canvas-dock-items button').forEach(button => {
    button.style.removeProperty('--dock-scale'); button.style.removeProperty('--dock-lift');
  });
  return <div ref={root} className={`canvas-dock ${className}`} data-open={open || undefined}>
    <div id={listId} className="canvas-dock-items" role="toolbar" aria-label={label}
      onPointerMove={event => {
        if (event.pointerType === 'touch' || window.matchMedia('(max-width: 767px), (prefers-reduced-motion: reduce)').matches) return;
        root.current?.querySelectorAll<HTMLElement>('.canvas-dock-items button').forEach(button => {
          const bounds = button.getBoundingClientRect();
          const distance = Math.abs(event.clientX - bounds.left - bounds.width / 2);
          const influence = Math.max(0, 1 - distance / 95);
          button.style.setProperty('--dock-scale', String(1 + influence * .32));
          button.style.setProperty('--dock-lift', `${-influence * 7}px`);
        });
      }} onPointerLeave={reset}
      onClick={event => {
        const target = event.target;
        if (target instanceof Element && target.closest('button:not([aria-haspopup])')) setOpen(false);
      }}>{children}</div>
    <Button ref={toggle} variant="ghost" size="icon" className="canvas-dock-toggle"
      aria-label={open ? `Fechar ${label}` : `Abrir ${label}`} aria-expanded={open} aria-controls={listId}
      onClick={() => setOpen(value => !value)}>{open ? <X className="h-5 w-5" /> : <PanelBottomClose className="h-5 w-5" />}</Button>
  </div>;
}