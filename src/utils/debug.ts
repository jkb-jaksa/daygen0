// Check if we're in production environment
const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD;

// Check if debug logging is enabled (can be disabled via localStorage)
const isDebugEnabled = () => {
  if (typeof window === 'undefined') return !isProduction;
  return !isProduction && localStorage.getItem('daygen:debug') !== 'false';
};

export function debugLog(...args: unknown[]) {
  if (isDebugEnabled()) {
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

// Handle browser extension errors gracefully
export function handleExtensionErrors() {
  if (typeof window === 'undefined') return;

  // Suppress common browser extension errors
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args[0]?.toString() || '';
    
    // Filter out common browser extension errors
    if (
      message.includes('runtime.lastError') ||
      message.includes('message port closed') ||
      message.includes('Extension context invalidated') ||
      message.includes('Could not establish connection')
    ) {
      // Silently ignore these extension-related errors
      return;
    }
    
    // Log other errors normally
    originalError.apply(console, args);
  };
}
