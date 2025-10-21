type ApiEnv = ImportMetaEnv & {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_BASE_URL?: string;
};

const env = import.meta.env as ApiEnv;

const rawBase = env?.VITE_API_BASE_URL
  ?? env?.VITE_BASE_URL
  ?? 'http://localhost:3000';

const normalizedBase = typeof rawBase === 'string' && rawBase.length > 0
  ? rawBase.replace(/\/$/, '')
  : '';

export const API_BASE_URL = normalizedBase;

export const getApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
};
