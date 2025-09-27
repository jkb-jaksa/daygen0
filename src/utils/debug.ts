const isDev = typeof import.meta !== "undefined" && Boolean(import.meta.env?.DEV);

export function debugLog(...args: unknown[]) {
  if (isDev) {
    console.log(...args);
  }
}

export function debugWarn(...args: unknown[]) {
  if (isDev) {
    console.warn(...args);
  }
}

export function debugError(...args: unknown[]) {
  if (isDev) {
    console.error(...args);
  }
}

// Standardized API logging functions
export function debugApiRequest(provider: string, url: string, method: string = 'POST') {
  if (isDev) {
    console.log(`[${provider}] ${method}`, url);
  }
}

export function debugApiResponse(provider: string, status: number, data?: unknown) {
  if (isDev) {
    console.log(`[${provider}] Response status:`, status);
    if (data) {
      console.log(`[${provider}] Response data:`, data);
    }
  }
}

export function debugApiError(provider: string, error: unknown) {
  if (isDev) {
    console.error(`[${provider}] API Error:`, error);
  }
}

export function debugApiSuccess(provider: string, message: string, data?: unknown) {
  if (isDev) {
    console.log(`[${provider}] ${message}`, data || '');
  }
}
