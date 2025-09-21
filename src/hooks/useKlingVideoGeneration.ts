import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiUrl } from '../utils/api';
import { debugError, debugLog } from '../utils/debug';

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

const POLL_INTERVAL_MS = 7000;
const MAX_WAIT_MS = 10 * 60 * 1000; // 10 minutes

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function useKlingVideoGeneration() {
  const [state, setState] = useState<KlingVideoState>({
    status: 'idle',
    error: null,
    taskId: null,
    video: null,
    isPolling: false,
    statusMessage: null,
  });

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const latestOptionsRef = useRef<KlingVideoOptions | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    stopPolling();
  }, [stopPolling]);

  const pollStatus = useCallback(async (taskId: string) => {
    try {
      const search = new URLSearchParams({
        provider: 'kling',
        action: 'status',
        taskId,
      });

      debugLog('[kling] Polling status for task', taskId);
      const response = await fetch(getApiUrl(`/api/unified-video?${search.toString()}`));
      const data = await response.json().catch(() => ({ error: 'Failed to parse Kling status response' }));

      if (!response.ok) {
        throw new Error(data?.error || `Kling status failed (HTTP ${response.status})`);
      }

      const raw = data?.raw ?? data;
      const status = (data?.status || raw?.task_status || 'unknown') as string;
      const normalizedStatus = status.toLowerCase();
      const statusMessage = data?.statusMessage || raw?.task_status_msg || raw?.task_msg || null;
      const videoUrl: string | null = data?.videoUrl || raw?.video_url || raw?.task_result?.videos?.[0]?.url || null;

      debugLog('[kling] Status response', { taskId, normalizedStatus, hasVideo: Boolean(videoUrl) });

      if (normalizedStatus === 'succeed' && videoUrl) {
        stopPolling();
        const options = latestOptionsRef.current;
        const aspectRatio = options?.aspectRatio ?? '16:9';
        const duration = options?.duration ?? 5;

        setState({
          status: 'succeeded',
          error: null,
          taskId,
          isPolling: false,
          statusMessage: statusMessage ?? null,
          video: {
            url: videoUrl,
            prompt: options?.prompt ?? '',
            model: options?.model ?? 'kling-v2.1-master',
            taskId,
            timestamp: new Date().toISOString(),
            aspectRatio,
            duration,
            statusMessage: statusMessage ?? null,
            type: 'video',
          },
        });
        return;
      }

      if (normalizedStatus === 'failed') {
        stopPolling();
        setState({
          status: 'failed',
          error: statusMessage || 'Kling generation failed',
          taskId,
          video: null,
          isPolling: false,
          statusMessage: statusMessage ?? null,
        });
        return;
      }

      if (Date.now() - startTimeRef.current > MAX_WAIT_MS) {
        stopPolling();
        setState({
          status: 'failed',
          error: 'Kling generation timed out. Please try again.',
          taskId,
          video: null,
          isPolling: false,
          statusMessage: statusMessage ?? null,
        });
        return;
      }

      setState(prev => ({
        ...prev,
        status: 'polling',
        taskId,
        isPolling: true,
        statusMessage: statusMessage ?? prev.statusMessage,
      }));

      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
      pollTimerRef.current = setTimeout(() => {
        void pollStatus(taskId);
      }, POLL_INTERVAL_MS);
    } catch (error) {
      debugError('[kling] Polling error', error);
      stopPolling();
      setState({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to poll Kling status',
        taskId,
        video: null,
        isPolling: false,
        statusMessage: null,
      });
    }
  }, [stopPolling]);

  const generateVideo = useCallback(async (options: KlingVideoOptions) => {
    const prompt = options.prompt.trim();
    if (!prompt) {
      throw new Error('Prompt is required for Kling video generation');
    }

    stopPolling();
    startTimeRef.current = Date.now();
    latestOptionsRef.current = { ...options, prompt };

    setState({
      status: 'creating',
      error: null,
      taskId: null,
      video: null,
      isPolling: false,
      statusMessage: null,
    });

    const payload: Record<string, unknown> = {
      provider: 'kling',
      action: 'create',
      prompt,
      negativePrompt: options.negativePrompt?.trim() || undefined,
      model: options.model,
      aspectRatio: options.aspectRatio,
      duration: options.duration,
      cfgScale: typeof options.cfgScale === 'number' ? clamp(options.cfgScale, 0, 1) : undefined,
      mode: options.mode,
    };

    if (options.cameraControl) {
      payload.cameraType = options.cameraControl.type;
      if (options.cameraControl.config) {
        payload.cameraConfig = options.cameraControl.config;
      }
    }

    debugLog('[kling] Create payload', payload);

    const response = await fetch(getApiUrl('/api/unified-video'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({ error: 'Failed to parse Kling create response' }));

    if (!response.ok) {
      const message = data?.error || `Kling create request failed (HTTP ${response.status})`;
      throw new Error(message);
    }

    const taskId: string | null = data?.taskId || data?.task_id || data?.raw?.task_id || null;
    if (!taskId) {
      throw new Error('Kling API did not return a task id');
    }

    setState(prev => ({
      ...prev,
      status: 'polling',
      taskId,
      isPolling: true,
    }));

    await pollStatus(taskId);

    return taskId;
  }, [pollStatus, stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    latestOptionsRef.current = null;
    setState({
      status: 'idle',
      error: null,
      taskId: null,
      video: null,
      isPolling: false,
      statusMessage: null,
    });
  }, [stopPolling]);

  return {
    ...state,
    generateVideo,
    reset,
  };
}
