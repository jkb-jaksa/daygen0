import { resolveApiErrorMessage } from './errorMessages';

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
}

/**
 * Creates an AbortSignal that auto-aborts after a timeout
 * @param parentSignal - Optional parent signal to chain abortion from
 * @param timeoutMs - Timeout duration in milliseconds (default: 120000 = 2 minutes)
 * @returns AbortSignal that will abort after timeout or when parent aborts
 * 
 * @example
 * // Simple timeout
 * const signal = withTimeout(undefined, 60000); // 60s timeout
 * 
 * @example
 * // Chain with manual abort
 * const controller = new AbortController();
 * const signal = withTimeout(controller.signal, 30000); // 30s timeout + manual abort
 * // Later: controller.abort() to cancel manually
 */
export function withTimeout(
  parentSignal?: AbortSignal,
  timeoutMs: number = 120000
): AbortSignal {
  const controller = new AbortController();
  
  // If parent aborts, abort child
  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort(parentSignal.reason);
    } else {
      parentSignal.addEventListener('abort', () => {
        controller.abort(parentSignal.reason);
      });
    }
  }
  
  // Auto-abort after timeout
  const timeoutId = setTimeout(() => {
    controller.abort(new Error('Request timeout'));
  }, timeoutMs);
  
  // Clean up timeout when signal aborts
  controller.signal.addEventListener('abort', () => {
    clearTimeout(timeoutId);
  });
  
  return controller.signal;
};

/**
 * Build a URL with optional query parameters
 * @param path - The base path (e.g., '/api/images')
 * @param query - Optional object with query parameters
 * @returns Complete URL string with query parameters
 * 
 * @example
 * buildUrl('/api/images', { page: 2, q: 'cat' })
 * // => '/api/images?page=2&q=cat'
 * 
 * @example
 * buildUrl('/api/users/me') // No query params
 * // => '/api/users/me'
 * 
 * @example
 * buildUrl('/api/search', { q: 'test', filter: undefined })
 * // => '/api/search?q=test' (undefined values filtered out)
 */
export function buildUrl(
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>
): string {
  const baseUrl = getApiUrl(path);
  
  if (!query) {
    return baseUrl;
  }
  
  const params = new URLSearchParams();
  
  // Add non-null/undefined values to params
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('daygen:authToken');
}

/**
 * Options for apiFetch function
 * 
 * @example
 * // With timeout (auto-abort after 60s)
 * const result = await apiFetch('/api/slow', {
 *   signal: withTimeout(undefined, 60000)
 * });
 * 
 * @example
 * // With manual abort + timeout
 * const controller = new AbortController();
 * const result = await apiFetch('/api/slow', {
 *   signal: withTimeout(controller.signal, 30000)
 * });
 * // Later: controller.abort() to cancel manually
 */
export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;  // default: true
  signal?: AbortSignal;
  context?: 'generation' | 'download' | 'upload' | 'auth';
}

/**
 * Centralized API fetch wrapper that handles:
 * - URL construction via getApiUrl
 * - Authorization headers (when auth=true)
 * - JSON parsing with error handling
 * - Standardized error messages
 * 
 * @example
 * // GET request with auth
 * const user = await apiFetch<User>('/api/auth/me');
 * 
 * @example
 * // POST request without auth
 * const result = await apiFetch('/api/public/endpoint', { 
 *   method: 'POST', 
 *   body: { data: 'value' },
 *   auth: false 
 * });
 * 
 * @example
 * // POST with custom context for error handling
 * const image = await apiFetch('/api/image/generate', {
 *   method: 'POST',
 *   body: { prompt: 'test' },
 *   context: 'generation'
 * });
 * 
 * @example
 * // With timeout for long operations
 * const result = await apiFetch('/api/unified-generate', {
 *   method: 'POST',
 *   body: { prompt: 'test', model: 'flux-pro' },
 *   signal: withTimeout(undefined, 180000) // 3 minutes
 * });
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    auth = true,
    signal,
    context
  } = options;

  // Build URL
  const url = getApiUrl(path);

  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add auth header if needed
  if (auth) {
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  // Prepare fetch options
  const fetchOptions: RequestInit = {
    method,
    headers,
    signal,
  };

  // Add body for non-GET requests
  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    // Make the request
    const response = await fetch(url, fetchOptions);

    // Parse response safely
    const payload = await response.json().catch(() => null);

    // Handle non-OK responses
    if (!response.ok) {
      const errorMessage = payload?.error || payload?.message || null;
      const message = resolveApiErrorMessage({
        status: response.status,
        message: errorMessage,
        context,
      });
      throw new Error(message);
    }

    return payload as T;
  } catch (error) {
    // Handle abort and timeout errors
    if (error instanceof Error) {
      // Check for AbortError (DOMException)
      if (error.name === 'AbortError') {
        const isTimeout = error.message.includes('timeout') || error.message.includes('Request timeout');
        const message = isTimeout 
          ? resolveApiErrorMessage({ context, message: 'Request timeout' })
          : resolveApiErrorMessage({ context, message: 'Request cancelled' });
        throw new Error(message);
      }
      
      // Check for timeout in error message
      if (error.message.toLowerCase().includes('timeout')) {
        const message = resolveApiErrorMessage({ context, message: 'Request timeout' });
        throw new Error(message);
      }
    }
    
    // Re-throw other errors
    throw error;
  }
}
