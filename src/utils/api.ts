const rawBase = (import.meta as any)?.env?.VITE_API_BASE_URL
  ?? (import.meta as any)?.env?.VITE_BASE_URL
  ?? '';

const normalizedBase = typeof rawBase === 'string' && rawBase.length > 0
  ? rawBase.replace(/\/$/, '')
  : '';

export const API_BASE_URL = normalizedBase;

export const getApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return normalizedBase ? `${normalizedBase}${normalizedPath}` : normalizedPath;
};
