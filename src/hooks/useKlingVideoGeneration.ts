import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveGenerationCatchError } from '../utils/errorMessages';
import {
  runGenerationJob,
  useGenerationJobTracker,
  type JobStatusSnapshot,
  type ProviderJobResponse,
} from './generationJobHelpers';

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
  signal?: AbortSignal;
  requestTimeoutMs?: number;
  pollTimeoutMs?: number;
  pollIntervalMs?: number;
  pollRequestTimeoutMs?: number;
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
  jobId?: string;
}

interface KlingVideoState {
  status: KlingVideoStatus;
  error: string | null;
  taskId: string | null;
  video: KlingGeneratedVideo | null;
  isPolling: boolean;
  statusMessage: string | null;
  progress?: string;
}

const INITIAL_STATE: KlingVideoState = {
  status: 'idle',
  error: null,
  taskId: null,
  video: null,
  isPolling: false,
  statusMessage: null,
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

const parseKlingVideoJobResult = (
  snapshot: JobStatusSnapshot,
  response: ProviderJobResponse,
  options: KlingVideoOptions,
): KlingGeneratedVideo => {
  const url = collectVideoUrl(snapshot, response);
  if (!url) {
    throw new Error('Job completed but no result URL was provided.');
  }

  const metadata = asRecord(snapshot.job.metadata);
  const statusMessage = metadata ? pickString(metadata.stage) ?? pickString(metadata.statusMessage) : undefined;

  return {
    url,
    prompt: options.prompt,
    model: options.model ?? 'kling-v2.1-master',
    taskId: response.jobId ?? snapshot.job.id ?? 'unknown',
    timestamp: new Date().toISOString(),
    aspectRatio: options.aspectRatio ?? '16:9',
    duration: options.duration ?? 5,
    statusMessage: statusMessage ?? null,
    type: 'video',
    jobId: response.jobId ?? snapshot.job.id ?? undefined,
  };
};

const parseImmediateKlingVideoResult = (
  response: ProviderJobResponse,
  options: KlingVideoOptions,
): KlingGeneratedVideo | undefined => {
  const payload = response.payload;
  const url =
    pickString(payload.videoUrl) ??
    pickString(payload.resultUrl) ??
    pickString(payload.dataUrl);

  if (!url) {
    return undefined;
  }

  return {
    url,
    prompt: options.prompt,
    model: options.model ?? 'kling-v2.1-master',
    taskId: pickString(payload.jobId) ?? 'unknown',
    timestamp: new Date().toISOString(),
    aspectRatio: options.aspectRatio ?? '16:9',
    duration: options.duration ?? 5,
    statusMessage: pickString(payload.statusMessage) ?? null,
    type: 'video',
    jobId: pickString(payload.jobId),
  };
};

export function useKlingVideoGeneration() {
  const tracker = useGenerationJobTracker();
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

  const generateVideo = useCallback(async (options: KlingVideoOptions) => {
    if (!options.prompt?.trim()) {
      throw new Error('Prompt is required for Kling video generation.');
    }

    stopPolling();
    setState({
      status: 'creating',
      error: null,
      taskId: null,
      video: null,
      isPolling: false,
      statusMessage: null,
      progress: 'Submitting request…',
    });

    try {
      const providerOptions: Record<string, unknown> = {};
      if (options.negativePrompt) providerOptions.negative_prompt = options.negativePrompt;
      if (options.aspectRatio) providerOptions.aspect_ratio = options.aspectRatio;
      if (options.duration !== undefined) providerOptions.duration = options.duration;
      if (options.cfgScale !== undefined) providerOptions.cfg_scale = options.cfgScale;
      if (options.mode) providerOptions.mode = options.mode;
      if (options.cameraControl) providerOptions.camera_control = options.cameraControl;

      const { result, jobId } = await runGenerationJob<KlingGeneratedVideo, Record<string, unknown>>({
        provider: 'kling',
        mediaType: 'video',
        body: {
          prompt: options.prompt,
          model: options.model ?? 'kling-v2.1-master',
          providerOptions,
        },
        tracker,
        prompt: options.prompt,
        model: options.model ?? 'kling-v2.1-master',
        signal: options.signal,
        timeoutMs: options.requestTimeoutMs,
        pollTimeoutMs: options.pollTimeoutMs,
        pollIntervalMs: options.pollIntervalMs,
        requestTimeoutMs: options.pollRequestTimeoutMs,
        parseImmediateResult: (response) =>
          parseImmediateKlingVideoResult(response, options),
        parseJobResult: (snapshot, response) =>
          parseKlingVideoJobResult(snapshot, response, options),
        onUpdate: (snapshot) => {
          setState((prev) => {
            let nextStatus: KlingVideoStatus = prev.status;
            if (snapshot.status === 'processing') {
              nextStatus = 'polling';
            } else if (snapshot.status === 'completed') {
              nextStatus = 'succeeded';
            } else if (snapshot.status === 'failed') {
              nextStatus = 'failed';
            }

            const metadata = asRecord(snapshot.job.metadata);
            const statusMessage = metadata
              ? pickString(metadata.stage) ?? pickString(metadata.statusMessage)
              : snapshot.stage;

            return {
              ...prev,
              status: nextStatus,
              taskId: snapshot.job.id ?? prev.taskId,
              isPolling: snapshot.status === 'processing',
              statusMessage: statusMessage ?? prev.statusMessage,
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
        taskId: jobId ?? result.jobId ?? result.taskId,
        video: result,
        isPolling: false,
        statusMessage: result.statusMessage ?? null,
        progress: 'Generation complete!',
      });

      return result;
    } catch (error) {
      const message = resolveGenerationCatchError(
        error,
        'Kling couldn’t generate that video. Try again in a moment.',
      );
      setState({
        status: 'failed',
        error: message,
        taskId: null,
        video: null,
        isPolling: false,
        statusMessage: null,
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
