import { useState, useCallback, useRef } from 'react';
import { getApiUrl } from '../utils/api';
import { debugLog } from '../utils/debug';

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

export const useSeedanceVideoGeneration = () => {
  const [state, setState] = useState<SeedanceVideoGenerationState>({
    isLoading: false,
    error: null,
    video: null,
    taskId: null,
    status: null,
  });

  const pollTimer = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const generateVideo = useCallback(async (options: SeedanceVideoGenerationOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      video: null,
      taskId: null,
      status: null,
    }));

    try {
      const {
        prompt,
        mode = 't2v',
        ratio = '16:9',
        duration = 5,
        resolution = '1080p',
        fps = 24,
        camerafixed = true,
        seed,
        firstFrameFile,
        lastFrameFile
      } = options;

      debugLog('[seedance] Generating video with prompt:', `${prompt.substring(0, 100)}...`);

      // Convert files to data URLs if provided
      let imageBase64: string | undefined;
      let lastFrameBase64: string | undefined;

      if (firstFrameFile) {
        imageBase64 = await fileToDataUrl(firstFrameFile);
      }
      if (lastFrameFile) {
        lastFrameBase64 = await fileToDataUrl(lastFrameFile);
      }

      const res = await fetch(getApiUrl('/api/unified-video'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'seedance',
          action: 'create',
          prompt,
          mode,
          ratio,
          duration,
          resolution,
          fps,
          camerafixed,
          seed,
          imageBase64,
          lastFrameBase64
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const errorMessage = errBody?.error || `Request failed with ${res.status}`;
        throw new Error(errorMessage);
      }

      const { taskId } = await res.json();
      if (!taskId) throw new Error('No task id returned');

      setState(s => ({ ...s, taskId }));

      // Poll every 3s up to ~3 minutes
      const started = Date.now();
      pollTimer.current = setInterval(async () => {
        try {
          const pollSearch = new URLSearchParams({
            provider: 'seedance',
            action: 'status',
            id: taskId,
          });
          const r = await fetch(getApiUrl(`/api/unified-video?${pollSearch.toString()}`));
          const j = await safeJson(r);
          const status = j?.status || 'unknown';
          setState(s => ({ ...s, status }));

          if (status === 'succeeded' && j?.videoUrl) {
            stopPolling();
            setState({
              isLoading: false,
              error: null,
              video: {
                url: j.videoUrl,
                prompt,
                model: 'seedance-1.0-pro',
                timestamp: new Date().toISOString(),
                ratio,
                duration,
                resolution
              },
              taskId,
              status
            });
          } else if (status === 'failed') {
            stopPolling();
            setState({ isLoading: false, error: j?.error || 'Seedance task failed', video: null, taskId, status });
          } else if (Date.now() - started > 3 * 60 * 1000) {
            // timeout guard
            stopPolling();
            setState({ isLoading: false, error: 'Timed out waiting for video', video: null, taskId, status });
          }
        } catch (error: unknown) {
          stopPolling();
          const message = error instanceof Error ? error.message : String(error);
          setState({ isLoading: false, error: message, video: null, taskId, status: 'failed' });
        }
      }, 3000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        video: null,
        taskId: null,
        status: null,
      }));

      throw error;
    }
  }, [stopPolling]);

  const reset = useCallback(() => setState({ isLoading: false, error: null, video: null, taskId: null, status: null }), []);

  return { ...state, generateVideo, reset };
};

async function fileToDataUrl(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  const mime = file.type || 'image/png';
  return `data:${mime};base64,${b64}`;
}

type SeedancePollResponse = {
  status?: string;
  videoUrl?: string;
  error?: string;
};

function isSeedancePollResponse(value: unknown): value is SeedancePollResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  const isOptionalString = (val: unknown) => val === undefined || typeof val === 'string';

  return (
    isOptionalString(record.status) &&
    isOptionalString(record.videoUrl) &&
    isOptionalString(record.error)
  );
}

async function safeJson(r: Response): Promise<SeedancePollResponse | null> {
  try {
    const data: unknown = await r.json();
    if (isSeedancePollResponse(data)) {
      return data;
    }
  } catch {
    // Swallow JSON parsing errors and return null to continue polling.
  }

  return null;
}
