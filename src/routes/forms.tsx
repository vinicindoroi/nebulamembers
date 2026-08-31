import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Check, Compass, HelpCircle, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forms")({
  component: FormsPage,
  head: () => ({ meta: [{ title: "Formulário Interativo — Nebula" }] }),
});

const generateUUID = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

function FormsPage() {
  // Step navigation state
  const [step, setStep] = useState<number>(1);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [mentorship, setMentorship] = useState("");
  const [customMentorship, setCustomMentorship] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(null);

  // Focus refs for autofocus on step change
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const customRef = useRef<HTMLInputElement>(null);

  // Autofocus inputs dynamically when step changes
  useEffect(() => {
    if (step === 1 && nameRef.current) nameRef.current.focus();
    if (step === 2 && phoneRef.current) phoneRef.current.focus();
    if (step === 3 && emailRef.current) emailRef.current.focus();
  }, [step]);

  useEffect(() => {
    if (mentorship === "outra" && customRef.current) {
      customRef.current.focus();
    }
  }, [mentorship]);

  // Mask function for Brazilian phone formatting: (XX) XXXXX-XXXX
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 6) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setPhone(value);
  };

  // Keyboard navigation (Enter key)
  const handleKeyDown = (e: React.KeyboardEvent, nextAction: () => void) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nextAction();
    }
  };

  // Steps verification
  const goNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        toast.error("Por favor, digite seu nome completo.");
        return;
      }
      setDirection("next");
      setStep(2);
    } else if (step === 2) {
      if (phone.length < 14) {
        toast.error("Por favor, digite um número de celular válido.");
        return;
      }
      setDirection("next");
      setStep(3);
    } else if (step === 3) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast.error("Por favor, digite um e-mail válido.");
        return;
      }
      setDirection("next");
      setStep(4);
    }
  };

  const goPrev = () => {
    if (step > 1) {
      setDirection("prev");
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (mentorship === "outra" && !customMentorship.trim()) {
      toast.error("Por favor, digite o nome da mentoria.");
      return;
    }

    setLoading(true);
    const finalMentorship = mentorship === "outra" ? customMentorship.trim() : mentorship;

    try {
      if (currentSubmissionId) {
        // Update existing submission in Supabase
        const { error } = await supabase
          .from("form_submissions")
          .update({
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim().toLowerCase(),
            mentorship: finalMentorship
          })
          .eq("id", currentSubmissionId);

        if (error) throw error;
        toast.success("Informações atualizadas com sucesso!");
      } else {
        // Insert new submission into Supabase with client-generated UUID
        const newId = generateUUID();
        const { error } = await supabase
          .from("form_submissions")
          .insert({
            id: newId,
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim().toLowerCase(),
            mentorship: finalMentorship
          });

        if (error) throw error;
        setCurrentSubmissionId(newId);
        toast.success("Enviado com sucesso!");
      }
      setSuccess(true);
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast.error("Ocorreu um erro ao enviar para o servidor, salvando offline.");
      
      // Fallback to localStorage
      const submissionId = currentSubmissionId || Math.random().toString(36).substring(2, 9);
      const submission = {
        id: submissionId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        mentorship: finalMentorship,
        date: new Date().toISOString()
      };
      
      const existingSubmissions = JSON.parse(localStorage.getItem("nebula_form_submissions") || "[]");
      if (currentSubmissionId) {
        const index = existingSubmissions.findIndex((s: any) => s.id === currentSubmissionId);
        if (index !== -1) {
          existingSubmissions[index] = submission;
        } else {
          existingSubmissions.unshift(submission);
        }
      } else {
        existingSubmissions.unshift(submission);
        setCurrentSubmissionId(submissionId);
      }
      localStorage.setItem("nebula_form_submissions", JSON.stringify(existingSubmissions));
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  const handleEditField = (targetStep: number) => {
    setSuccess(false);
    setStep(targetStep);
    toast.info("Você pode corrigir esta informação agora.");
  };

  const handleReset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setMentorship("");
    setCustomMentorship("");
    setStep(1);
    setSuccess(false);
    setCurrentSubmissionId(null);
  };

  // Calculating progress percentage
  const progressPercent = Math.min((step / 4) * 100, 100);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 relative overflow-hidden bg-background">
      {/* Animated glowing cosmic background */}
      <div className="absolute top-[10%] left-[10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[140px] pointer-events-none animate-ambient-pulse" />
      <div className="absolute bottom-[10%] right-[10%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-[140px] pointer-events-none" />

      {/* Floating particles background */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              left: `${(i * 29) % 100}%`,
              top: `${(i * 37) % 100}%`,
              width: `${(i % 2) + 1}px`,
              height: `${(i % 2) + 1}px`,
              animationDelay: `${(i * 0.15) % 3}s`,
              animationDuration: `${((i % 4) + 3)}s`
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Typeform style container */}
        <div className="glass rounded-2xl p-8 md:p-10 border border-white/[0.06] shadow-2xl relative overflow-hidden">
          
          {/* Header brand accent line */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/[0.04]" />
          
          {!success ? (
            <>
              {/* Progress bar at the top */}
              <div className="w-full mb-8">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 mb-2">
                  <span>Passo {step} de 4</span>
                  <span>{Math.round(progressPercent)}% Concluído</span>
                </div>
                <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden w-full">
                  <div 
                    className="h-full gradient-primary rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_oklch(0.65_0.22_290/0.4)]" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Step Transitions wrapper */}
              <div className="min-h-[220px] flex flex-col justify-center">
                
                {/* STEP 1: Name */}
                {step === 1 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                        <Compass className="h-3.5 w-3.5 text-primary" /> Introdução
                      </span>
                      <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                        Qual é o seu nome completo?
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Escreva seu nome para podermos te identificar no sistema.
                      </p>
                    </div>
                    <input
                      ref={nameRef}
                      type="text"
                      placeholder="Digite seu nome completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, goNext)}
                      className="w-full glass rounded-xl px-4 py-4 text-sm text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all font-medium bg-black/10"
                    />
                  </div>
                )}

                {/* STEP 2: Phone */}
                {step === 2 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Contato</span>
                      <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                        Qual é o seu celular / WhatsApp?
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Insira com o DDD para que possamos entrar em contato se necessário.
                      </p>
                    </div>
                    <input
                      ref={phoneRef}
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={handlePhoneChange}
                      onKeyDown={(e) => handleKeyDown(e, goNext)}
                      className="w-full glass rounded-xl px-4 py-4 text-sm text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all font-medium bg-black/10"
                    />
                  </div>
                )}

                {/* STEP 3: Email */}
                {step === 3 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Correspondência</span>
                      <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                        Qual é o seu melhor e-mail?
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Utilizaremos este e-mail para enviar novidades importantes.
                      </p>
                    </div>
                    <input
                      ref={emailRef}
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, goNext)}
                      className="w-full glass rounded-xl px-4 py-4 text-sm text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all font-medium bg-black/10"
                    />
                  </div>
                )}

                {/* STEP 4: Mentorship Selection Card Grid */}
                {step === 4 && (
                  <div className="space-y-5 animate-fade-in">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Opção adquirida</span>
                      <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                        Qual mentoria você adquiriu?
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Selecione um dos modelos abaixo clicando diretamente nele.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        { id: "dropshipping", label: "Dropshipping" },
                        { id: "infoproduto", label: "Infoproduto" },
                        { id: "black", label: "Black" },
                        { id: "igaming", label: "iGaming" },
                        { id: "nutra", label: "Nutra" },
                        { id: "info", label: "Info" },
                        { id: "outra", label: "Outra", isSpecial: true }
                      ].map((opt) => {
                        const isSelected = mentorship === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setMentorship(opt.id);
                              if (opt.id !== "outra") {
                                setCustomMentorship("");
                              }
                            }}
                            className={`py-3 px-3 rounded-xl text-xs font-semibold text-center border transition-all duration-300 cursor-pointer relative group flex items-center justify-center gap-1.5 shrink-0 ${
                              isSelected
                                ? "gradient-primary text-white border-transparent shadow-[0_0_15px_oklch(0.65_0.22_290/0.3)] scale-[1.02]"
                                : "border-white/[0.06] bg-white/[0.01] text-muted-foreground hover:text-foreground hover:bg-white/[0.04] hover:border-white/15"
                            }`}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <Check className="h-3 w-3 text-white stroke-[3px] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Conditional Input for Outra Option */}
                    {mentorship === "outra" && (
                      <div className="animate-fade-up pt-1.5 space-y-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Qual mentoria?</span>
                        <input
                          ref={customRef}
                          type="text"
                          placeholder="Ex: Mentoria VIP Exclusiva"
                          value={customMentorship}
                          onChange={(e) => setCustomMentorship(e.target.value)}
                          className="w-full glass rounded-xl px-4 py-3.5 text-xs text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all font-medium bg-black/10"
                        />
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Bottom Navigation Buttons */}
              <div className="mt-8 pt-5 border-t border-white/[0.04] flex items-center justify-between">
                <div>
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={goPrev}
                      className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                    </button>
                  )}
                </div>

                <div>
                  {step < 4 ? (
                    <button
                      type="button"
                      onClick={goNext}
                      className="px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold glow hover:scale-[1.01] active:scale-[0.99] flex items-center gap-1.5 cursor-pointer"
                    >
                      Próximo <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={loading || !mentorship}
                      onClick={handleSubmit}
                      className="px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold glow hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Enviando...
                        </>
                      ) : (
                        <>
                          Finalizar <Check className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Minimal Success State */
            <div className="text-left animate-fade-up py-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.15)] mb-5">
                <Check className="h-5 w-5 text-emerald-400 stroke-[3px]" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Dados enviados!
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Seu acesso será aprovado em breve, basta aguardar contato.
              </p>

              {/* Simple Details Table */}
              <div className="glass rounded-xl p-5 my-6 text-xs border border-white/[0.04] bg-white/[0.01] space-y-3">
                
                {/* Nome Row */}
                <div className="flex justify-between items-center group/row border-b border-white/[0.03] pb-2 last:border-0 last:pb-0">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider font-mono">Nome</span>
                    <span className="text-foreground font-medium text-xs mt-0.5">{name}</span>
                  </div>
                  <button
                    onClick={() => handleEditField(1)}
                    className="p-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] opacity-45 hover:opacity-100 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all flex items-center gap-1 cursor-pointer text-[10px] font-semibold"
                    title="Editar nome"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Editar</span>
                  </button>
                </div>

                {/* Celular Row */}
                <div className="flex justify-between items-center group/row border-b border-white/[0.03] pb-2 last:border-0 last:pb-0">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider font-mono">Celular</span>
                    <span className="text-foreground font-medium text-xs mt-0.5">{phone}</span>
                  </div>
                  <button
                    onClick={() => handleEditField(2)}
                    className="p-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] opacity-45 hover:opacity-100 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all flex items-center gap-1 cursor-pointer text-[10px] font-semibold"
                    title="Editar celular"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Editar</span>
                  </button>
                </div>

                {/* E-mail Row */}
                <div className="flex justify-between items-center group/row border-b border-white/[0.03] pb-2 last:border-0 last:pb-0">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider font-mono">E-mail</span>
                    <span className="text-foreground font-medium text-xs mt-0.5 break-all pr-2">{email}</span>
                  </div>
                  <button
                    onClick={() => handleEditField(3)}
                    className="p-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] opacity-45 hover:opacity-100 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all flex items-center gap-1 cursor-pointer text-[10px] font-semibold shrink-0"
                    title="Editar e-mail"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Editar</span>
                  </button>
                </div>

                {/* Mentoria Row */}
                <div className="flex justify-between items-center group/row border-b border-white/[0.03] pb-2 last:border-0 last:pb-0">
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-muted-foreground/60 uppercase font-bold tracking-wider font-mono">Mentoria</span>
                    <span className="text-primary font-bold text-xs mt-0.5 capitalize">{mentorship === "outra" ? customMentorship : mentorship}</span>
                  </div>
                  <button
                    onClick={() => handleEditField(4)}
                    className="p-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] opacity-45 hover:opacity-100 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all flex items-center gap-1 cursor-pointer text-[10px] font-semibold"
                    title="Editar mentoria"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Editar</span>
                  </button>
                </div>

              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="w-full inline-flex items-center justify-center bg-white/5 border border-white/8 hover:bg-white/10 text-foreground rounded-lg py-2.5 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Enviar outro
                </button>
                <a
                  href="/"
                  className="w-full inline-flex items-center justify-center bg-white/5 border border-white/8 hover:bg-white/10 text-foreground rounded-lg py-2.5 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Voltar ao Início
                </a>
              </div>
            </div>
          )}

          {/* Minimalist Footer Back Link */}
          {!success && (
            <div className="text-center text-[10px] text-muted-foreground/60 mt-6 border-t border-white/[0.04] pt-4">
              <a href="/" className="hover:text-foreground transition-colors">
                ← Voltar para a Home
              </a>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
