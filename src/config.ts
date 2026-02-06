export const config = {
  features: {
    // Enable Google SSO and Drive Sync.
    // Can be toggled via VITE_ENABLE_SSO env var (true/false).
    // Defaults to true in production, false in dev if CLIENT_ID is missing.
    enableSSO:
      import.meta.env.VITE_ENABLE_SSO === 'true' ||
      (import.meta.env.PROD && !!import.meta.env.VITE_GOOGLE_CLIENT_ID),
  },
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  useLocalLLM: import.meta.env.VITE_USE_LOCAL_LLM === 'true',
  localLLMUrl: import.meta.env.VITE_LOCAL_LLM_URL || 'http://localhost:8080/v1/chat/completions',
  localLLMModel: import.meta.env.VITE_LOCAL_LLM_MODEL || 'mlx-model',
};
