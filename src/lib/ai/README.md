# 🧠 Guia de Integração de IA Híbrida (OpenAI + Gemini)

Esta pasta contém o ecossistema de inteligência artificial do **Nebula Member Hub**. Adotamos uma **arquitetura híbrida premium** para extrair o melhor de cada provedor, maximizando o desempenho técnico e minimizando custos:

1.  **Google Gemini (`gemini-1.5-flash`):** Ideal para processar grandes volumes de texto (aulas, transcrições de áudio/vídeo) e gerar resumos robustos com sua gigantesca janela de contexto de 2 milhões de tokens.
2.  **OpenAI GPT-4o-mini:** Ideal para tarefas que exigem saídas altamente estruturadas e rígidas (JSON estruturado como questionários e quizzes) e autocompletes de latência ultra-baixa no editor de notas.

---

## 🔒 Segurança e Ambiente (Cloudflare Workers)

As chaves de API **nunca** devem ser acessadas no lado do cliente (navegador). Todas as chamadas para OpenAI e Gemini são protegidas por **Server Functions** do TanStack Start, que executam estritamente no servidor (Cloudflare Worker/Edge) e têm acesso seguro às variáveis de ambiente.

### Configuração de Chaves

#### Localmente (Desenvolvimento)
Adicione suas chaves nos arquivos `.env` e `.dev.vars` na raiz do seu projeto:
```env
OPENAI_API_KEY="sk-proj-..."
GEMINI_API_KEY="AIzaSy..."
```

#### Em Produção (Cloudflare Pages/Workers)
Adicione as chaves como segredos criptografados usando o Wrangler CLI no terminal:
```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put GEMINI_API_KEY
```
Ou adicione diretamente pelo painel administrativo da **Cloudflare > Workers & Pages > Settings > Variables > Environment Variables**.

---

## 🚀 Como Utilizar no Frontend (React)

As funções exportadas em `src/lib/ai/functions.ts` são **Server Functions**. Você pode importá-las e chamá-las no frontend exatamente como se fossem funções assíncronas normais do JavaScript! O TanStack Start cuida de toda a comunicação HTTP por baixo dos panos.

### Exemplo 1: Gerador de Quiz (OpenAI Structured JSON)

No módulo de administração de cursos (`admin.courses.tsx` ou similar), você pode criar um botão para gerar automaticamente um quiz baseado no texto da aula atual:

```tsx
import { useState } from "react";
import { generateQuizFn, type QuizOutput } from "@/lib/ai/functions";
import { toast } from "sonner";
import { BrainCircuit, Loader2 } from "lucide-react";

export function CourseQuizGenerator({ lessonText }: { lessonText: string }) {
  const [loading, setLoading] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<QuizOutput | null>(null);

  const handleGenerateQuiz = async () => {
    if (!lessonText || lessonText.length < 10) {
      toast.error("O texto da aula é muito curto para gerar um quiz.");
      return;
    }

    setLoading(true);
    try {
      // Chamada direta da Server Function com tipagem completa!
      const result = await generateQuizFn({ 
        data: { 
          lessonText, 
          numberOfQuestions: 3 
        } 
      });

      if (result.success && result.quiz) {
        setGeneratedQuiz(result.quiz);
        toast.success("Quiz gerado com sucesso pelo OpenAI!");
      } else {
        toast.error(result.error || "Erro ao gerar o quiz.");
      }
    } catch (err: any) {
      toast.error(`Falha técnica: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-xl glass">
      <h3 className="text-sm font-bold flex items-center gap-2">
        <BrainCircuit className="h-4 w-4 text-primary" /> Gerador de Quizzes IA
      </h3>
      
      <button
        onClick={handleGenerateQuiz}
        disabled={loading}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processando com OpenAI...
          </>
        ) : (
          "Gerar Quiz Automaticamente"
        )}
      </button>

      {generatedQuiz && (
        <div className="mt-4 space-y-4">
          <h4 className="font-semibold text-lg text-primary">{generatedQuiz.quizTitle}</h4>
          {generatedQuiz.questions.map((q, idx) => (
            <div key={idx} className="p-3 border rounded-lg bg-white/[0.02]">
              <p className="font-medium text-sm">{idx + 1}. {q.questionText}</p>
              <ul className="mt-2 space-y-1 text-xs">
                {q.options.map((opt, oIdx) => (
                  <li key={oIdx} className={oIdx === q.correctOptionIndex ? "text-emerald-400 font-bold" : "text-muted-foreground"}>
                    {opt} {oIdx === q.correctOptionIndex && "✓"}
                  </li>
                ))}
              </ul>
              <p className="text-muted-foreground text-[10px] mt-2 italic">Explicação: {q.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### Exemplo 2: Resumidor de Aulas (Google Gemini - Alta Janela de Contexto)

Ideal para permitir que os alunos gerem resumos estruturados de aulas muito extensas:

```tsx
import { useState } from "react";
import { summarizeLessonFn } from "@/lib/ai/functions";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

export function LessonSummarizer({ title, content }: { title: string; content: string }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const handleSummarize = async () => {
    setLoading(true);
    try {
      // Chama a Server Function do Gemini
      const result = await summarizeLessonFn({
        data: { 
          lessonTitle: title, 
          lessonText: content 
        }
      });

      if (result.success && result.summary) {
        setSummary(result.summary);
        toast.success("Resumo conceitual gerado pelo Gemini Flash!");
      } else {
        toast.error(result.error || "Erro ao gerar resumo.");
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleSummarize}
        disabled={loading}
        className="px-4 py-2 border border-primary/20 hover:bg-primary/5 rounded-lg flex items-center gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-yellow-400" />}
        Gerar Resumo com Gemini
      </button>

      {summary && (
        <div className="prose prose-invert max-w-none p-4 rounded-xl border border-white/[0.06] bg-black/10 text-sm whitespace-pre-wrap">
          {summary}
        </div>
      )}
    </div>
  );
}
```
