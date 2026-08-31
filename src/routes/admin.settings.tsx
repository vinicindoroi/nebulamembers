import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Settings as SettingsIcon, CreditCard, Mail, Plug, ShieldCheck, Save, Type, Palette, Link as LinkIcon, Key, Hash, CloudLightning, Play, AlertCircle } from "lucide-react";
import { Field, inputClass, selectClass, selectStyle } from "@/components/admin/Modal";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/settings")({ component: Page });

const STORAGE_KEY = "admin_settings_v1";

type SettingsShape = {
  general: { name: string; logoUrl: string; primaryColor: string; restrictToLeads: boolean };
  payments: { gateway: string; publicKey: string };
  email: { smtpHost: string; sender: string };
  integrations: { apiKey: string; webhookUrl: string };
  security: { minPasswordLen: number; require2faAdmins: boolean };
  vercel: { deployHookUrl: string };
};

const DEFAULTS: SettingsShape = {
  general: { name: "Membros", logoUrl: "/nebula_logo.png", primaryColor: "#8b5cf6", restrictToLeads: false },
  payments: { gateway: "stripe", publicKey: "" },
  email: { smtpHost: "", sender: "" },
  integrations: { apiKey: "", webhookUrl: "" },
  security: { minPasswordLen: 8, require2faAdmins: false },
  vercel: { deployHookUrl: "" },
};

const TABS = [
  { id: "general", label: "Geral", icon: SettingsIcon },
  { id: "payments", label: "Pagamentos", icon: CreditCard },
  { id: "email", label: "Email", icon: Mail },
  { id: "integrations", label: "Integrações", icon: Plug },
  { id: "security", label: "Segurança", icon: ShieldCheck },
  { id: "vercel", label: "Vercel Deploy", icon: CloudLightning },
] as const;

