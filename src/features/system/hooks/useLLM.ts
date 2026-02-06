import { useEffect, useState } from 'react';
import { GoogleGenerativeAI, Content, GenerationConfig, Part } from '@google/generative-ai';
import { useSessionStore } from '../../../store/useSessionStore';
import { getGeminiClient, GEMINI_MODELS } from '../../../core/llm';
import { config } from '../../../config';

export const useLLM = () => {
  const { apiKeys, setApiKey } = useSessionStore();
  const [model, setModel] = useState<GoogleGenerativeAI | null>(null);

  // Watch for key changes in store
  const activeKey = apiKeys?.gemini;

  useEffect(() => {
    const client = getGeminiClient();
    setModel(client);
  }, [activeKey]);

  const generateText = async (prompt: string, systemInstruction?: string) => {
    if (config.useLocalLLM) {
      try {
        const messages = [];
        if (systemInstruction) {
          messages.push({ role: 'system', content: systemInstruction });
        }
        messages.push({ role: 'user', content: prompt });

        const response = await fetch(config.localLLMUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.localLLMModel,
            messages: messages,
            temperature: 0.7,
          }),
        });

        if (!response.ok) throw new Error(`Local LLM Error: ${response.statusText}`);
        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
      } catch (err) {
        console.error('Local LLM Generation Error', err);
        throw err;
      }
    }

    if (!model) throw new Error('LLM not initialized: Missing API Key');

    try {
      const geminiModel = model.getGenerativeModel({
        model: GEMINI_MODELS.FLASH,
        systemInstruction: systemInstruction,
      });
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('LLM Generation Error', error);
      throw error;
    }
  };

  const generateContent = async (options: {
    model?: string;
    systemInstruction?: string;
    contents: Content[];
    generationConfig?: GenerationConfig;
  }) => {
    if (config.useLocalLLM) {
      try {
        const messages = [];
        if (options.systemInstruction) {
          messages.push({ role: 'system', content: options.systemInstruction });
        }

        // Map Gemini contents to OpenAI messages
        options.contents.forEach((c: Content) => {
          const role = c.role === 'model' ? 'assistant' : 'user';
          const text =
            (c.parts as Part[])?.map((p: Part) => (p as { text: string }).text).join('\n') || '';
          messages.push({ role, content: text });
        });

        const response = await fetch(config.localLLMUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.localLLMModel,
            messages: messages,
            temperature: options.generationConfig?.temperature || 0.7,
            // Attempt to map JSON mode if requested, though MLX/Local support varies
            ...(options.generationConfig?.responseMimeType === 'application/json'
              ? { response_format: { type: 'json_object' } }
              : {}),
          }),
        });

        if (!response.ok) throw new Error(`Local LLM Error: ${response.statusText}`);
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';

        // Mimic Gemini response structure
        return {
          response: Promise.resolve({
            text: () => text,
            candidates: [{ content: { parts: [{ text }] } }],
          }),
        };
      } catch (err) {
        console.error('Local LLM Structured Generation Error', err);
        throw err;
      }
    }

    if (!model) throw new Error('LLM not initialized: Missing API Key');

    try {
      // Map legacy model names or use defaults
      let targetModel = options.model || GEMINI_MODELS.PRO;
      if (targetModel.includes('gemini-1.5-flash')) targetModel = GEMINI_MODELS.FLASH;
      if (targetModel.includes('gemini-1.5-pro')) targetModel = GEMINI_MODELS.PRO;

      const geminiModel = model.getGenerativeModel({
        model: targetModel,
        systemInstruction: options.systemInstruction,
      });
      return await geminiModel.generateContent({
        contents: options.contents,
        generationConfig: options.generationConfig,
      });
    } catch (error) {
      console.error('LLM Generation Error', error);
      throw error;
    }
  };

  return {
    isReady: !!model || config.useLocalLLM,
    hasKey: !!activeKey || config.useLocalLLM,
    setKey: (key: string) => setApiKey('gemini', key),
    generateText,
    generateContent,
  };
};
