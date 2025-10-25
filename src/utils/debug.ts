// Check if we're in production environment
const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD;

export function debugLog(...args: unknown[]) {
  if (!isProduction) {
    console.log('[DEBUG]', ...args);
  }
}

export function debugWarn(...args: unknown[]) {
  if (!isProduction) {
    console.warn('[WARN]', ...args);
  }
}

export function debugError(...args: unknown[]) {
  if (!isProduction) {
    console.error('[ERROR]', ...args);
  }
}

export function debugInfo(...args: unknown[]) {
  if (!isProduction) {
    console.info('[INFO]', ...args);
  }
}

export function debugTrace(...args: unknown[]) {
  if (!isProduction) {
    console.trace('[TRACE]', ...args);
  }
}
