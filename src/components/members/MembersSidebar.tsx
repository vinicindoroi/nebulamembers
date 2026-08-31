import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Instagram, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Member = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  instagram: string | null;
  last_seen_at: string | null;
  plan: string | null;
};

const ONLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

export function MembersSidebar() {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["community-members"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, avatar_url, instagram, last_seen_at, plan")
        .order("last_seen_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Member[];
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });

  const [showAllOffline, setShowAllOffline] = useState(false);
  const OFFLINE_LIMIT = 8;

  const now = Date.now();
  const online = members.filter((m) => m.last_seen_at && now - new Date(m.last_seen_at).getTime() < ONLINE_THRESHOLD);
  const offline = members.filter((m) => !m.last_seen_at || now - new Date(m.last_seen_at).getTime() >= ONLINE_THRESHOLD);
  const visibleOffline = showAllOffline ? offline : offline.slice(0, OFFLINE_LIMIT);

  return (
    <aside className="w-[260px] shrink-0 hidden xl:block animate-fade-up">
      <div className="sticky top-4 space-y-4">
        {/* Painel Online */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-md overflow-hidden shadow-lg hover:border-white/[0.09] transition-all duration-300">
          <div className="px-4 py-3.5 border-b border-white/[0.04] flex items-center gap-2 bg-white/[0.01]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_6px_oklch(0.7_0.2_160)]"></span>
            </span>
            <span className="text-xs font-bold text-foreground/90 tracking-wide uppercase">Online Agora</span>
            <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full ml-auto">
              {online.length}
            </span>
          </div>
          
          <div className="p-2 max-h-[260px] overflow-y-auto scrollbar-thin">
            {isLoading ? (
              <div className="space-y-1 p-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-2 animate-pulse">
                    <div className="h-8 w-8 rounded-xl bg-white/[0.06] shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 w-24 bg-white/[0.06] rounded-full" />
                      <div className="h-2 w-16 bg-white/[0.04] rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : online.length === 0 ? (
              <div className="px-2 py-6 text-center text-[11px] text-muted-foreground/50 italic">Nenhum membro ativo</div>
            ) : (
              <div className="space-y-0.5">
                {online.map((m) => <MemberRow key={m.id} member={m} online />)}
              </div>
            )}
          </div>
        </div>

        {/* Painel Offline */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-md overflow-hidden shadow-lg hover:border-white/[0.09] transition-all duration-300">
          <div className="px-4 py-3.5 border-b border-white/[0.04] flex items-center gap-2 bg-white/[0.01]">
            <span className="h-2 w-2 rounded-full bg-white/20" />
            <span className="text-xs font-bold text-muted-foreground tracking-wide uppercase">Offline</span>
            <span className="text-[10px] font-bold font-mono text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full ml-auto">
              {offline.length}
            </span>
          </div>
          
          <div className="p-2 max-h-[340px] overflow-y-auto scrollbar-thin">
            {offline.length === 0 ? (
              <div className="px-2 py-6 text-center text-[11px] text-muted-foreground/50">Todos na rede online!</div>
            ) : (
              <div className="space-y-0.5">
                {visibleOffline.map((m) => <MemberRow key={m.id} member={m} online={false} />)}
                {offline.length > OFFLINE_LIMIT && (
                  <button
                    onClick={() => setShowAllOffline(v => !v)}
                    className="w-full mt-1 flex items-center justify-center gap-1 py-1.5 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors rounded-lg hover:bg-white/[0.03]"
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${showAllOffline ? 'rotate-180' : ''}`} />
                    {showAllOffline ? 'Ver menos' : `Ver mais ${offline.length - OFFLINE_LIMIT} membros`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function MemberRow({ member, online }: { member: Member; online: boolean }) {
  const name = member.full_name || "Membro";
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.04] transition-all duration-200 group/member cursor-default">
      <div className="relative shrink-0">
        {member.avatar_url ? (
          <img 
            src={member.avatar_url} 
            alt={name} 
            className="h-8.5 w-8.5 rounded-xl object-cover border border-white/[0.08] transition-transform duration-200 group-hover/member:scale-105" 
          />
        ) : (
          <div className="h-8.5 w-8.5 rounded-xl bg-white/5 border border-white/[0.04] flex items-center justify-center text-[10px] font-bold text-muted-foreground/80 uppercase transition-transform duration-200 group-hover/member:scale-105">
            {initials}
          </div>
        )}
        
        {/* Status Dot */}
        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background shadow-sm ${
          online ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.5)]" : "bg-white/10"
        }`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-foreground/90 truncate group-hover/member:text-foreground transition-colors">
          {name}
        </div>
        
        {member.plan && member.plan !== "Free" && (
          <span className="mt-0.5 inline-flex items-center px-1.5 py-0.2 rounded-full bg-primary/10 border border-primary/20 text-[8px] font-extrabold text-primary uppercase tracking-wide">
            {member.plan}
          </span>
        )}
      </div>
      
      {member.instagram && (
        <a
          href={`https://instagram.com/${member.instagram.replace("@", "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-0 group-hover/member:opacity-100 p-1.5 rounded-lg hover:bg-pink-500/10 text-muted-foreground/40 hover:text-pink-400 transition-all duration-200"
          title={`Acessar Instagram @${member.instagram.replace("@", "")}`}
        >
          <Instagram className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

