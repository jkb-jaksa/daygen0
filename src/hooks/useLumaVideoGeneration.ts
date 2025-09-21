import { useCallback, useRef, useState } from 'react';
import { getApiUrl } from '../utils/api';
import { debugError, debugLog } from '../utils/debug';

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

export interface LumaVideoOptions {
  prompt: string;
  model: 'luma-ray-2' | 'luma-ray-flash-2';
  resolution?: '540p' | '720p' | '1080' | '4k' | string;
  durationSeconds?: number;
  loop?: boolean;
  keyframes?: Record<string, unknown>;
  concepts?: unknown[];
}

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_DURATION_MS = 5 * 60 * 1000;

export function useLumaVideoGeneration() {
  const [state, setState] = useState<LumaVideoState>({
    isLoading: false,
    isPolling: false,
    error: null,
    video: null,
    generationId: null,
    status: null,
  });

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startedAtRef = useRef<number>(0);
  const optionsRef = useRef<LumaVideoOptions | null>(null);

  const clearPoller = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearPoller();
    setState({
      isLoading: false,
      isPolling: false,
      error: null,
      video: null,
      generationId: null,
      status: null,
    });
  }, [clearPoller]);

  const generate = useCallback(async (options: LumaVideoOptions) => {
    optionsRef.current = options;
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      video: null,
      generationId: null,
      status: null,
    }));

    try {
      const response = await fetch(getApiUrl('/api/unified-video'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'luma',
          action: 'create',
          prompt: options.prompt,
          model: options.model,
          resolution: options.resolution || '720p',
          duration: options.durationSeconds ?? 5,
          loop: options.loop ?? false,
          keyframes: options.keyframes,
          concepts: options.concepts,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const generationId = data.id || data.taskId || null;
      if (!generationId) {
        throw new Error('No generation id returned from Luma');
      }

      startedAtRef.current = Date.now();
      setState(prev => ({
        ...prev,
        isLoading: false,
        isPolling: true,
        generationId,
        status: data.state || 'queued',
      }));

      const poll = async () => {
        try {
          const search = new URLSearchParams({
            provider: 'luma',
            action: 'status',
            id: generationId,
          });
          const pollUrl = getApiUrl(`/api/unified-video?${search.toString()}`);
          debugLog('[luma] Polling status:', pollUrl);
          const statusRes = await fetch(pollUrl);
          const statusJson = await statusRes.json().catch(() => null);

          if (!statusRes.ok) {
            throw new Error(statusJson?.error || `HTTP ${statusRes.status}`);
          }

          const stateValue = statusJson?.state || statusJson?.status || 'unknown';
          setState(prev => ({ ...prev, status: stateValue }));

          if (stateValue === 'completed') {
            clearPoller();
            const dataUrl = statusJson?.dataUrl;
            const assetUrl = statusJson?.assets?.video || statusJson?.videoUrl;
            const finalUrl = dataUrl || assetUrl;

            if (!finalUrl || typeof finalUrl !== 'string') {
              throw new Error('Luma did not return a video URL');
            }

            const video: LumaGeneratedVideo = {
              url: finalUrl,
              prompt: options.prompt,
              model: options.model,
              timestamp: new Date().toISOString(),
              id: generationId,
              state: stateValue,
            };

            setState(prev => ({
              ...prev,
              isPolling: false,
              video,
              error: null,
            }));
          } else if (stateValue === 'failed') {
            clearPoller();
            const reason = statusJson?.failure_reason || statusJson?.error || 'Luma generation failed';
            setState(prev => ({
              ...prev,
              isPolling: false,
              error: typeof reason === 'string' ? reason : 'Luma generation failed',
            }));
          } else if (Date.now() - startedAtRef.current > MAX_POLL_DURATION_MS) {
            clearPoller();
            setState(prev => ({
              ...prev,
              isPolling: false,
              error: 'Timed out waiting for Luma video',
            }));
          }
        } catch (err) {
          debugError('[luma] Polling error:', err);
          clearPoller();
          setState(prev => ({
            ...prev,
            isPolling: false,
            error: err instanceof Error ? err.message : 'Luma polling failed',
          }));
        }
      };

      clearPoller();
      pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS);
      poll();
    } catch (err) {
      debugError('[luma] Generation error:', err);
      clearPoller();
      setState(prev => ({
        ...prev,
        isLoading: false,
        isPolling: false,
        error: err instanceof Error ? err.message : 'Luma generation failed',
        generationId: null,
      }));
      throw err;
    }
  }, [clearPoller]);

  return {
    ...state,
    generate,
    reset,
  };
}
