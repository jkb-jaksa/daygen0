// Define environment variable types
type ConfigEnv = ImportMetaEnv & {
  readonly VITE_MAX_PARALLEL_GENERATIONS?: string;
  readonly VITE_LONG_POLL_THRESHOLD_MS?: string;
};

const env = import.meta.env as ConfigEnv;

// Parse with defaults
const parseNumber = (value: string | undefined, defaultValue: number): number => {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Export configuration constants
export const MAX_PARALLEL_GENERATIONS = parseNumber(
  env?.VITE_MAX_PARALLEL_GENERATIONS, 
  5
);

export const LONG_POLL_THRESHOLD_MS = parseNumber(
  env?.VITE_LONG_POLL_THRESHOLD_MS, 
  90000
);
