export function debugLog(...args: unknown[]) {
  // Always show debug logs for now to help with debugging
  console.log('[DEBUG]', ...args);
}

export function debugWarn(...args: unknown[]) {
  // Always show debug warnings for now to help with debugging
  console.warn('[WARN]', ...args);
}

export function debugError(...args: unknown[]) {
  // Always show debug errors for now to help with debugging
  console.error('[ERROR]', ...args);
}
