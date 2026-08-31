import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export type UserNotification = {
  id: string;
  title: string;
  content: string;
  audience: string;
  sent_at: string | null;
  created_at: string;
  read: boolean;
};

const db = supabase as any;

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const initialLoadDone = useRef(false);

  // Subscribe to realtime inserts/updates on notifications table
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload: any) => {
          // Only show toast if it has sent_at (was sent immediately)
          if (payload.new?.sent_at && initialLoadDone.current) {
            toast(payload.new.title, {
              description: payload.new.content?.slice(0, 100),
            });
          }
          qc.invalidateQueries({ queryKey: ["user-notifications", user.id] });
        }
      )
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "notifications" },
        (payload: any) => {
          // Notification was updated (e.g. scheduled -> sent)
          if (payload.new?.sent_at && !payload.old?.sent_at && initialLoadDone.current) {
            toast(payload.new.title, {
              description: payload.new.content?.slice(0, 100),
            });
          }
          qc.invalidateQueries({ queryKey: ["user-notifications", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc]);

  const query = useQuery({
    queryKey: ["user-notifications", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<UserNotification[]> => {
      // Get user's plan from profile
      const { data: profile } = await db
        .from("profiles")
        .select("plan")
        .eq("id", user!.id)
        .maybeSingle();

      const userPlan = (profile?.plan ?? "Free").toLowerCase();

      // Get all sent notifications (broadcast by audience OR directed to this user)
      const [{ data: broadcastNotifs, error }, { data: directNotifs, error: error2 }] = await Promise.all([
        db
          .from("notifications")
          .select("*")
          .not("sent_at", "is", null)
          .is("recipient_id", null)
          .order("sent_at", { ascending: false })
          .limit(50),
        db
          .from("notifications")
          .select("*")
          .not("sent_at", "is", null)
          .eq("recipient_id", user!.id)
          .order("sent_at", { ascending: false })
          .limit(50),
      ]);

      if (error) throw error;
      if (error2) throw error2;

      // Filter broadcast by audience
      const filtered = (broadcastNotifs ?? []).filter((n: any) => {
        if (n.audience === "all") return true;
        return n.audience === userPlan;
      });

      // Merge broadcast + direct, sort by sent_at desc
      const allNotifs = [...filtered, ...(directNotifs ?? [])].sort(
        (a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
      ).slice(0, 50);

      // Get read status
      const { data: reads } = await db
        .from("notification_reads")
        .select("notification_id")
        .eq("user_id", user!.id);

      const readSet = new Set((reads ?? []).map((r: any) => r.notification_id));

      return allNotifs.map((n: any) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        audience: n.audience,
        sent_at: n.sent_at,
        created_at: n.created_at,
        read: readSet.has(n.id),
      }));
    },
    staleTime: 1000 * 30,
  });

  // Mark initial load as done after first successful fetch
  useEffect(() => {
    if (query.isSuccess && !initialLoadDone.current) {
      initialLoadDone.current = true;
    }
  }, [query.isSuccess]);

  return query;
}

export function useMarkNotificationRead() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user) return;
      const { error } = await db
        .from("notification_reads")
        .insert({ notification_id: notificationId, user_id: user.id });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-notifications"] });
    },
  });
}

export function useMarkAllRead() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      if (!user || notificationIds.length === 0) return;
      const rows = notificationIds.map((id) => ({
        notification_id: id,
        user_id: user.id,
      }));
      const { error } = await db
        .from("notification_reads")
        .upsert(rows, { onConflict: "notification_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-notifications"] });
    },
  });
}
