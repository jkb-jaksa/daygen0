const rawBase = import.meta.env.VITE_API_BASE_URL
  ?? import.meta.env.VITE_BASE_URL
  ?? '';

const cleanedBase = typeof rawBase === 'string' ? rawBase.trim() : '';
const hasCustomBase = cleanedBase.length > 0 && cleanedBase !== '/';
const baseWithFallback = hasCustomBase ? cleanedBase : '/api';

const normalizedBase = baseWithFallback.replace(/\/$/, '');

export const API_BASE_URL = normalizedBase;

const ensureAbsoluteBase = (base: string): string => {
  if (base.startsWith('http://') || base.startsWith('https://') || base.startsWith('/')) {
    return base;
  }
  return `/${base}`;
};

export const getApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const absoluteBase = ensureAbsoluteBase(normalizedBase);
  return absoluteBase ? `${absoluteBase}${normalizedPath}` : normalizedPath;
};
