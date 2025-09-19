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
