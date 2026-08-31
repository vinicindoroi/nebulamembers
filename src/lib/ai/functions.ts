import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { openaiClient, geminiClient } from "./client";

/**
 * Zod Schemas for input validation
 */
const generateQuizSchema = z.object({
  lessonText: z.string().min(10, "O texto da aula deve ter pelo menos 10 caracteres."),
  numberOfQuestions: z.number().min(1).max(10).default(3),
});

const summarizeLessonSchema = z.object({
  lessonTitle: z.string().min(2, "O título da aula deve ter pelo menos 2 caracteres."),
  lessonText: z.string().min(10, "O conteúdo da aula deve ter pelo menos 10 caracteres."),
});

const autocompleteNoteSchema = z.object({
  noteContext: z.string().min(3, "O contexto da nota deve ter pelo menos 3 caracteres."),
});

/**
 * Interface definition for Quiz Output
 */
export interface QuizQuestion {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface QuizOutput {
  quizTitle: string;
  questions: QuizQuestion[];
}

/**
 * Server Function 1: Generate Quiz (OpenAI Structured Output)
 * Generates a fully typed multiple-choice quiz based on lesson text.
 */
export const generateQuizFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => generateQuizSchema.parse(data))
  .handler(async ({ data }) => {
    const { lessonText, numberOfQuestions } = data;

    const prompt = `Analise o seguinte texto de aula e gere um questionário (quiz) com exatamente ${numberOfQuestions} perguntas de múltipla escolha.
Cada pergunta deve conter quatro opções, o índice correto (0 a 3) e uma breve explicação sobre o porquê de aquela ser a opção correta.
Evite perguntas genéricas e foque nos principais conceitos técnicos e intelectuais abordados no texto.

Texto da Aula:
${lessonText}`;

    // Strictly structured JSON Schema for OpenAI Structured Outputs
    const quizSchema = {
      name: "quiz_generator",
      description: "Gera um questionário estruturado de múltipla escolha a partir do texto de uma aula.",
      schema: {
        type: "object",
        properties: {
          quizTitle: {
            type: "string",
            description: "Título curto e engajador para este quiz."
          },
          questions: {
            type: "array",
            description: `Lista de perguntas de múltipla escolha. Deve conter exatamente ${numberOfQuestions} itens.`,
            items: {
              type: "object",
              properties: {
                questionText: {
                  type: "string",
                  description: "O enunciado da pergunta de forma clara."
                },
                options: {
                  type: "array",
                  description: "Lista contendo exatamente 4 opções de resposta textual.",
                  items: {
                    type: "string"
                  }
                },
                correctOptionIndex: {
                  type: "number",
                  description: "O índice baseado em zero da opção de resposta correta (0, 1, 2 ou 3)."
                },
                explanation: {
                  type: "string",
                  description: "Uma explicação didática detalhando por que a resposta é correta e onde o conceito foi abordado."
                }
              },
              required: ["questionText", "options", "correctOptionIndex", "explanation"],
              additionalProperties: false
            }
          }
        },
        required: ["quizTitle", "questions"],
        additionalProperties: false
      }
    };

    try {
      const quiz = await openaiClient.generateStructuredOutput<QuizOutput>(
        [
          { 
            role: "system", 
            content: "Você é um assistente educacional de elite. Você ajuda professores a criarem quizzes acadêmicos e técnicos altamente didáticos, com 100% de acurácia conceitual." 
          },
          { role: "user", content: prompt }
        ],
        quizSchema
      );

      return {
        success: true,
        quiz,
      };
    } catch (error: any) {
      console.error("[generateQuizFn] Error generating quiz:", error);
      return {
        success: false,
        error: error.message || "Erro desconhecido ao gerar o questionário.",
      };
    }
  });

/**
 * Server Function 2: Summarize Lesson (Google Gemini - Text)
 * Creates a premium, comprehensive markdown study summary for students.
 */
export const summarizeLessonFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => summarizeLessonSchema.parse(data))
  .handler(async ({ data }) => {
    const { lessonTitle, lessonText } = data;

    const prompt = `Você é uma inteligência artificial especialista em educação e neuroaprendizagem para alunos premium.
Seu objetivo é ler a aula fornecida abaixo e criar um Resumo de Estudo altamente otimizado para fixação de conceitos.

Título da Aula: ${lessonTitle}

Instruções de formatação:
1. Use markdown bem estruturado com títulos (##), listas e ênfase (**negrito**).
2. Comece com uma seção de "## 🎯 Objetivo Principal" descrevendo brevemente o foco central da aula.
3. Crie uma seção de "## 💡 Conceitos-Chave" explicando os conceitos mais importantes de forma resumida mas densa.
4. Crie uma seção de "## 🚀 Passos Práticos / Aplicação" detalhando como colocar esse aprendizado em prática.
5. Termine com uma frase de fixação marcante.
6. Escreva inteiramente em português do Brasil de forma estimulante e profissional.

Conteúdo da Aula para Resumir:
${lessonText}`;

    try {
      const summaryMarkdown = await geminiClient.generateText(prompt, {
        temperature: 0.5, // slightly more deterministic for summaries
      });

      return {
        success: true,
        summary: summaryMarkdown,
      };
    } catch (error: any) {
      console.error("[summarizeLessonFn] Error summarizing lesson:", error);
      return {
        success: false,
        error: error.message || "Erro desconhecido ao resumir a aula.",
      };
    }
  });

/**
 * Server Function 3: Autocomplete Note (OpenAI GPT-4o-mini - Text)
 * Contextual fast autocomplete to assist students taking notes in Tiptap.
 */
