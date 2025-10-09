import { useCallback, useState } from 'react';

export interface SeedanceGeneratedVideo {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  ratio: string;
  duration: number;
  resolution: string;
}

export interface SeedanceVideoGenerationState {
  isLoading: boolean;
  error: string | null;
  video: SeedanceGeneratedVideo | null;
  taskId: string | null;
  status: string | null;
}

export interface SeedanceVideoGenerationOptions {
  prompt: string;
  mode?: 't2v' | 'i2v-first' | 'i2v-first-last';
  ratio?: string;
  duration?: number;
  resolution?: string;
  fps?: number;
  camerafixed?: boolean;
  seed?: string | number;
  firstFrameFile?: File;
  lastFrameFile?: File;
}

const INITIAL_STATE: SeedanceVideoGenerationState = {
  isLoading: false,
  error: null,
  video: null,
  taskId: null,
  status: null,
};

const UNSUPPORTED_MESSAGE = 'Seedance video generation is not yet supported in this backend integration.';

export const useSeedanceVideoGeneration = () => {
  const [state, setState] = useState<SeedanceVideoGenerationState>(INITIAL_STATE);

  const generateVideo = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: UNSUPPORTED_MESSAGE,
      video: null,
      taskId: null,
      status: null,
    }));
    throw new Error(UNSUPPORTED_MESSAGE);
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    generateVideo,
    reset,
  };
};
