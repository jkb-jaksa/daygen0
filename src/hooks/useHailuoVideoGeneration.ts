import { useCallback, useEffect, useRef, useState } from 'react';

export type HailuoStatus = 'idle' | 'creating' | 'queued' | 'polling' | 'succeeded' | 'failed';

export interface HailuoGenerateOptions {
  prompt?: string;
  model?: string;
  duration?: number;
  resolution?: '512P' | '768P' | '1080P';
  promptOptimizer?: boolean;
  fastPretreatment?: boolean;
  watermark?: boolean;
  firstFrameFile?: File;
  lastFrameFile?: File;
  firstFrameBase64?: string;
  lastFrameBase64?: string;
}

export interface HailuoGeneratedVideo {
  url: string;
  backupUrl?: string | null;
  prompt: string;
  model: string;
  fileId: string;
  timestamp: string;
  resolution?: string;
  duration?: number;
  type: 'video';
}

interface HailuoState {
  status: HailuoStatus;
  taskId: string | null;
  video: HailuoGeneratedVideo | null;
  error: string | null;
  isPolling: boolean;
}

const INITIAL_STATE: HailuoState = {
  status: 'idle',
  taskId: null,
  video: null,
  error: null,
  isPolling: false,
};

const UNSUPPORTED_MESSAGE = 'Hailuo video generation is not yet supported in this backend integration.';

export function useHailuoVideoGeneration() {
  const [state, setState] = useState<HailuoState>(INITIAL_STATE);
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

  const generateVideo = useCallback(async () => {
    stopPolling();
    setState({
      status: 'failed',
      taskId: null,
      video: null,
      error: UNSUPPORTED_MESSAGE,
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
