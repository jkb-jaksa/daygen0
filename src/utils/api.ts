import { resolveApiErrorMessage, RETRYABLE_STATUS_CODES, DEFAULT_MAX_RETRIES, DEFAULT_INITIAL_DELAY_MS, DEFAULT_MAX_DELAY_MS, RETRY_BACKOFF_MULTIPLIER } from './errorMessages';
import { ensureValidToken } from './tokenManager';
import { debugLog, debugError } from './debug';

type ApiEnv = ImportMetaEnv & {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_BASE_URL?: string;
};

type ErrorWithStatus = Error & { status?: number };

const env = import.meta.env as ApiEnv;

const rawBase = env?.VITE_API_BASE_URL ?? env?.VITE_BASE_URL ?? '';

const normalizedBase = typeof rawBase === 'string' && rawBase.length > 0
  ? rawBase.replace(/\/$/, '')
  : '';

export const API_BASE_URL = normalizedBase;

if (!normalizedBase && import.meta.env.DEV) {
  console.info('[api] Using relative API base (dev proxy mode)');
}

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
 * Safely parse JSON from response, checking Content-Type first
 * Returns null for empty/non-JSON responses to avoid exceptions
 */
export async function parseJsonSafe(response: Response): Promise<unknown> {
  // Check if response has content
  if (response.status === 204 || response.headers.get('Content-Length') === '0') {
    return null;
  }
  
  // Check Content-Type
  const contentType = response.headers.get('Content-Type');
  if (!contentType || !contentType.includes('application/json')) {
    return null;
  }
  
  // Try parsing, return null on failure
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Options for retry logic
 */
export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  onStatuses?: number[];
  retryAfterHeader?: boolean;
}

/**
 * Retry wrapper with exponential backoff and Retry-After header support
 * 
 * @param fn - Function to retry
 * @param options - Retry configuration
 * @returns Promise that resolves with the function result or rejects after max retries
 * 
 * @example
 * // Basic retry with defaults
 * const result = await withRetry(() => fetch('/api/data'));
 * 
 * @example
 * // Custom retry configuration
 * const result = await withRetry(
 *   () => fetch('/api/data'),
 *   { maxRetries: 5, initialDelayMs: 500 }
 * );
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    initialDelayMs = DEFAULT_INITIAL_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
    onStatuses = RETRYABLE_STATUS_CODES,
    retryAfterHeader = true
  } = options;

  let lastError: Error;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry if we've hit max attempts
      if (attempt >= maxRetries) {
        throw lastError;
      }

      // Check if this is a retryable error
      const shouldRetry = isRetryableError(lastError, onStatuses);
      if (!shouldRetry) {
        throw lastError;
      }

      // Calculate delay with exponential backoff and jitter
      const baseDelay = Math.min(
        initialDelayMs * Math.pow(RETRY_BACKOFF_MULTIPLIER, attempt),
        maxDelayMs
      );
      
      // Add ±25% jitter to prevent thundering herd
      const jitter = (Math.random() - 0.5) * 0.5 * baseDelay;
      const delay = Math.max(0, baseDelay + jitter);

      // Check for Retry-After header if available
      let retryAfterMs: number | null = null;
      if (retryAfterHeader && lastError instanceof Error) {
        retryAfterMs = parseRetryAfterHeader(lastError);
      }

      const finalDelay = retryAfterMs !== null ? retryAfterMs : delay;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, finalDelay));
      
      attempt++;
    }
  }

  throw lastError!;
}

/**
 * Check if an error should trigger a retry
 */
function isRetryableError(error: Error, retryableStatuses: number[]): boolean {
  // Check if error has a status property (set by apiFetch)
  if ((error as ErrorWithStatus).status && typeof (error as ErrorWithStatus).status === 'number') {
    return retryableStatuses.includes((error as ErrorWithStatus).status);
  }
  
  // Check if error message contains a status code
  const statusMatch = error.message.match(/status[:\s]*(\d{3})/i);
  if (statusMatch) {
    const status = parseInt(statusMatch[1], 10);
    return retryableStatuses.includes(status);
  }
  
  // Check for specific error patterns that indicate retryable conditions
  const message = error.message.toLowerCase();
  return (
    message.includes('rate limit') ||
    message.includes('service unavailable') ||
    message.includes('temporary') ||
    message.includes('timeout')
  );
}

/**
 * Parse Retry-After header from error message or response
 * Supports both seconds (integer) and HTTP-date formats
 */
function parseRetryAfterHeader(error: Error): number | null {
  // Look for Retry-After in error message (this would need to be passed from the response)
  const retryAfterMatch = error.message.match(/retry[-\s]after[:\s]*(\d+)/i);
  if (retryAfterMatch) {
    return parseInt(retryAfterMatch[1], 10) * 1000; // Convert seconds to milliseconds
  }
  
  return null;
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
 * const image = await apiFetch('/api/image/gemini', {
 *   method: 'POST',
 *   body: { prompt: 'test' },
 *   context: 'generation'
 * });
 * 
 * @example
 * // With timeout for long operations
 * const result = await apiFetch('/api/image/flux', {
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
    try {
      debugLog('[API] Getting valid token...');
      const token = await ensureValidToken();
      headers.Authorization = `Bearer ${token}`;
      debugLog('[API] Token obtained, proceeding with request');
    } catch (error) {
      // If token validation fails, throw a clear error
      const message = error instanceof Error ? error.message : 'Authentication failed';
      debugError('[API] Token validation failed:', error);
      throw new Error(`Authentication error: ${message}`);
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

  return withRetry(
    async () => {
      // Make the request
      debugLog(`[API] Making ${method} request to ${url}`);
      const response = await fetch(url, fetchOptions);
      debugLog(`[API] Response received: ${response.status} ${response.statusText}`);

      // Parse response safely
      const payload = await parseJsonSafe(response);

      // Handle non-OK responses
      if (!response.ok) {
        const errorMessage = payload?.error || payload?.message || null;
        const message = resolveApiErrorMessage({
          status: response.status,
          message: errorMessage,
          context,
        });
        
        // Create error with status code for retry logic
        const error = new Error(message);
        (error as ErrorWithStatus).status = response.status;
        throw error;
      }

      return payload as T;
    },
    {
      onStatuses: RETRYABLE_STATUS_CODES,
      retryAfterHeader: true,
      maxRetries: DEFAULT_MAX_RETRIES,
      initialDelayMs: DEFAULT_INITIAL_DELAY_MS,
      maxDelayMs: DEFAULT_MAX_DELAY_MS,
    }
  ).catch((error) => {
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
  });
}
