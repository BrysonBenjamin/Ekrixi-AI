/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_USE_LOCAL_LLM: string;
  readonly VITE_LOCAL_LLM_URL: string;
  readonly VITE_LOCAL_LLM_MODEL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
