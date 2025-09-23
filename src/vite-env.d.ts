/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_BASE_URL?: string;
  readonly VITE_BFL_API_BASE?: string;
  readonly VITE_BFL_API_KEY?: string;
  readonly VITE_BFL_WEBHOOK_SECRET?: string;
  readonly VITE_RECRAFT_API_BASE?: string;
  readonly VITE_RECRAFT_API_KEY?: string;
  readonly VITE_SITE_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