function Page() {
  const [tab, setTab] = useState<typeof TABS[number]["id"]>("general");
  const [s, setS] = useState<SettingsShape>(DEFAULTS);
  const [dirty, setDirty] = useState(false);
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      // First try to load cached local values
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setS({
            ...DEFAULTS,
            ...parsed,
            vercel: parsed.vercel || DEFAULTS.vercel,
          });
        }
      } catch (_) {}

      // Then load from Supabase
      try {
        const [globalRes, privateRes] = await Promise.all([
          supabase.from("global_settings").select("*").eq("id", "current").maybeSingle(),
          supabase.from("private_settings").select("*").eq("id", "current").maybeSingle()
        ]);

        if (globalRes.error) throw globalRes.error;
        if (privateRes.error) throw privateRes.error;

        const merged: SettingsShape = { ...DEFAULTS };

        if (globalRes.data) {
          merged.general = {
            name: globalRes.data.name,
            logoUrl: globalRes.data.logo_url,
            primaryColor: globalRes.data.primary_color,
            restrictToLeads: globalRes.data.restrict_to_leads ?? false
          };
        }

        if (privateRes.data) {
          merged.payments = {
            gateway: privateRes.data.gateway,
            publicKey: privateRes.data.public_key
          };
          merged.email = {
            smtpHost: privateRes.data.smtp_host,
            sender: privateRes.data.sender
          };
          merged.integrations = {
            apiKey: privateRes.data.api_key,
            webhookUrl: privateRes.data.webhook_url
          };
          merged.security = {
            minPasswordLen: privateRes.data.min_password_len,
            require2faAdmins: privateRes.data.require_2fa_admins
          };
          merged.vercel = {
            deployHookUrl: privateRes.data.deploy_hook_url
          };
        }

        setS(merged);
        // Sync to cache
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch (err) {
        console.error("Error loading settings from Supabase:", err);
      }
    };

    fetchSettings();
  }, []);

  const update = <K extends keyof SettingsShape>(key: K, patch: Partial<SettingsShape[K]>) => {
    setS((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    setDirty(true);
  };

  const save = async () => {
    try {
      // 1. Save global public settings
      const { error: globalErr } = await supabase.from("global_settings").upsert({
        id: "current",
        name: s.general.name,
        logo_url: s.general.logoUrl,
        primary_color: s.general.primaryColor,
        restrict_to_leads: s.general.restrictToLeads
      });
      if (globalErr) throw globalErr;

      // 2. Save private/admin integration settings
      const { error: privateErr } = await supabase.from("private_settings").upsert({
        id: "current",
        gateway: s.payments.gateway,
        public_key: s.payments.publicKey,
        smtp_host: s.email.smtpHost,
        sender: s.email.sender,
        api_key: s.integrations.apiKey,
        webhook_url: s.integrations.webhookUrl,
        min_password_len: s.security.minPasswordLen,
        require_2fa_admins: s.security.require2faAdmins,
        deploy_hook_url: s.vercel.deployHookUrl
      });
      if (privateErr) throw privateErr;

      // 3. Cache in localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      
      setDirty(false);
      toast.success("Configurações salvas e sincronizadas com o Supabase!");
    } catch (err: any) {
      console.error("Error saving settings to Supabase:", err);
      toast.error("Erro ao salvar no Supabase. Salvando localmente...");
      
      // Fallback
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      setDirty(false);
    }
  };

  const triggerDeploy = async () => {
    const url = s.vercel?.deployHookUrl;
    if (!url) {
      toast.error("Configure a URL do Deploy Hook primeiro!");
      return;
    }
    setDeploying(true);
    try {
      await fetch(url, { method: "POST", mode: "no-cors" });
      toast.success("Deploy disparado com sucesso na Vercel!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao conectar com a Vercel.");
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">Personalize a plataforma para sua marca.</p>
        </div>
        <button
          onClick={save}
          disabled={!dirty}
          className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm flex items-center gap-2 disabled:opacity-40 shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)]"
        >
          <Save className="h-4 w-4" />Salvar alterações
        </button>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        <aside className="lg:w-56 shrink-0 w-full">
          <nav className="rounded-2xl border border-white/5 bg-white/[0.02] p-1.5 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible no-scrollbar">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm transition shrink-0 whitespace-nowrap lg:w-full ${
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
        </aside>

        <div className="flex-1 min-w-0">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 max-w-2xl space-y-5">
            {tab === "general" && (
              <>
                <Field label="Nome da plataforma" icon={Type}>
                  <input
                    value={s.general.name}
                    onChange={(e) => update("general", { name: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="URL do logo" icon={LinkIcon}>
                  <input
                    value={s.general.logoUrl}
                    onChange={(e) => update("general", { logoUrl: e.target.value })}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </Field>
                <Field label="Cor primária" icon={Palette}>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={s.general.primaryColor}
                      onChange={(e) => update("general", { primaryColor: e.target.value })}
                      className="h-11 w-16 rounded-xl bg-white/[0.04] border border-white/10 cursor-pointer"
                      style={{ colorScheme: "dark" }}
                    />
                    <input
                      value={s.general.primaryColor}
                      onChange={(e) => update("general", { primaryColor: e.target.value })}
                      className={`${inputClass} font-mono flex-1`}
                    />
                  </div>
                </Field>
              </>
            )}

            {tab === "payments" && (
              <>
                <Field label="Gateway de pagamento" icon={CreditCard}>
                  <select
                    value={s.payments.gateway}
                    onChange={(e) => update("payments", { gateway: e.target.value })}
                    className={selectClass}
                    style={selectStyle}
                  >
                    <option value="stripe">Stripe</option>
                    <option value="paddle">Paddle</option>
                    <option value="mercadopago">Mercado Pago</option>
                  </select>
                </Field>
                <Field label="Chave pública" icon={Key} hint="Encontre no painel do seu gateway.">
                  <input
                    value={s.payments.publicKey}
                    onChange={(e) => update("payments", { publicKey: e.target.value })}
                    placeholder="pk_live_..."
                    className={`${inputClass} font-mono`}
                  />
                </Field>
              </>
            )}

            {tab === "email" && (
              <>
                <Field label="Servidor SMTP" icon={Mail}>
                  <input
                    value={s.email.smtpHost}
                    onChange={(e) => update("email", { smtpHost: e.target.value })}
                    placeholder="smtp.example.com"
                    className={inputClass}
                  />
                </Field>
                <Field label="Email remetente" icon={Mail}>
                  <input
                    type="email"
                    value={s.email.sender}
                    onChange={(e) => update("email", { sender: e.target.value })}
                    placeholder="no-reply@example.com"
                    className={inputClass}
                  />
                </Field>
              </>
            )}

            {tab === "integrations" && (
              <>
                <Field label="API Key" icon={Key}>
                  <input
                    value={s.integrations.apiKey}
                    onChange={(e) => update("integrations", { apiKey: e.target.value })}
                    placeholder="sk_..."
                    className={`${inputClass} font-mono`}
                  />
                </Field>
                <Field label="Webhook URL" icon={LinkIcon}>
                  <input
                    value={s.integrations.webhookUrl}
                    onChange={(e) => update("integrations", { webhookUrl: e.target.value })}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </Field>
              </>
            )}

            {tab === "security" && (
              <>
                <Field label="Tamanho mínimo da senha" icon={Hash}>
                  <input
                    type="number"
                    min={6}
                    max={64}
                    value={s.security.minPasswordLen}
                    onChange={(e) => update("security", { minPasswordLen: Number(e.target.value) })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Autenticação de dois fatores" icon={ShieldCheck}>
                  <label className="flex items-center gap-3 h-[42px] px-3.5 rounded-xl bg-white/[0.04] border border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.security.require2faAdmins}
                      onChange={(e) => update("security", { require2faAdmins: e.target.checked })}
                      className="accent-primary"
                    />
                    <span className="text-sm">Exigir 2FA para administradores</span>
                  </label>
                </Field>
                <Field label="Restrição de Acesso" icon={ShieldCheck} hint="Habilite para permitir cadastro e login apenas para e-mails presentes nas respostas do formulário (/forms).">
                  <label className="flex items-center gap-3 h-[42px] px-3.5 rounded-xl bg-white/[0.04] border border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.general.restrictToLeads}
                      onChange={(e) => update("general", { restrictToLeads: e.target.checked })}
                      className="accent-primary"
                    />
                    <span className="text-sm">Restringir cadastro e login aos Leads do forms</span>
                  </label>
                </Field>
              </>
            )}

            {tab === "vercel" && (
              <div className="space-y-6">
                <div className="border border-white/5 bg-white/[0.01] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                      <CloudLightning className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium">Deploy Manual (Vercel)</h3>
                      <p className="text-xs text-muted-foreground">Dispare deploys de produção diretamente do seu painel administrativo.</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <Field label="URL do Deploy Hook da Vercel" icon={LinkIcon} hint="Crie em Configurações do Projeto Vercel > Git > Deploy Hooks">
                      <input
                        value={s.vercel?.deployHookUrl || ""}
                        onChange={(e) => update("vercel", { deployHookUrl: e.target.value })}
                        placeholder="https://api.vercel.com/v1/integrations/deploy/..."
                        className={`${inputClass} font-mono`}
                      />
                    </Field>

                    <div className="flex justify-start">
                      <button
                        onClick={triggerDeploy}
                        disabled={deploying || !s.vercel?.deployHookUrl}
                        className="gradient-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition hover:opacity-90 active:scale-95 shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)]"
                      >
                        {deploying ? (
                          <>
                            <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            Disparando Deploy...
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 fill-current" />
                            Disparar Deploy de Produção
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border border-amber-500/10 bg-amber-500/[0.02] rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2.5 text-amber-500">
                    <AlertCircle className="h-4 w-4" />
                    <h4 className="text-sm font-medium">Como evitar 404 e gerenciar deploys corretamente?</h4>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Como este projeto usa o compilador do <strong>TanStack Start</strong>, ter um arquivo <code>vercel.json</code> ou usar comandos no <strong>Ignored Build Step</strong> da Vercel gera conflitos e causa erros de <strong>404 Not Found</strong> ou cancelamentos indesejados!
                  </p>
                  <p className="text-xs font-medium leading-relaxed text-amber-500/90">
                    Para desativar deploys automáticos do Git push de forma limpa e segura:
                  </p>
                  <ol className="text-xs space-y-2 text-muted-foreground list-decimal pl-4">
                    <li>
                      Acesse a <strong>Vercel</strong> &gt; <strong>Settings</strong> &gt; <strong>Git</strong>, vá em <strong>Ignored Build Step</strong> e <strong>remova</strong> qualquer comando customizado (limpe o campo).
                    </li>
                    <li>
                      Para enviar novos commits sem disparar deploys automáticos, basta incluir a tag <code>[skip ci]</code> ou <code>[skip deploy]</code> no final da mensagem do seu commit (ex: <code>git commit -m "meu commit [skip ci]"</code>).
                    </li>
                    <li>
                      Quando quiser atualizar o site, basta clicar no botão <strong>"Disparar Deploy de Produção"</strong> acima para gerar a build mais recente sem bloqueios!
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
