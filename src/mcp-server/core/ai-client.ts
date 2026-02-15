// ============================================================
// MCP Server — AI Client
// Abstraction over Gemini API: supports direct key and backend proxy.
// ============================================================

import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================
// Types
// ============================================================

export interface AIGenerateOptions {
  prompt: string;
  model?: string;
  systemInstruction?: string;
}

export interface AIClient {
  generateText(options: AIGenerateOptions): Promise<string>;
}

// ============================================================
// Configuration — read from Node.js env
// ============================================================

function getConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '',
    backendUrl: process.env.BACKEND_URL || process.env.VITE_BACKEND_URL || '',
    defaultModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  };
}

// ============================================================
// Direct Gemini Client
// ============================================================

export class DirectAIClient implements AIClient {
  private genai: GoogleGenerativeAI;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel: string) {
    this.genai = new GoogleGenerativeAI(apiKey);
    this.defaultModel = defaultModel;
  }

  async generateText(options: AIGenerateOptions): Promise<string> {
    const model = this.genai.getGenerativeModel({
      model: options.model || this.defaultModel,
      systemInstruction: options.systemInstruction,
    });
    const result = await model.generateContent(options.prompt);
    return result.response.text();
  }
}

// ============================================================
// Backend Proxy Client (uses BACKEND_URL)
// ============================================================

export class ProxyAIClient implements AIClient {
  private backendUrl: string;
  private defaultModel: string;

  constructor(backendUrl: string, defaultModel: string) {
    this.backendUrl = backendUrl.replace(/\/$/, ''); // strip trailing slash
    this.defaultModel = defaultModel;
  }

  async generateText(options: AIGenerateOptions): Promise<string> {
    const url = `${this.backendUrl}/api/generate-text`;
    console.error(`[MCP Proxy] POST ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: options.prompt,
        systemInstruction: options.systemInstruction,
        model: options.model || this.defaultModel,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Backend proxy error (${response.status}): ${errBody}`);
    }

    const data = (await response.json()) as { text: string };
    return data.text;
  }
}

// ============================================================
// Factory
// ============================================================

/**
 * Create the appropriate AI client based on environment:
 * - If BACKEND_URL is set → use proxy (no API key needed)
 * - If GEMINI_API_KEY is set → use direct Gemini API
 * - Otherwise → throw
 */
export function createAIClient(): AIClient {
  const cfg = getConfig();

  if (cfg.backendUrl) {
    console.error(`[MCP] Using backend proxy: ${cfg.backendUrl}`);
    return new ProxyAIClient(cfg.backendUrl, cfg.defaultModel);
  }

  if (cfg.apiKey) {
    console.error('[MCP] Using direct Gemini API key');
    return new DirectAIClient(cfg.apiKey, cfg.defaultModel);
  }

  throw new Error(
    'No AI configuration found. Set BACKEND_URL for proxy mode, or GEMINI_API_KEY for direct API.',
  );
}

/**
 * Get the configured model name.
 */
export function getDefaultModel(): string {
  return getConfig().defaultModel;
}
