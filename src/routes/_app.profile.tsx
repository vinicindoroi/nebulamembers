import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award, Flame, Star, Trophy, Zap, Target, User, Mail, MapPin, Phone, FileText,
  Save, Calendar, BadgeCheck, Camera, Instagram, BookOpen, Rocket, Compass, Lock, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCourses } from "@/hooks/use-courses";
import { useMemberProgress } from "@/hooks/use-member-progress";
import { toast } from "sonner";
import { Field, inputClass } from "@/components/admin/Modal";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Perfil — Membros" }] }),
});

const ACHIEVEMENT_ICONS: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bg: string;
    glow: string;
    border: string;
    unlockedBorder: string;
    unlockedBg: string;
    animate?: string;
  }
> = {
  first_lesson: {
    icon: Target,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    glow: "shadow-[0_0_20px_rgba(244,63,94,0.2)]",
    border: "border-pink-500/20",
    unlockedBorder: "hover:border-pink-500/40 border-pink-500/15",
    unlockedBg: "bg-pink-500/[0.02] hover:bg-pink-500/[0.04]",
  },
  five_lessons: {
    icon: BookOpen,
    color: "text-teal-400",
    bg: "bg-teal-500/10",
    glow: "shadow-[0_0_20px_rgba(20,184,166,0.2)]",
    border: "border-teal-500/20",
    unlockedBorder: "hover:border-teal-500/40 border-teal-500/15",
    unlockedBg: "bg-teal-500/[0.02] hover:bg-teal-500/[0.04]",
  },
  twenty_lessons: {
    icon: Rocket,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    glow: "shadow-[0_0_20px_rgba(99,102,241,0.2)]",
    border: "border-indigo-500/20",
    unlockedBorder: "hover:border-indigo-500/40 border-indigo-500/15",
    unlockedBg: "bg-indigo-500/[0.02] hover:bg-indigo-500/[0.04]",
    animate: "group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform duration-300",
  },
  streak_3: {
    icon: Flame,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]",
    border: "border-amber-500/20",
    unlockedBorder: "hover:border-amber-500/40 border-amber-500/15",
    unlockedBg: "bg-amber-500/[0.02] hover:bg-amber-500/[0.04]",
    animate: "group-hover:scale-110 transition-transform duration-300",
  },
  streak_7: {
    icon: Zap,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    glow: "shadow-[0_0_20px_rgba(234,179,8,0.2)]",
    border: "border-yellow-500/20",
    unlockedBorder: "hover:border-yellow-500/40 border-yellow-500/15",
    unlockedBg: "bg-yellow-500/[0.02] hover:bg-yellow-500/[0.04]",
    animate: "group-hover:scale-110 transition-transform duration-300",
  },
  explorer: {
    icon: Compass,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    glow: "shadow-[0_0_20px_rgba(6,182,212,0.2)]",
    border: "border-cyan-500/20",
    unlockedBorder: "hover:border-cyan-500/40 border-cyan-500/15",
    unlockedBg: "bg-cyan-500/[0.02] hover:bg-cyan-500/[0.04]",
    animate: "group-hover:rotate-45 transition-transform duration-500",
  },
};

function ProfilePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: courses = [] } = useCourses();
  const { data: memberProgress } = useMemberProgress();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({ full_name: "", bio: "", phone: "", location: "", instagram: "" });
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        bio: profile.bio ?? "",
        phone: profile.phone ?? "",
        location: profile.location ?? "",
        instagram: (profile as any).instagram ?? "",
      });
      setDirty(false);
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {
        full_name: form.full_name.trim() || null,
        bio: form.bio.trim() || null,
        phone: form.phone.trim() || null,
        location: form.location.trim() || null,
      };
      // Only include instagram if user filled it (column may not exist yet)
      if (form.instagram.trim()) payload.instagram = form.instagram.trim();

      const { error, data } = await (supabase as any)
        .from("profiles")
        .update(payload)
        .eq("id", user!.id)
        .select();
      console.log("[profile save]", { userId: user!.id, payload, error, data });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Nenhum registro atualizado. Verifique permissões.");
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: any) => toast.error("Erro ao salvar: " + e.message),
  });

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 2MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user!.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { toast.error("Erro no upload: " + upErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatar_url = `${urlData.publicUrl}?t=${Date.now()}`;
    const { error } = await (supabase as any).from("profiles").update({ avatar_url }).eq("id", user!.id);
    setUploading(false);
    if (error) return toast.error("Erro ao salvar: " + error.message);
    toast.success("Foto atualizada");
    qc.invalidateQueries({ queryKey: ["profile"] });
  };

  const update = (patch: Partial<typeof form>) => {
    setForm((p) => ({ ...p, ...patch }));
    setDirty(true);
  };

  const initials = (form.full_name || user?.email || "M").slice(0, 2).toUpperCase();
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : "—";

  const completedCourses = courses.filter((c) => c.progress === 100).length;
  const totalCompletedLessons = courses.reduce((s, c) => s + c.completedLessons, 0);
  const achievements = memberProgress?.achievements ?? [];
  const earnedBadges = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie suas informações pessoais e veja seu progresso.</p>
        </div>
        {dirty && (
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50 shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)]"
          >
            <Save className="h-4 w-4" />
            {save.isPending ? "Salvando..." : "Salvar alterações"}
          </button>
        )}
      </header>

      <section className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-primary/10 via-white/[0.02] to-transparent p-6 md:p-8">
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative group">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-24 w-24 rounded-2xl object-cover shadow-[0_16px_40px_-12px_oklch(0.65_0.22_290/0.6)]" />
            ) : (
              <div className="h-24 w-24 rounded-2xl gradient-primary flex items-center justify-center text-3xl font-semibold text-primary-foreground shadow-[0_16px_40px_-12px_oklch(0.65_0.22_290/0.6)]">
                {initials}
              </div>
            )}
            <button
              onClick={() => avatarRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
            >
              <Camera className="h-5 w-5 text-white" />
            </button>
            <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadAvatar} />
            {profile?.plan && profile.plan !== "Free" && (
              <div className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                <BadgeCheck className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold truncate">{form.full_name || "Sem nome"}</h2>
            <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap mt-1">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />Desde {memberSince}
              </span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 text-[11px] font-medium">
                Plano {profile?.plan ?? "Free"}
              </span>
            </div>
            {form.bio && <p className="text-sm text-muted-foreground mt-3 max-w-xl">{form.bio}</p>}
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-3 gap-3 pt-6 border-t border-white/5">
          <MiniStat label="Cursos completos" value={completedCourses} />
          <MiniStat label="Aulas assistidas" value={totalCompletedLessons} />
          <MiniStat label="Conquistas" value={`${earnedBadges}/${achievements.length || 6}`} />
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-white/[0.02]">
          <div className="px-5 py-4 border-b border-white/5">
            <h3 className="text-sm font-semibold">Informações pessoais</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Atualize seus dados de contato e bio.</p>
          </div>
          <div className="p-5 grid sm:grid-cols-2 gap-4">
            <Field label="Nome completo" icon={User}>
              <input
                value={form.full_name}
                onChange={(e) => update({ full_name: e.target.value })}
                className={inputClass}
                placeholder="Seu nome"
              />
            </Field>
            <Field label="Email" icon={Mail}>
              <input
                value={user?.email ?? ""}
                disabled
                className={`${inputClass} opacity-60 cursor-not-allowed`}
              />
            </Field>
            <Field label="Telefone" icon={Phone}>
              <input
                value={form.phone}
                onChange={(e) => update({ phone: e.target.value })}
                className={inputClass}
                placeholder="(11) 99999-9999"
              />
            </Field>
            <Field label="Localização" icon={MapPin}>
              <input
                value={form.location}
                onChange={(e) => update({ location: e.target.value })}
                className={inputClass}
                placeholder="Cidade, País"
              />
            </Field>
            <Field label="Instagram" icon={Instagram} hint="Seu @ sem o arroba.">
              <input
                value={form.instagram}
                onChange={(e) => update({ instagram: e.target.value.replace(/^@/, "") })}
                className={inputClass}
                placeholder="seuusuario"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Bio" icon={FileText} hint="Conte um pouco sobre você.">
                <textarea
                  value={form.bio}
                  onChange={(e) => update({ bio: e.target.value })}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder="Designer, dev, curioso por novas tecnologias..."
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02]">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Conquistas</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{earnedBadges} de {achievements.length || 6} desbloqueadas</p>
            </div>
            <Trophy className="h-4 w-4 text-amber-400" />
          </div>
          <div className="p-4 grid grid-cols-3 gap-2">
            {achievements.map((a) => {
              const cfg = ACHIEVEMENT_ICONS[a.id] || {
                icon: Award,
                color: "text-amber-400",
                bg: "bg-amber-500/10",
                glow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]",
                border: "border-amber-500/20",
                unlockedBorder: "hover:border-amber-500/40 border-amber-500/15",
                unlockedBg: "bg-amber-500/[0.02] hover:bg-amber-500/[0.04]",
              };
              const Icon = cfg.icon;

              return (
                <div
                  key={a.id}
                  className={`group relative rounded-xl border p-3 flex flex-col items-center text-center transition-all duration-300 select-none ${
                    a.unlocked
                      ? `${cfg.unlockedBorder} ${cfg.unlockedBg} ${cfg.glow}`
                      : "border-white/5 bg-white/[0.01] opacity-40 grayscale hover:opacity-60 transition"
                  }`}
                >
                  <div className={`relative h-10 w-10 rounded-xl flex items-center justify-center mb-1.5 shadow-lg transition-all duration-300 ${
                    a.unlocked
                      ? `${cfg.bg} ${cfg.glow} group-hover:scale-105 group-hover:rotate-3`
                      : "bg-white/5 text-muted-foreground/30 ring-dashed"
                  }`}>
                    <Icon className={`h-4.5 w-4.5 ${a.unlocked ? cfg.color : "text-muted-foreground/20"} ${cfg.animate || ""}`} />
                    {!a.unlocked && (
                      <div className="absolute inset-0 bg-black/30 backdrop-blur-[0.5px] rounded-xl flex items-center justify-center">
                        <Lock className="h-3 w-3 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-tight truncate w-full">{a.title}</div>

                  {/* Premium pure CSS Tooltip */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2.5 w-48 -translate-x-1/2 scale-95 rounded-xl border border-white/[0.08] bg-black/95 p-2.5 text-center opacity-0 shadow-2xl backdrop-blur-md transition-all duration-200 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100">
                    <p className={`font-bold text-[11px] mb-0.5 ${a.unlocked ? cfg.color : "text-muted-foreground"}`}>{a.title}</p>
                    <p className="text-[9px] text-muted-foreground/80 leading-relaxed mb-1">{a.description}</p>
                    {a.unlocked ? (
                      <span className="inline-flex items-center gap-1 text-[8px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                        Desbloqueado!
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[8px] font-semibold text-muted-foreground/70 bg-white/[0.04] px-1.5 py-0.5 rounded-full">
                        Bloqueado · {a.progress ?? 0}%
                      </span>
                    )}
                    <div className="absolute top-full left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1 bg-black/95 border-r border-b border-white/[0.08] rotate-45" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
