import { useCallback, useEffect, useRef, useState } from 'react';

export type WanVideoStatus = 'idle' | 'creating' | 'queued' | 'polling' | 'succeeded' | 'failed';

export interface WanVideoGenerateOptions {
  prompt: string;
  model?: string;
  size?: string;
  negativePrompt?: string;
  promptExtend?: boolean;
  seed?: number;
  watermark?: boolean;
}

export interface WanGeneratedVideo {
  url: string;
  prompt: string;
  model: string;
  taskId: string;
  timestamp: string;
  type: 'video';
}

interface WanVideoState {
  status: WanVideoStatus;
  error: string | null;
  taskId: string | null;
  video: WanGeneratedVideo | null;
  isPolling: boolean;
}

const INITIAL_STATE: WanVideoState = {
  status: 'idle',
  error: null,
  taskId: null,
  video: null,
  isPolling: false,
};

const UNSUPPORTED_MESSAGE = 'Wan video generation is not yet supported in this backend integration.';

export function useWanVideoGeneration() {
  const [state, setState] = useState<WanVideoState>(INITIAL_STATE);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    stopPolling();
  }, [stopPolling]);

  const generateVideo = useCallback(async (_options: WanVideoGenerateOptions) => {
    stopPolling();
    setState({
      status: 'failed',
      error: UNSUPPORTED_MESSAGE,
      taskId: null,
      video: null,
      isPolling: false,
    });
    throw new Error(UNSUPPORTED_MESSAGE);
  }, [stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setState(INITIAL_STATE);
  }, [stopPolling]);

  return {
    ...state,
    generateVideo,
    reset,
    stopPolling,
  };
}
