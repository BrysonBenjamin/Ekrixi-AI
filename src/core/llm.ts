import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { useSessionStore } from '../store/useSessionStore';

/**
 * Utility to get the Gemini API client outside of React hooks.
 * Prioritizes user-provided key in session store, then falls back to env config.
 */
export const getGeminiClient = () => {
  const { apiKeys } = useSessionStore.getState();
  let activeKey = apiKeys?.gemini || config.geminiApiKey;

  // Handle explicit community key opt-in
  if (activeKey === 'USE_COMMUNITY_KEY') {
    activeKey = config.geminiApiKey;
  }

  if (!activeKey) {
    return null;
  }

  return new GoogleGenerativeAI(activeKey);
};

/**
 * Unified model configuration
 */
export const GEMINI_MODELS = {
  FLASH: 'gemini-2.5-flash',
  PRO: 'gemini-2.5-flash',
};
