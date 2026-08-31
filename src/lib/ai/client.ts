// Low-level API Client for OpenAI and Google Gemini using Edge-compatible fetch.
// This file executes strictly on the server-side within Server Functions or Cloudflare Workers.

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiConfig {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

// Helper to retrieve API keys securely
function getApiKey(provider: 'openai' | 'gemini'): string {
  // Check import.meta.env for client-side or Vite build replacement
  // Fall back to process.env for SSR and Cloudflare Worker runtime
  const key = provider === 'openai' 
    ? (import.meta.env?.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY)
    : (import.meta.env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY);

  if (!key) {
    const errorMsg = `[AI Integration] Missing API Key for ${provider.toUpperCase()}. Please configure ${provider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY'} in your environment (.env, .dev.vars, or Cloudflare Worker Secrets).`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return key;
}

/**
 * OpenAI REST Client
 */
export const openaiClient = {
  /**
   * Generates simple text responses using GPT models
   */
  async generateText(
    messages: Message[],
    config: OpenAIConfig = {}
  ): Promise<string> {
    const apiKey = getApiKey('openai');
    const model = config.model || 'gpt-4o-mini';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API Error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  },

  /**
   * Generates strictly formatted JSON outputs enforced by OpenAI's JSON Schema.
   * Perfect for reliable data parsing, quizzes, schemas, and forms evaluation.
   */
  async generateStructuredOutput<T>(
    messages: Message[],
    schema: {
      name: string;
      description?: string;
      schema: Record<string, any>; // JSON Schema object
    },
    config: OpenAIConfig = {}
  ): Promise<T> {
    const apiKey = getApiKey('openai');
    const model = config.model || 'gpt-4o-mini';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: config.temperature ?? 0.2, // Lower temperature for more structured consistency
        max_tokens: config.maxTokens,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: schema.name,
            strict: true,
            schema: schema.schema,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI Structured Output Error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response for structured output.');
    }

    return JSON.parse(content) as T;
  },
};

/**
 * Google Gemini REST Client
 */
export const geminiClient = {
  /**
   * Generates rich content using Gemini models
   */
  async generateText(
    prompt: string,
    config: GeminiConfig = {}
  ): Promise<string> {
    const apiKey = getApiKey('gemini');
    const model = config.model || 'gemini-1.5-flash';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: config.temperature ?? 0.7,
            maxOutputTokens: config.maxOutputTokens,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidateText === undefined) {
      throw new Error(`Gemini API returned an unexpected payload structure: ${JSON.stringify(data)}`);
    }

    return candidateText;
  },

  /**
   * Generates JSON formatted text using Gemini's native JSON support.
   */
  async generateJSON<T>(
    prompt: string,
    config: GeminiConfig = {}
  ): Promise<T> {
    const apiKey = getApiKey('gemini');
    const model = config.model || 'gemini-1.5-flash';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: config.temperature ?? 0.2,
            maxOutputTokens: config.maxOutputTokens,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini JSON API Error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Gemini JSON API returned an empty response.');
    }

    return JSON.parse(candidateText) as T;
  },

  /**
   * Multimodal processing.
   * Handles analyzing base64 encoded media files (images, audio, or even short video files) 
   * combined with text prompts. Amazing for courses modules.
   */
  async generateMultimodal(
    prompt: string,
    mediaFiles: Array<{ mimeType: string; base64Data: string }>,
    config: GeminiConfig = {}
  ): Promise<string> {
    const apiKey = getApiKey('gemini');
    const model = config.model || 'gemini-1.5-flash';

    const parts = mediaFiles.map((file) => ({
      inlineData: {
        mimeType: file.mimeType,
        data: file.base64Data,
      },
    }));

    // Append the text prompt part at the end
    parts.push({ inlineData: undefined as any, text: prompt } as any);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: parts.filter(p => p.text || (p as any).inlineData),
            },
          ],
          generationConfig: {
            temperature: config.temperature ?? 0.4,
            maxOutputTokens: config.maxOutputTokens,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini Multimodal API Error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidateText === undefined) {
      throw new Error('Gemini Multimodal API returned an empty or invalid response.');
    }

    return candidateText;
  },
};
