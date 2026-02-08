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

  // Backend proxy configuration
  // If backendUrl is set, API calls will go through the backend proxy
  // Otherwise, they'll use the client-side API key (if provided)
  backendUrl: import.meta.env.VITE_BACKEND_URL || '',
  useBackendProxy: !!import.meta.env.VITE_BACKEND_URL,

  // Local LLM configuration (for development)
  useLocalLLM: import.meta.env.VITE_USE_LOCAL_LLM === 'true',
  localLLMUrl: import.meta.env.VITE_LOCAL_LLM_URL || 'http://localhost:8080/v1/chat/completions',
  localLLMModel: import.meta.env.VITE_LOCAL_LLM_MODEL || 'mlx-model',

  // Database Configuration
  useLocalDatabase:
    import.meta.env.VITE_USE_LOCAL_DB === 'true' ||
    (!import.meta.env.VITE_FIREBASE_API_KEY && !import.meta.env.PROD),

  // Firebase Configuration
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    databaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)',
  },
};
