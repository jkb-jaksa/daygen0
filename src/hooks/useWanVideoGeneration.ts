import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiUrl } from '../utils/api';
import { debugError, debugLog } from '../utils/debug';

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

const POLL_INTERVAL_MS = 15_000;
const MAX_WAIT_MS = 10 * 60 * 1000; // 10 minutes safeguard

export function useWanVideoGeneration() {
  const [state, setState] = useState<WanVideoState>({
    status: 'idle',
    error: null,
    taskId: null,
    video: null,
    isPolling: false,
  });

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const latestOptionsRef = useRef<WanVideoGenerateOptions | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    stopPolling();
  }, [stopPolling]);

  const pollStatus = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const search = new URLSearchParams({
        provider: 'wan',
        action: 'status',
        taskId,
      });

      const response = await fetch(getApiUrl(`/api/unified-video?${search.toString()}`));
      const data = await response.json().catch(() => ({ error: 'Failed to parse response' }));

      if (!response.ok) {
        const message = data?.error || `Wan status check failed (HTTP ${response.status})`;
        throw new Error(message);
      }

      const output = data?.output ?? data;
      const taskStatus: string = output?.task_status || output?.status || output?.state || 'unknown';
      const videoUrl: string | null = output?.video_url || null;
      const message: string | undefined = output?.message;

      debugLog('[wan] Poll status', { taskId, taskStatus, videoUrl: Boolean(videoUrl) });

      if (taskStatus === 'SUCCEEDED' && videoUrl) {
        stopPolling();
        const options = latestOptionsRef.current;
        setState({
          status: 'succeeded',
          error: null,
          taskId,
          isPolling: false,
          video: {
            url: videoUrl,
            prompt: options?.prompt ?? '',
            model: options?.model ?? 'wan2.2-t2v-plus',
            taskId,
            timestamp: new Date().toISOString(),
            type: 'video',
          },
        });
        return true;
      }

      if (taskStatus === 'FAILED' || taskStatus === 'CANCELED' || taskStatus === 'STOPPED') {
        stopPolling();
        setState({
          status: 'failed',
          error: message || 'Wan generation failed',
          taskId,
          video: null,
          isPolling: false,
        });
        return true;
      }

      if (Date.now() - startTimeRef.current > MAX_WAIT_MS) {
        stopPolling();
        setState({
          status: 'failed',
          error: 'Wan generation timed out. Please try again.',
          taskId,
          video: null,
          isPolling: false,
        });
        return true;
      }

      setState(prev => ({
        ...prev,
        status: 'polling',
        taskId,
        isPolling: true,
      }));

      return false;
    } catch (error) {
      debugError('[wan] Polling error', error);
      stopPolling();
      setState({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to poll Wan task status',
        taskId,
        video: null,
        isPolling: false,
      });
      return true;
    }
  }, [stopPolling]);

  const scheduleNextPoll = useCallback((taskId: string) => {
    pollTimerRef.current = setTimeout(async () => {
      const done = await pollStatus(taskId);
      if (!done) {
        scheduleNextPoll(taskId);
      }
    }, POLL_INTERVAL_MS);
  }, [pollStatus]);

  const generateVideo = useCallback(async (options: WanVideoGenerateOptions) => {
    const trimmedPrompt = options.prompt.trim();
    if (!trimmedPrompt) {
      throw new Error('Prompt is required for Wan video generation');
    }

    stopPolling();
    startTimeRef.current = Date.now();
    latestOptionsRef.current = { ...options, prompt: trimmedPrompt };

    setState({
      status: 'creating',
      error: null,
      taskId: null,
      video: null,
      isPolling: false,
    });

    const payload: Record<string, unknown> = {
      provider: 'wan',
      action: 'create',
      prompt: trimmedPrompt,
      model: options.model,
      size: options.size,
      negativePrompt: options.negativePrompt,
      promptExtend: options.promptExtend,
      seed: typeof options.seed === 'number' && Number.isFinite(options.seed) ? options.seed : undefined,
      watermark: typeof options.watermark === 'boolean' ? options.watermark : undefined,
    };

    debugLog('[wan] Create payload', payload);

    const response = await fetch(getApiUrl('/api/unified-video'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({ error: 'Failed to parse Wan create response' }));

    if (!response.ok) {
      const message = data?.error || `Wan create request failed (HTTP ${response.status})`;
      setState({
        status: 'failed',
        error: message,
        taskId: null,
        video: null,
        isPolling: false,
      });
      throw new Error(message);
    }

    const output = data?.output ?? data;
    const taskId: string | undefined = output?.taskId || output?.task_id;
    const taskStatus: string | undefined = output?.task_status;

    if (!taskId) {
      const message = 'Wan API response did not include a task ID';
      setState({
        status: 'failed',
        error: message,
        taskId: null,
        video: null,
        isPolling: false,
      });
      throw new Error(message);
    }

    debugLog('[wan] Task created', { taskId, taskStatus });

    setState(prev => ({
      ...prev,
      status: 'queued',
      taskId,
      isPolling: true,
    }));

    const completedImmediately = await pollStatus(taskId);
    if (!completedImmediately) {
      scheduleNextPoll(taskId);
    }
  }, [pollStatus, scheduleNextPoll, stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    latestOptionsRef.current = null;
    setState({
      status: 'idle',
      error: null,
      taskId: null,
      video: null,
      isPolling: false,
    });
  }, [stopPolling]);

  return {
    status: state.status,
    error: state.error,
    taskId: state.taskId,
    video: state.video,
    isPolling: state.isPolling,
    generateVideo,
    reset,
  };
}
