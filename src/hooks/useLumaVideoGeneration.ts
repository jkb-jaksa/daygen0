import { normalizeAssetUrl } from '../utils/api';
import { useCallback, useState } from 'react';
import { resolveGenerationCatchError } from '../utils/errorMessages';
import {
  runGenerationJob,
  useGenerationJobTracker,
  type JobStatusSnapshot,
  type ProviderJobResponse,
} from './generationJobHelpers';

export interface LumaGeneratedVideo {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  id: string;
  state: string;
  jobId?: string;
}

export interface LumaVideoState {
  isLoading: boolean;
  isPolling: boolean;
  error: string | null;
  video: LumaGeneratedVideo | null;
  generationId: string | null;
  status: string | null;
  progress?: string;
}

const INITIAL_STATE: LumaVideoState = {
  isLoading: false,
  isPolling: false,
  error: null,
  video: null,
  generationId: null,
  status: null,
  progress: undefined,
};

export interface LumaVideoOptions {
  prompt: string;
  model: 'luma-ray-2' | 'luma-ray-flash-2';
  resolution?: string;
  durationSeconds?: number;
  loop?: boolean;
  keyframes?: Record<string, unknown>;
  concepts?: unknown[];
  signal?: AbortSignal;
  requestTimeoutMs?: number;
  pollTimeoutMs?: number;
  pollIntervalMs?: number;
  pollRequestTimeoutMs?: number;
}

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
  if (typeof payload.resultUrl === 'string') candidates.push(pickString(payload.resultUrl));
  if (typeof payload.videoUrl === 'string') candidates.push(pickString(payload.videoUrl));
  if (typeof payload.dataUrl === 'string') candidates.push(pickString(payload.dataUrl));
  if (Array.isArray(payload.dataUrls)) {
    for (const entry of payload.dataUrls) {
      candidates.push(pickString(entry));
    }
  }

  return candidates.find((value): value is string => Boolean(value));
};

const extractGenerationId = (snapshot: JobStatusSnapshot, response: ProviderJobResponse): string | undefined => {
  const metadata = asRecord(snapshot.job.metadata);
  if (metadata) {
    const candidate =
      pickString(metadata.generationId) ??
      pickString(metadata.generation_id) ??
      pickString(metadata.id);
    if (candidate) {
      return candidate;
    }
  }

  const payload = response.payload;
  return (
    pickString(payload.generationId) ??
    pickString(payload.generation_id) ??
    pickString(payload.id) ??
    pickString(snapshot.job.id)
  );
};

const parseLumaVideoJobResult = (
  snapshot: JobStatusSnapshot,
  response: ProviderJobResponse,
  options: LumaVideoOptions,
): LumaGeneratedVideo => {
  const url = collectVideoUrl(snapshot, response);
  if (!url) {
    throw new Error('Job completed but no result URL was provided.');
  }

  return {
    url,
    prompt: options.prompt,
    model: options.model,
    timestamp: new Date().toISOString(),
    id: extractGenerationId(snapshot, response) ?? snapshot.job.id ?? 'unknown',
    state: snapshot.job.status ?? snapshot.status ?? 'COMPLETED',
    jobId: response.jobId ?? snapshot.job.id ?? undefined,
  };
};

const parseImmediateLumaVideoResult = (
  response: ProviderJobResponse,
  options: LumaVideoOptions,
): LumaGeneratedVideo | undefined => {
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

  const id =
    pickString(payload.generationId) ??
    pickString(payload.generation_id) ??
    pickString(payload.id) ??
    'unknown';

  const state = pickString(payload.state) ?? pickString(payload.status) ?? 'COMPLETED';

  return {
    url: normalizedUrl,
    prompt: options.prompt,
    model: options.model,
    timestamp: new Date().toISOString(),
    id,
    state,
    jobId: pickString(payload.jobId),
  };
};

export function useLumaVideoGeneration() {
  const tracker = useGenerationJobTracker();
  const [state, setState] = useState<LumaVideoState>(INITIAL_STATE);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const generate = useCallback(async (options: LumaVideoOptions) => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      isPolling: true,
      error: null,
      progress: 'Submitting request…',
    }));

    try {
      const providerOptions: Record<string, unknown> = {};
      if (options.resolution) providerOptions.resolution = options.resolution;
      if (options.durationSeconds !== undefined) {
        providerOptions.duration_seconds = options.durationSeconds;
      }
      if (options.loop !== undefined) providerOptions.loop = options.loop;
      if (options.keyframes) providerOptions.keyframes = options.keyframes;
      if (options.concepts) providerOptions.concepts = options.concepts;

      const { result } = await runGenerationJob<LumaGeneratedVideo, Record<string, unknown>>({
        provider: 'luma',
        mediaType: 'video',
        body: {
          prompt: options.prompt,
          model: options.model,
          providerOptions,
        },
        tracker,
        prompt: options.prompt,
        model: options.model,
        signal: options.signal,
        timeoutMs: options.requestTimeoutMs,
        pollTimeoutMs: options.pollTimeoutMs,
        pollIntervalMs: options.pollIntervalMs,
        requestTimeoutMs: options.pollRequestTimeoutMs,
        parseImmediateResult: (response) =>
          parseImmediateLumaVideoResult(response, options),
        parseJobResult: (snapshot, response) =>
          parseLumaVideoJobResult(snapshot, response, options),
        onUpdate: (snapshot) => {
          setState((prev) => ({
            ...prev,
            isPolling: snapshot.status !== 'completed' && snapshot.status !== 'failed',
            status: snapshot.job.status ?? snapshot.status ?? prev.status,
            generationId: snapshot.job.id ?? prev.generationId,
            progress:
              snapshot.progress !== undefined
                ? `${Math.round(snapshot.progress)}%`
                : snapshot.stage ?? prev.progress,
          }));
        },
      });

      setState({
        isLoading: false,
        isPolling: false,
        error: null,
        video: result,
        generationId: result.id,
        status: result.state,
        progress: 'Generation complete!',
      });

      return result;
    } catch (error) {
      const message = resolveGenerationCatchError(
        error,
        'Luma couldn’t generate that video. Try again in a moment.',
      );
      setState({
        isLoading: false,
        isPolling: false,
        error: message,
        video: null,
        generationId: null,
        status: 'failed',
        progress: undefined,
      });
      throw new Error(message);
    }
  }, [tracker]);

  return {
    ...state,
    generate,
    reset,
  };
}
