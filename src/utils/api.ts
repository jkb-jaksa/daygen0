type ApiEnv = ImportMetaEnv & {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_BASE_URL?: string;
};

const env = import.meta.env as ApiEnv;

const rawBase = env?.VITE_API_BASE_URL
  ?? env?.VITE_BASE_URL
  ?? 'https://daygen-backend-365299591811.europe-central2.run.app';

const normalizedBase = typeof rawBase === 'string' && rawBase.length > 0
  ? rawBase.replace(/\/$/, '')
  : '';

export const API_BASE_URL = normalizedBase;

// Quick debugging - remove after testing
console.log('API Base URL:', normalizedBase);
console.log('Environment variables:', {
  VITE_API_BASE_URL: env?.VITE_API_BASE_URL,
  VITE_BASE_URL: env?.VITE_BASE_URL,
  rawBase,
  normalizedBase
});

export const getApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
  console.log(`getApiUrl('${path}') = '${fullUrl}'`);
  return fullUrl;
};
