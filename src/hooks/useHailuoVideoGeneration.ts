import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiUrl } from '../utils/api';
import { debugError, debugLog } from '../utils/debug';

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

const POLL_INTERVAL_MS = 10_000;
const MAX_WAIT_MS = 10 * 60 * 1000;

function normalizeStatus(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase();
}

function ensureHttpUrl(value?: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return null;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      resolve(result);
    };
    reader.readAsDataURL(file);
  });
}

export function useHailuoVideoGeneration() {
  const [state, setState] = useState<HailuoState>({
    status: 'idle',
    taskId: null,
    video: null,
    error: null,
    isPolling: false,
  });

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const latestOptionsRef = useRef<HailuoGenerateOptions & { prompt?: string } | null>(null);

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
        provider: 'hailuo',
        action: 'status',
        taskId,
      });

      const response = await fetch(getApiUrl(`/api/unified-video?${search.toString()}`));
      const data = await response.json().catch(() => ({ error: 'Failed to parse Hailuo status response' }));

      if (!response.ok) {
        const message = data?.error || `Hailuo status request failed (HTTP ${response.status})`;
        throw new Error(message);
      }

      const statusRaw = data?.status ?? data?.output?.status;
      const normalizedStatus = normalizeStatus(statusRaw);
      const fileId: string | undefined = data?.fileId || data?.file_id || data?.output?.file_id;
      const downloadUrl = ensureHttpUrl(data?.downloadUrl ?? data?.file?.download_url ?? data?.output?.file?.download_url);
      const backupUrl = ensureHttpUrl(data?.backupDownloadUrl ?? data?.file?.backup_download_url ?? data?.output?.file?.backup_download_url);
      const retrieveError = typeof data?.retrieveError === 'string' ? data.retrieveError : null;

      debugLog('[hailuo] Poll status', {
        taskId,
        status: normalizedStatus,
        hasDownload: Boolean(downloadUrl),
        hasBackup: Boolean(backupUrl),
        retrieveError,
      });

      if (normalizedStatus === 'success') {
        if (!downloadUrl && !backupUrl) {
          const message = retrieveError || 'Hailuo task finished without a downloadable URL.';
          setState({
            status: 'failed',
            error: message,
            taskId,
            video: null,
            isPolling: false,
          });
          stopPolling();
          return true;
        }

        const options = latestOptionsRef.current;
        const rawModel = options?.model || 'MiniMax-Hailuo-02';
        const normalizedModel = rawModel === 'MiniMax-Hailuo-02' ? 'hailuo-02' : rawModel;
        const video: HailuoGeneratedVideo = {
          url: downloadUrl || (backupUrl as string),
          backupUrl: backupUrl ?? null,
          prompt: options?.prompt?.trim() || '',
          model: normalizedModel,
          fileId: fileId || 'unknown',
          timestamp: new Date().toISOString(),
          resolution: options?.resolution,
          duration: options?.duration,
          type: 'video',
        };

        setState({
          status: 'succeeded',
          error: null,
          taskId,
          video,
          isPolling: false,
        });
        stopPolling();
        return true;
      }

      if (normalizedStatus === 'fail' || normalizedStatus === 'failed') {
        const message = data?.error || data?.output?.base_resp?.status_msg || 'Hailuo generation failed';
        setState({
          status: 'failed',
          error: message,
          taskId,
          video: null,
          isPolling: false,
        });
        stopPolling();
        return true;
      }

      if (Date.now() - startTimeRef.current > MAX_WAIT_MS) {
        setState({
          status: 'failed',
          error: 'Hailuo generation timed out. Please try again.',
          taskId,
          video: null,
          isPolling: false,
        });
        stopPolling();
        return true;
      }

      setState(prev => ({
        ...prev,
        status: 'polling',
        taskId,
        isPolling: true,
      }));

      return false;
    } catch (err) {
      debugError('[hailuo] Poll error', err);
      const message = err instanceof Error ? err.message : 'Failed to poll Hailuo status';
      stopPolling();
      setState({
        status: 'failed',
        error: message,
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

  const generateVideo = useCallback(async (options: HailuoGenerateOptions) => {
    const trimmedPrompt = options.prompt?.trim() || '';
    if (!trimmedPrompt && !options.firstFrameFile && !options.lastFrameFile && !options.firstFrameBase64 && !options.lastFrameBase64) {
      throw new Error('Provide a prompt or frame image for Hailuo video generation');
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

    let firstFrameBase64 = options.firstFrameBase64;
    let lastFrameBase64 = options.lastFrameBase64;

    if (!firstFrameBase64 && options.firstFrameFile) {
      firstFrameBase64 = await fileToDataUrl(options.firstFrameFile);
    }

    if (!lastFrameBase64 && options.lastFrameFile) {
      lastFrameBase64 = await fileToDataUrl(options.lastFrameFile);
    }

    const payload: Record<string, unknown> = {
      provider: 'hailuo',
      action: 'create',
      model: options.model ?? 'MiniMax-Hailuo-02',
      prompt: trimmedPrompt || undefined,
      duration: typeof options.duration === 'number' ? options.duration : undefined,
      resolution: options.resolution,
      promptOptimizer: options.promptOptimizer,
      fastPretreatment: options.fastPretreatment,
      aigcWatermark: options.watermark,
      firstFrameImage: firstFrameBase64,
      lastFrameImage: lastFrameBase64,
    };

    const response = await fetch(getApiUrl('/api/unified-video'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({ error: 'Failed to parse Hailuo create response' }));

    if (!response.ok) {
      const message = data?.error || `Hailuo create request failed (HTTP ${response.status})`;
      setState({
        status: 'failed',
        error: message,
        taskId: null,
        video: null,
        isPolling: false,
      });
      throw new Error(message);
    }

    const taskId: string | undefined = data?.taskId || data?.task_id;
    if (!taskId) {
      const message = 'Hailuo API response did not include a task ID';
      setState({
        status: 'failed',
        error: message,
        taskId: null,
        video: null,
        isPolling: false,
      });
      throw new Error(message);
    }

    debugLog('[hailuo] Task created', { taskId });

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
