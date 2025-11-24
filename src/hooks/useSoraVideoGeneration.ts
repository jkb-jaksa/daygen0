import { useCallback, useState } from 'react';
import { resolveGenerationCatchError } from '../utils/errorMessages';
import {
  runGenerationJob,
  useGenerationJobTracker,
  type JobStatusSnapshot,
  type ProviderJobResponse,
} from './generationJobHelpers';

export interface SoraGeneratedVideo {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  type: 'video';
  jobId?: string;
  aspectRatio?: string;
  durationSeconds?: number;
}

export interface SoraVideoGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedVideo: SoraGeneratedVideo | null;
  operationName: string | null;
  isPolling: boolean;
  progress?: string;
}

export interface SoraVideoOptions {
  prompt: string;
  model?: 'sora-2';
  aspectRatio?: '16:9' | '9:16';
  durationSeconds?: number;
  format?: 'mp4' | 'gif';
  withSound?: boolean;
  seed?: number;
  signal?: AbortSignal;
  requestTimeoutMs?: number;
  pollTimeoutMs?: number;
  pollIntervalMs?: number;
  pollRequestTimeoutMs?: number;
}

const INITIAL_STATE: SoraVideoGenerationState = {
  isLoading: false,
  error: null,
  generatedVideo: null,
  operationName: null,
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

const parseSoraVideoJobResult = (
  snapshot: JobStatusSnapshot,
  response: ProviderJobResponse,
  options: SoraVideoOptions,
): SoraGeneratedVideo => {
  const url = collectVideoUrl(snapshot, response);
  if (!url) {
    throw new Error('Job completed but no result URL was provided.');
  }

  return {
    url,
    prompt: options.prompt,
    model: options.model ?? 'sora-2',
    timestamp: new Date().toISOString(),
    type: 'video',
    jobId: response.jobId ?? snapshot.job.id ?? undefined,
    aspectRatio: options.aspectRatio,
    durationSeconds: options.durationSeconds,
  };
};

const parseImmediateSoraVideoResult = (
  response: ProviderJobResponse,
  options: SoraVideoOptions,
): SoraGeneratedVideo | undefined => {
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
    model: options.model ?? 'sora-2',
    timestamp: new Date().toISOString(),
    type: 'video',
    jobId: pickString(payload.jobId),
    aspectRatio: options.aspectRatio,
    durationSeconds: options.durationSeconds,
  };
};

export const useSoraVideoGeneration = () => {
  const tracker = useGenerationJobTracker();
  const [state, setState] = useState<SoraVideoGenerationState>(INITIAL_STATE);

  const generateVideo = useCallback(
    async (options: SoraVideoOptions) => {
      if (!options.prompt?.trim()) {
        throw new Error('Prompt is required for Sora video generation.');
      }

      setState({
        isLoading: true,
        error: null,
        generatedVideo: null,
        operationName: 'sora_video_generate',
        isPolling: true,
        progress: 'Submitting request…',
      });

      try {
        const providerOptions: Record<string, unknown> = {};
        if (options.aspectRatio) providerOptions.aspect_ratio = options.aspectRatio;
        if (options.durationSeconds !== undefined) providerOptions.duration = options.durationSeconds;
        if (options.format) providerOptions.format = options.format;
        if (options.seed !== undefined) providerOptions.seed = options.seed;
        if (options.withSound !== undefined) providerOptions.with_sound = options.withSound;

        const { result } = await runGenerationJob<SoraGeneratedVideo, Record<string, unknown>>({
          provider: 'sora',
          mediaType: 'video',
          body: {
            prompt: options.prompt,
            model: options.model ?? 'sora-2',
            providerOptions,
          },
          tracker,
          prompt: options.prompt,
          model: options.model ?? 'sora-2',
          signal: options.signal,
          timeoutMs: options.requestTimeoutMs,
          pollTimeoutMs: options.pollTimeoutMs,
          pollIntervalMs: options.pollIntervalMs,
          requestTimeoutMs: options.pollRequestTimeoutMs,
          parseImmediateResult: (response) =>
            parseImmediateSoraVideoResult(response, options),
          parseJobResult: (snapshot, response) =>
            parseSoraVideoJobResult(snapshot, response, options),
          onUpdate: (snapshot) => {
            setState((prev) => ({
              ...prev,
              isPolling: snapshot.status !== 'completed' && snapshot.status !== 'failed',
              progress:
                snapshot.progress !== undefined
                  ? `${Math.round(snapshot.progress)}%`
                  : snapshot.stage ?? prev.progress,
            }));
          },
        });

        setState({
          isLoading: false,
          error: null,
          generatedVideo: result,
          operationName: 'sora_video_generate',
          isPolling: false,
          progress: 'Generation complete!',
        });

        return result;
      } catch (error) {
        const message = resolveGenerationCatchError(
          error,
          'Sora could not generate that video. Try again in a moment.',
        );
        setState({
          isLoading: false,
          error: message,
          generatedVideo: null,
          operationName: null,
          isPolling: false,
          progress: undefined,
        });
        throw new Error(message);
      }
    },
    [tracker],
  );

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    generateVideo,
    reset,
  };
};
