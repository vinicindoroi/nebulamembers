import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ session: null, user: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ensureProfile = async (s: Session | null) => {
      const u = s?.user;
      if (!u) return;
      try {
        const { data: existing } = await supabase.from("profiles").select("id").eq("id", u.id).maybeSingle();
        if (!existing) {
          await supabase.from("profiles").insert({
            id: u.id,
            email: u.email ?? null,
            full_name:
              (u.user_metadata?.["full_name"] as string) ??
              (u.user_metadata?.["name"] as string) ??
              (u.email ? u.email.split("@")[0] : null),
            avatar_url: (u.user_metadata?.["avatar_url"] as string) ?? null,
          });
        }
        await supabase
          .from("user_roles")
          .upsert({ user_id: u.id, role: "member" }, { onConflict: "user_id,role", ignoreDuplicates: true });
      } catch {
        /* já existe ou sem permissão — ignorar */
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
      if (s) setTimeout(() => void ensureProfile(s), 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session) void ensureProfile(data.session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);