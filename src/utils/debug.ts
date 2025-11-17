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

  // Helper function to check if an error should be suppressed
  const shouldSuppressError = (error: unknown): boolean => {
    if (!error) return false;
    
    const errorStr = (() => {
      try {
        if (typeof error === 'string') {
          return error.toLowerCase();
        }
        if (error instanceof Error) {
          let msg = (error.message || '').toLowerCase() + ' ' + (error.name || '').toLowerCase();
          // Check nested error properties
          if ('error' in error && (error as { error: unknown }).error) {
            const nested = (error as { error: unknown }).error;
            if (nested instanceof Error) {
              msg += ' ' + nested.message.toLowerCase();
            } else if (typeof nested === 'string') {
              msg += ' ' + nested.toLowerCase();
            }
          }
          // Check error code (Firebase/Supabase)
          if ('code' in error && (error as { code: unknown }).code) {
            msg += ' ' + String((error as { code: unknown }).code).toLowerCase();
          }
          return msg;
        }
        if (error && typeof error === 'object') {
          const obj = error as Record<string, unknown>;
          let msg = '';
          if (obj.message) msg += String(obj.message).toLowerCase() + ' ';
          if (obj.error) msg += shouldSuppressError(obj.error) ? 'suppress' : '';
          if (obj.code) msg += String(obj.code).toLowerCase() + ' ';
          if (obj.toString && typeof obj.toString === 'function') {
            try {
              msg += obj.toString().toLowerCase();
            } catch {
              // Ignore toString errors
            }
          }
          return msg;
        }
        return String(error).toLowerCase();
      } catch {
        return String(error).toLowerCase();
      }
    })();
    
    // Patterns to suppress
    const suppressPatterns = [
      'runtime.lasterror',
      'message port closed',
      'extension context invalidated',
      'could not establish connection',
      'auth/network-request-failed',
      'network-request-failed',
      'firebase: error',
      'firebase error',
      'firebase',
      'sentence-player',
      'lifecycle init',
      'failed to initialize',
      'pr: firebase',
      'network-request-failed',
      'err_connection_refused',
      'connection refused',
      'refused to connect',
      'failed to fetch',
      'listener indicated an asynchronous response',
      'message channel closed',
      'asynchronous response',
      'response was received',
    ];
    
    return suppressPatterns.some(pattern => errorStr.includes(pattern));
  };

  // Suppress common browser extension errors and network errors
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    // Check all arguments, not just the first one
    const shouldSuppress = args.some(arg => shouldSuppressError(arg));
    
    if (shouldSuppress) {
      // Silently ignore these errors
      return;
    }
    
    // Log other errors normally
    originalError.apply(console, args);
  };

  // Also handle unhandled promise rejections as a secondary layer
  // (Primary handler is in index.html, this is a backup)
  if (typeof window !== 'undefined' && !(window as { __daygenErrorHandlerSet?: boolean }).__daygenErrorHandlerSet) {
    window.addEventListener('unhandledrejection', (event) => {
      if (shouldSuppressError(event.reason)) {
        event.preventDefault();
      }
    });
    (window as { __daygenErrorHandlerSet?: boolean }).__daygenErrorHandlerSet = true;
  }
}
