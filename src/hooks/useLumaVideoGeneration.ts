import { useCallback, useState } from 'react';

export interface LumaGeneratedVideo {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  id: string;
  state: string;
}

export interface LumaVideoState {
  isLoading: boolean;
  isPolling: boolean;
  error: string | null;
  video: LumaGeneratedVideo | null;
  generationId: string | null;
  status: string | null;
}

const INITIAL_STATE: LumaVideoState = {
  isLoading: false,
  isPolling: false,
  error: null,
  video: null,
  generationId: null,
  status: null,
};

const UNSUPPORTED_MESSAGE = 'Luma video generation is not yet supported in this backend integration.';

export interface LumaVideoOptions {
  prompt: string;
  model: 'luma-ray-2' | 'luma-ray-flash-2';
  resolution?: string;
  durationSeconds?: number;
  loop?: boolean;
  keyframes?: Record<string, unknown>;
  concepts?: unknown[];
}

export function useLumaVideoGeneration() {
  const [state, setState] = useState<LumaVideoState>(INITIAL_STATE);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const generate = useCallback(async (_options: LumaVideoOptions) => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      isPolling: false,
      error: UNSUPPORTED_MESSAGE,
      video: null,
      generationId: null,
      status: null,
    }));
    throw new Error(UNSUPPORTED_MESSAGE);
  }, []);

  return {
    ...state,
    generate,
    reset,
  };
}
