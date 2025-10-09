import { useCallback, useEffect, useRef, useState } from 'react';

export type KlingVideoStatus = 'idle' | 'creating' | 'polling' | 'succeeded' | 'failed';

export type KlingCameraType = 'simple' | 'down_back' | 'forward_up' | 'right_turn_forward' | 'left_turn_forward';

export interface KlingCameraConfig {
  horizontal?: number;
  vertical?: number;
  pan?: number;
  tilt?: number;
  roll?: number;
  zoom?: number;
}

export interface KlingCameraControl {
  type: KlingCameraType;
  config?: KlingCameraConfig;
}

export interface KlingVideoOptions {
  prompt: string;
  negativePrompt?: string;
  model?: 'kling-v2.1-master' | 'kling-v2-master';
  aspectRatio?: '16:9' | '9:16' | '1:1';
  duration?: 5 | 10;
  cfgScale?: number;
  mode?: 'standard' | 'professional';
  cameraControl?: KlingCameraControl | null;
}

export interface KlingGeneratedVideo {
  url: string;
  prompt: string;
  model: string;
  taskId: string;
  timestamp: string;
  aspectRatio: string;
  duration: number;
  statusMessage?: string | null;
  type: 'video';
}

interface KlingVideoState {
  status: KlingVideoStatus;
  error: string | null;
  taskId: string | null;
  video: KlingGeneratedVideo | null;
  isPolling: boolean;
  statusMessage: string | null;
}

const INITIAL_STATE: KlingVideoState = {
  status: 'idle',
  error: null,
  taskId: null,
  video: null,
  isPolling: false,
  statusMessage: null,
};

const UNSUPPORTED_MESSAGE = 'Kling video generation is not yet supported in this backend integration.';

export function useKlingVideoGeneration() {
  const [state, setState] = useState<KlingVideoState>(INITIAL_STATE);
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
      error: UNSUPPORTED_MESSAGE,
      taskId: null,
      video: null,
      isPolling: false,
      statusMessage: null,
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
