import { normalizeAssetUrl } from '../utils/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveGenerationCatchError } from '../utils/errorMessages';
import {
  runGenerationJob,
  useGenerationJobTracker,
  type JobStatusSnapshot,
  type ProviderJobResponse,
} from './generationJobHelpers';

export type WanVideoStatus = 'idle' | 'creating' | 'queued' | 'polling' | 'succeeded' | 'failed';

export interface WanVideoGenerateOptions {
  prompt: string;
  model?: string;
  size?: string;
  negativePrompt?: string;
  promptExtend?: boolean;
  seed?: number;
  watermark?: boolean;
  signal?: AbortSignal;
  requestTimeoutMs?: number;
  pollTimeoutMs?: number;
  pollIntervalMs?: number;
  pollRequestTimeoutMs?: number;
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
  progress?: string;
}

const INITIAL_STATE: WanVideoState = {
  status: 'idle',
  error: null,
  taskId: null,
  video: null,
  isPolling: false,
  progress: undefined,
};

const pickString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const collectVideoUrl = (
  snapshot: JobStatusSnapshot,
  response: ProviderJobResponse,
): string | undefined => {
  const candidates: Array<string | undefined> = [];
  candidates.push(pickString(snapshot.job.resultUrl));

  const metadata = asRecord(snapshot.job.metadata);
  if (metadata) {
    candidates.push(
      pickString(metadata.resultUrl) ??
      pickString(metadata.result_url) ??
      pickString(metadata.url) ??
      pickString(metadata.videoUrl),
    );

    const results = metadata.results;
    if (Array.isArray(results)) {
      for (const entry of results) {
        if (typeof entry === 'string') {
          candidates.push(pickString(entry));
        } else {
          const record = asRecord(entry);
          if (record) {
            candidates.push(
              pickString(record.url) ??
              pickString(record.resultUrl) ??
              pickString(record.videoUrl),
            );
          }
        }
      }
    }
  }

  const payload = response.payload;
  if (typeof payload.videoUrl === 'string') candidates.push(pickString(payload.videoUrl));
  if (typeof payload.resultUrl === 'string') candidates.push(pickString(payload.resultUrl));
  if (typeof payload.dataUrl === 'string') candidates.push(pickString(payload.dataUrl));
  if (Array.isArray(payload.dataUrls)) {
    for (const entry of payload.dataUrls) {
      candidates.push(pickString(entry));
    }
  }

  return candidates.find((value): value is string => Boolean(value));
};

const parseWanVideoJobResult = (
  snapshot: JobStatusSnapshot,
  response: ProviderJobResponse,
  options: WanVideoGenerateOptions,
): WanGeneratedVideo => {
  const url = collectVideoUrl(snapshot, response);
  if (!url) {
    throw new Error('Job completed but no result URL was provided.');
  }

  return {
    url,
    prompt: options.prompt,
    model: options.model ?? 'wan2.2-t2v-plus',
    taskId: response.jobId ?? snapshot.job.id ?? 'unknown',
    timestamp: new Date().toISOString(),
    type: 'video',
  };
};

const parseImmediateWanVideoResult = (
  response: ProviderJobResponse,
  options: WanVideoGenerateOptions,
): WanGeneratedVideo | undefined => {
  const payload = response.payload;
  const url =
    pickString(payload.videoUrl) ??
    pickString(payload.resultUrl) ??
    pickString(payload.dataUrl);

  if (!url) {
    return undefined;
  }

  const normalizedUrl = normalizeAssetUrl(url);
  if (!normalizedUrl) {
    return undefined;
  }

  return {
    url: normalizedUrl,
    prompt: options.prompt,
    model: options.model ?? 'wan2.2-t2v-plus',
    taskId: pickString(payload.jobId) ?? 'unknown',
    timestamp: new Date().toISOString(),
    type: 'video',
  };
};

export function useWanVideoGeneration() {
  const tracker = useGenerationJobTracker();
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

  const generateVideo = useCallback(async (options: WanVideoGenerateOptions) => {
    if (!options.prompt?.trim()) {
      throw new Error('Prompt is required for Wan video generation.');
    }

    stopPolling();
    setState({
      status: 'creating',
      error: null,
      taskId: null,
      video: null,
      isPolling: false,
      progress: 'Submitting request…',
    });

    try {
      const providerOptions: Record<string, unknown> = {};
      if (options.size) providerOptions.size = options.size;
      if (options.negativePrompt) providerOptions.negative_prompt = options.negativePrompt;
      if (options.promptExtend !== undefined) providerOptions.prompt_extend = options.promptExtend;
      if (options.seed !== undefined) providerOptions.seed = options.seed;
      if (options.watermark !== undefined) providerOptions.watermark = options.watermark;

      const { result, jobId } = await runGenerationJob<WanGeneratedVideo, Record<string, unknown>>({
        provider: 'wan',
        mediaType: 'video',
        body: {
          prompt: options.prompt,
          model: options.model ?? 'wan2.2-t2v-plus',
          providerOptions,
        },
        tracker,
        prompt: options.prompt,
        model: options.model ?? 'wan2.2-t2v-plus',
        signal: options.signal,
        timeoutMs: options.requestTimeoutMs,
        pollTimeoutMs: options.pollTimeoutMs,
        pollIntervalMs: options.pollIntervalMs,
        requestTimeoutMs: options.pollRequestTimeoutMs,
        parseImmediateResult: (response) =>
          parseImmediateWanVideoResult(response, options),
        parseJobResult: (snapshot, response) =>
          parseWanVideoJobResult(snapshot, response, options),
        onUpdate: (snapshot) => {
          setState((prev) => {
            let nextStatus: WanVideoStatus = prev.status;
            switch (snapshot.status) {
              case 'queued':
                nextStatus = 'queued';
                break;
              case 'processing':
                nextStatus = 'polling';
                break;
              case 'completed':
                nextStatus = 'succeeded';
                break;
              case 'failed':
                nextStatus = 'failed';
                break;
              default:
                break;
            }

            return {
              ...prev,
              status: nextStatus,
              taskId: snapshot.job.id ?? prev.taskId,
              isPolling: snapshot.status === 'processing',
              progress:
                snapshot.progress !== undefined
                  ? `${Math.round(snapshot.progress)}%`
                  : snapshot.stage ?? prev.progress,
            };
          });
        },
      });

      setState({
        status: 'succeeded',
        error: null,
        taskId: jobId ?? result.taskId ?? null,
        video: result,
        isPolling: false,
        progress: 'Generation complete!',
      });

      return result;
    } catch (error) {
      const message = resolveGenerationCatchError(
        error,
        'Wan couldn’t generate that video. Try again in a moment.',
      );
      setState({
        status: 'failed',
        error: message,
        taskId: null,
        video: null,
        isPolling: false,
        progress: undefined,
      });
      throw new Error(message);
    }
  }, [tracker, stopPolling]);

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
