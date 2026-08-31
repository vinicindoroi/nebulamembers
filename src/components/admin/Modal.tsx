import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  kicker?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: ReactNode;
  children: ReactNode;
};

const sizeMap = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
};

export function Modal({ open, onClose, title, kicker, description, size = "lg", footer, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-md"
      style={{ animation: "modal-overlay-in 0.18s ease-out both" }}
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center p-4">
        <div
          className={`relative w-full ${sizeMap[size]} rounded-2xl border border-white/10 bg-[oklch(0.16_0.015_270)] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)] overflow-hidden`}
          style={{ animation: "modal-card-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative px-6 pt-5 pb-4 border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent">
            <div className="flex items-start justify-between gap-4">
              <div>
                {kicker && (
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-primary/80 mb-1">
                    {kicker}
                  </div>
                )}
                <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
                {description && (
                  <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="shrink-0 h-9 w-9 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center transition"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[min(70vh,640px)] overflow-y-auto">
            {children}
          </div>

          {footer && (
            <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-end gap-2">
              {footer}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modal-overlay-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modal-card-in {
          from { opacity: 0; transform: translateY(12px) scale(0.98) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
      `}</style>
    </div>,
    document.body
  );
}

type FieldProps = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  required?: boolean;
  hint?: string;
  children: ReactNode;
};

export function Field({ label, icon: Icon, required, hint, children }: FieldProps) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
        {required && <span className="text-primary">*</span>}
      </label>
      {children}
      {hint && <div className="mt-1.5 text-[11px] text-muted-foreground/70">{hint}</div>}
    </div>
  );
}

export const inputClass =
  "w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground/50 hover:bg-white/[0.06] hover:border-white/15 focus:bg-white/[0.06] focus:border-primary/50 focus:ring-[3px] focus:ring-primary/15";

export const selectClass = `${inputClass} appearance-none pr-9 bg-no-repeat [&>option]:bg-[#1a1a2e] [&>option]:text-white`;

export const selectStyle: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
  backgroundPosition: "right 0.75rem center",
  colorScheme: "dark",
};
