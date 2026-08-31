import { createFileRoute, useNavigate, useSearch, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell, Lock, Palette, Globe, LogOut, KeyRound, Eye, EyeOff,
  User as UserIcon, ShieldCheck, AlertTriangle, Check,
} from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Field, inputClass } from "@/components/admin/Modal";
import { useTheme } from "@/hooks/use-theme";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Configurações — Membros" }] }),
});

const STORAGE_KEY = "member_prefs_v1";

type Prefs = {
  emailDigest: boolean;
  emailNews: boolean;
  pushAll: boolean;
  marketing: boolean;
};

const DEFAULT_PREFS: Prefs = {
  emailDigest: true,
  emailNews: true,
  pushAll: true,
  marketing: false,
};

const TABS = [
  { id: "account", label: "Conta", icon: UserIcon },
  { id: "notifications", label: "Notificações", icon: Bell },
  { id: "security", label: "Segurança", icon: ShieldCheck },
  { id: "about", label: "Sobre", icon: Globe },
] as const;

function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const initialTab = (searchParams.get("tab") as typeof TABS[number]["id"]) || "account";
  const [tab, setTab] = useState<typeof TABS[number]["id"]>(initialTab);

  const handleTabChange = (id: typeof TABS[number]["id"]) => {
    setTab(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState({}, "", url.toString());
  };
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const togglePref = async (key: keyof Prefs) => {
    const nextVal = !prefs[key];

    if (key === "pushAll" && nextVal) {
      if (typeof window !== "undefined" && "Notification" in window) {
        try {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            new Notification("Nebula Member Hub 🚀", {
              body: "Notificações push ativadas com sucesso! Você receberá atualizações importantes aqui.",
              icon: "/nebula_logo.png"
            });
            toast.success("Notificações Push ativadas com sucesso!");
          } else if (permission === "denied") {
            toast.error("Permissão de notificações negada pelo navegador.");
            return; // don't enable if denied
          } else {
            return; // cancelled/dismissed
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        toast.error("Notificações não são suportadas neste navegador.");
        return;
      }
    }

    const next = { ...prefs, [key]: nextVal };
    setPrefs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const changePassword = async () => {
    if (newPass.length < 6) return toast.error("Senha precisa ter no mínimo 6 caracteres");
    if (newPass !== confirmPass) return toast.error("As senhas não coincidem");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setBusy(false);
    if (error) return toast.error(error.message);
    setNewPass("");
    setConfirmPass("");
    toast.success("Senha atualizada");
  };

  const onSignOut = async () => {
    const ok = await confirm({ title: "Sair da conta?", description: "Você será desconectado e redirecionado para o login.", confirmLabel: "Sair", variant: "destructive" });
    if (!ok) return;
    await signOut();
    navigate({ to: "/login" });
  };

  const initials = ((user?.user_metadata as any)?.full_name || user?.email || "M").slice(0, 2).toUpperCase();
  const passStrength = getStrength(newPass);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie sua conta, notificações e segurança.</p>
      </header>

      <div className="flex gap-6 flex-col lg:flex-row">
        <aside className="lg:w-56 shrink-0 w-full">
          <nav className="rounded-2xl border border-white/5 bg-white/[0.02] p-1.5 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible no-scrollbar">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleTabChange(t.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm transition shrink-0 whitespace-nowrap lg:w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                    active
                      ? "bg-gradient-to-r from-primary/15 via-primary/5 to-transparent text-foreground border border-primary/10 lg:border-transparent"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                  {t.label}
                </button>
              );
            })}
          </nav>

          <button
            onClick={onSignOut}
            className="mt-3 w-full rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-red-500/5 hover:border-red-500/20 p-3 flex items-center gap-2.5 text-sm text-muted-foreground hover:text-red-400 transition group"
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </button>
        </aside>

        <div className="flex-1 min-w-0 space-y-5">
          {tab === "account" && (
            <>
              <Section title="Conta" description="Informações básicas da sua conta.">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center text-sm font-semibold text-primary-foreground">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{(user?.user_metadata as any)?.full_name || "Membro"}</div>
                    <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Para editar nome, bio e foto vá em <a href="/profile" className="text-primary hover:underline">Perfil</a>.
                </p>
              </Section>

              <Section title="Aparência" description="Personalize a interface.">
                <SettingRow icon={Palette} title="Tema" desc="Escolha entre escuro, claro ou automático.">
                  <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/10">
                    {([["dark", "Escuro"], ["light", "Claro"], ["system", "Sistema"]] as const).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => setTheme(id)}
                        className={`text-xs px-3 py-1.5 rounded-lg transition ${theme === id ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </SettingRow>
                <SettingRow icon={Globe} title="Idioma" desc="Português · Brasil">
                  <span className="text-xs px-2 py-1 rounded-lg bg-white/5 text-muted-foreground">PT-BR</span>
                </SettingRow>
              </Section>
            </>
          )}

          {tab === "notifications" && (
            <Section title="Notificações" description="Escolha o que quer receber e como.">
              <SettingRow icon={Bell} title="Resumo semanal" desc="Receba um digest com seu progresso e novidades.">
                <Toggle on={prefs.emailDigest} onChange={() => togglePref("emailDigest")} />
              </SettingRow>
              <SettingRow icon={Bell} title="Novos cursos" desc="Avisar quando novos cursos forem publicados.">
                <Toggle on={prefs.emailNews} onChange={() => togglePref("emailNews")} />
              </SettingRow>
              <SettingRow icon={Bell} title="Push notifications" desc="Notificações no navegador.">
                <Toggle on={prefs.pushAll} onChange={() => togglePref("pushAll")} />
              </SettingRow>
              <SettingRow icon={Bell} title="Marketing" desc="Promoções e ofertas especiais.">
                <Toggle on={prefs.marketing} onChange={() => togglePref("marketing")} />
              </SettingRow>
            </Section>
          )}

          {tab === "security" && (
            <>
              <Section title="Senha" description="Use uma senha forte que você não usa em nenhum outro lugar.">
                <Field label="Nova senha" icon={KeyRound} hint="Mínimo 6 caracteres. Recomendamos 12+ com símbolos.">
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
                {newPass && (
                  <Field label="Confirmar nova senha" icon={KeyRound}>
                    <input
                      type="password"
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      placeholder="••••••••"
                      className={`${inputClass} ${confirmPass && confirmPass !== newPass ? 'border-red-500/50 focus:ring-red-500/30' : ''}`}
                    />
                    {confirmPass && confirmPass !== newPass && (
                      <p className="text-xs text-red-400 mt-1">As senhas não coincidem</p>
                    )}
                  </Field>
                )}
                {newPass && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`flex-1 h-1 rounded-full transition ${
                            i < passStrength.score
                              ? passStrength.score <= 1
                                ? "bg-red-500"
                                : passStrength.score === 2
                                ? "bg-amber-500"
                                : passStrength.score === 3
                                ? "bg-cyan-400"
                                : "bg-emerald-500"
                              : "bg-white/5"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{passStrength.label}</div>
                  </div>
                )}
                <button
                  onClick={changePassword}
                  disabled={busy || newPass.length < 6 || (!!confirmPass && confirmPass !== newPass)}
                  className="mt-4 gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {busy ? "Salvando..." : "Atualizar senha"}
                </button>
              </Section>

              <Section title="Sessão" description="Encerre sua sessão neste dispositivo.">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                  <div className="flex-1 text-xs text-muted-foreground">
                    Você precisará fazer login novamente após sair.
                  </div>
                  <button
                    onClick={onSignOut}
                    className="text-xs px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition"
                  >
                    Sair agora
                  </button>
                </div>
              </Section>
            </>
          )}

          {tab === "about" && (
            <Section title="Sobre a plataforma" description="Informações gerais.">
              <SettingRow icon={Lock} title="Privacidade" desc="Seus dados são protegidos por RLS no Supabase." />
              <SettingRow icon={ShieldCheck} title="Segurança" desc="Comunicação criptografada com TLS." />
              <SettingRow icon={Globe} title="Versão" desc="Membros Hub v1.0">
                <span className="text-xs text-muted-foreground font-mono">1.0.0</span>
              </SettingRow>
            </Section>
          )}
        </div>
      </div>
      {confirmDialog}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02]">
      <div className="px-5 py-4 border-b border-white/5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function SettingRow({
  icon: Icon, title, desc, children,
}: { icon: any; title: string; desc: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="h-9 w-9 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground truncate">{desc}</div>
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`h-6 w-11 rounded-full transition relative shrink-0 ${on ? "gradient-primary" : "bg-white/10"}`}
      aria-pressed={on}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-5" : "left-0.5"}`}
      />
    </button>
  );
}

function getStrength(pass: string): { score: number; label: string } {
  if (!pass) return { score: 0, label: "" };
  let score = 0;
  if (pass.length >= 8) score++;
  if (pass.length >= 12) score++;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
  if (/\d/.test(pass) && /[^A-Za-z0-9]/.test(pass)) score++;
  const labels = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];
  return { score, label: labels[score] ?? labels[0] };
}