export const autocompleteNoteFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => autocompleteNoteSchema.parse(data))
  .handler(async ({ data }) => {
    const { noteContext } = data;

    const messages = [
      {
        role: "system" as const,
        content: "Você é um assistente de escrita ágil. O usuário está fazendo anotações sobre uma aula. Complete o pensamento atual do usuário adicionando apenas uma ou duas frases curtas no mesmo estilo e tom que ele está usando. Retorne APENAS a continuação direta do texto fornecido, sem introduções, aspas ou explicações."
      },
      {
        role: "user" as const,
        content: `Continue escrevendo esta anotação: \n"${noteContext}"`
      }
    ];

    try {
      const completionText = await openaiClient.generateText(messages, {
        model: "gpt-4o-mini",
        temperature: 0.7,
        maxTokens: 100, // keep completions short and sweet
      });

      return {
        success: true,
        completion: completionText,
      };
    } catch (error: any) {
      console.error("[autocompleteNoteFn] Error generating note completion:", error);
      return {
        success: false,
        error: error.message || "Erro desconhecido ao completar a nota.",
      };
    }
  });

/**
 * Server Function 4: Transcribe Audio (OpenAI Whisper API)
 * Accepts base64-encoded audio/video and returns the transcribed text.
 */
const transcribeAudioSchema = z.object({
  base64Data: z.string().min(1),
  mimeType: z.string().min(1),
  fileName: z.string().min(1),
});

export const transcribeAudioFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => transcribeAudioSchema.parse(data))
  .handler(async ({ data }) => {
    const { base64Data, mimeType, fileName } = data;
    const apiKey = import.meta.env?.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return { success: false, error: "OpenAI API key não configurada." };
    }

    try {
      // Reconstruct the binary file from base64
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });

      const formData = new FormData();
      formData.append("file", blob, fileName);
      formData.append("model", "whisper-1");
      formData.append("response_format", "verbose_json");

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Whisper API Error (${response.status}): ${err}`);
      }

      const result = await response.json();
      return {
        success: true,
        text: result.text as string,
        language: result.language as string,
        duration: result.duration as number,
      };
    } catch (error: any) {
      console.error("[transcribeAudioFn] Error:", error);
      return { success: false, error: error.message || "Erro ao transcrever áudio." };
    }
  });

/**
 * Server Function 5: Analyze Creative Copy (OpenAI Structured Output)
 * Performs an in-depth copywriting and persuasive structure audit on an ad script.
 */
const analyzeCreativeCopySchema = z.object({
  text: z.string().min(10, "O texto a ser analisado deve ter pelo menos 10 caracteres."),
});

export interface CreativeAnalysisOutput {
  confidence: number;
  formula: string;
  strengths: string[];
  weaknesses: string[];
  structure: {
    block: string;
    excerpt: string;
    purpose: string;
  }[];
}

export const analyzeCreativeCopyFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => analyzeCreativeCopySchema.parse(data))
  .handler(async ({ data }) => {
    const { text } = data;

    const prompt = `Analise a seguinte copy ou roteiro de anúncio criativo e faça um raio-x completo do seu copywriting.
Você deve identificar a fórmula ou framework de copy utilizado (ex: AIDA, PAS, Roteiro de 3 Passos), avaliar os pontos fortes e pontos fracos de forma didática, dar uma nota de 0 a 100 para a qualidade geral da copy e mapear a anatomia ou estrutura invisível do anúncio, destacando trechos exatos (excerpts) e o propósito persuasivo de cada bloco.

Copy / Roteiro do Criativo:
${text}`;

    const creativeAnalysisSchema = {
      name: "creative_copy_analyzer",
      description: "Faz um diagnóstico estruturado e profundo de copywriting de um criativo.",
      schema: {
        type: "object",
        properties: {
          confidence: {
            type: "number",
            description: "Nota geral de qualidade da copy de 0 a 100 baseada em poder de conversão."
          },
          formula: {
            type: "string",
            description: "A fórmula de copy identificada no texto (ex: AIDA, PAS, etc.)."
          },
          strengths: {
            type: "array",
            description: "Lista de 3 a 5 pontos fortes da copy (por que funciona).",
            items: { type: "string" }
          },
          weaknesses: {
            type: "array",
            description: "Lista de 3 a 5 pontos fracos ou oportunidades de melhoria (o que melhorar).",
            items: { type: "string" }
          },
          structure: {
            type: "array",
            description: "Mapeamento da anatomia da copy em blocos sequenciais.",
            items: {
              type: "object",
              properties: {
                block: {
                  type: "string",
                  description: "Nome do bloco (ex: Gancho, História, Oferta, CTA)."
                },
                excerpt: {
                  type: "string",
                  description: "Trecho exato da copy correspondente a este bloco."
                },
                purpose: {
                  type: "string",
                  description: "O propósito persuasivo deste bloco específico."
                }
              },
              required: ["block", "excerpt", "purpose"],
              additionalProperties: false
            }
          }
        },
        required: ["confidence", "formula", "strengths", "weaknesses", "structure"],
        additionalProperties: false
      }
    };

    try {
      const analysis = await openaiClient.generateStructuredOutput<CreativeAnalysisOutput>(
        [
          {
            role: "system",
            content: "Você é um Copywriter de Elite e Diretor de Criação de Anúncios de alta conversão. Você analisa roteiros de anúncios e identifica exatamente a estrutura de persuasão científica por trás deles."
          },
          { role: "user", content: prompt }
        ],
        creativeAnalysisSchema
      );

      return {
        success: true,
        analysis,
      };
    } catch (error: any) {
      console.error("[analyzeCreativeCopyFn] Error auditing creative copy:", error);
      return {
        success: false,
        error: error.message || "Erro desconhecido ao analisar a copy do criativo.",
      };
    }
  });
