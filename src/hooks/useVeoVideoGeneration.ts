import { useCallback, useState } from 'react';

export interface GeneratedVideo {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  jobId?: string;
  references?: string[];
  ownerId?: string;
  type: 'video';
}

export interface VideoGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedVideo: GeneratedVideo | null;
  operationName: string | null;
  isPolling: boolean;
}

export interface VideoGenerationOptions {
  prompt: string;
  model?: 'veo-3.0-generate-001' | 'veo-3.0-fast-generate-001';
  aspectRatio?: '16:9' | '9:16';
  negativePrompt?: string;
  seed?: number;
  imageBase64?: string;
  imageMimeType?: string;
}

const INITIAL_STATE: VideoGenerationState = {
  isLoading: false,
  error: null,
  generatedVideo: null,
  operationName: null,
  isPolling: false,
};

const UNSUPPORTED_MESSAGE = 'Veo video generation is not yet supported in this backend integration.';

export const useVeoVideoGeneration = () => {
  const [state, setState] = useState<VideoGenerationState>(INITIAL_STATE);

  const startGeneration = useCallback(async (_options: VideoGenerationOptions) => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      isPolling: false,
      error: UNSUPPORTED_MESSAGE,
      generatedVideo: null,
      operationName: null,
    }));
    throw new Error(UNSUPPORTED_MESSAGE);
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    startGeneration,
    reset,
  };
};
