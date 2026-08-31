import { useState, useRef, useEffect } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from "@/hooks/use-notifications";
import { useRouterState } from "@tanstack/react-router";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: notifications = [], isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [path]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
  const prevUnreadRef = useRef(unreadCount);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (unreadCount > prevUnreadRef.current) {
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 600);
      return () => clearTimeout(t);
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-white/5 transition"
        aria-label="Notificações"
      >
        <Bell className={`h-4 w-4 transition-transform ${shaking ? 'animate-[wiggle_0.6s_ease-in-out]' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[360px] max-h-[480px] flex flex-col rounded-2xl overflow-hidden z-50"
          style={{
            background: "linear-gradient(180deg, oklch(0.16 0.015 270 / 0.85), oklch(0.14 0.015 270 / 0.9))",
            backdropFilter: "blur(24px) saturate(1.4)",
            WebkitBackdropFilter: "blur(24px) saturate(1.4)",
            border: "1px solid oklch(1 0 0 / 0.1)",
            boxShadow: "0 24px 80px -12px rgba(0,0,0,0.7), inset 0 1px 0 oklch(1 0 0 / 0.06)",
            animation: "notif-in 0.2s cubic-bezier(0.22, 1, 0.36, 1) both",
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Notificações</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                  {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate(unreadIds)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {isLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">Carregando...</div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                <div className="text-xs text-muted-foreground">Nenhuma notificação</div>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { if (!n.read) markRead.mutate(n.id); }}
                    className={`w-full text-left px-4 py-3 transition hover:bg-white/[0.04] ${
                      !n.read ? "bg-primary/[0.03]" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                        n.read ? "bg-transparent" : "bg-primary shadow-[0_0_8px_oklch(0.65_0.22_290/0.6)]"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-medium truncate ${n.read ? "text-muted-foreground" : "text-foreground"}`}>
                            {n.title}
                          </span>
                          {n.read && <Check className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {n.content}
                        </p>
                        <span className="text-[10px] text-muted-foreground/60 mt-1 block">
                          {formatTimeAgo(n.sent_at ?? n.created_at)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-white/[0.06] bg-white/[0.02]">
              <div className="text-[10px] text-center text-muted-foreground/60">
                Mostrando as últimas {notifications.length} notificações
              </div>
            </div>
          )}

          <style>{`
            @keyframes notif-in {
              from { opacity: 0; transform: translateY(-4px) scale(0.98); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Agora";
  if (minutes < 60) return `${minutes}min atrás`;
  if (hours < 24) return `${hours}h atrás`;
  if (days < 7) return `${days}d atrás`;
  return new Date(dateStr).toLocaleDateString("pt-BR");
}
