import { useState, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { resolveGenerationCatchError } from '../utils/errorMessages';
import {
  runGenerationJob,
  useGenerationJobTracker,
  type JobStatusSnapshot,
  type ProviderJobResponse,
} from './generationJobHelpers';

type RunwayVideoStatus = 'idle' | 'running' | 'error' | 'done';

export interface RunwayVideoResult {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  jobId?: string;
  duration?: number;
  ratio?: string;
  ownerId?: string;
}

export interface RunwayVideoGenerateOptions {
  prompt: string;
  model?: 'gen4_turbo' | 'gen4_aleph' | 'act_two';
  ratio?: '1280:720' | '720:1280' | '1104:832' | '832:1104' | '960:960' | '1584:672';
  duration?: 5 | 10;
  seed?: number;
  contentModeration?: Record<string, unknown>;
  signal?: AbortSignal;
  requestTimeoutMs?: number;
  pollTimeoutMs?: number;
  pollIntervalMs?: number;
  pollRequestTimeoutMs?: number;
}

const DEFAULT_MODEL: RunwayVideoGenerateOptions['model'] = 'gen4_turbo';

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
  if (typeof payload.dataUrl === 'string') candidates.push(pickString(payload.dataUrl));
  if (typeof payload.videoUrl === 'string') candidates.push(pickString(payload.videoUrl));
  if (Array.isArray(payload.dataUrls)) {
    for (const entry of payload.dataUrls) {
      candidates.push(pickString(entry));
    }
  }

  return candidates.find((value): value is string => Boolean(value));
};

const parseRunwayVideoJobResult = (
  snapshot: JobStatusSnapshot,
  response: ProviderJobResponse,
  options: RunwayVideoGenerateOptions,
): RunwayVideoResult => {
  const url = collectVideoUrl(snapshot, response);

  if (!url) {
    throw new Error('Job completed but no result URL was provided.');
  }

  return {
    url,
    prompt: options.prompt,
    model: options.model ?? DEFAULT_MODEL ?? 'gen4_turbo',
    timestamp: new Date().toISOString(),
    jobId: response.jobId ?? snapshot.job.id ?? undefined,
    duration: options.duration,
    ratio: options.ratio,
  };
};

const parseImmediateRunwayVideoResult = (
  response: ProviderJobResponse,
  options: RunwayVideoGenerateOptions,
): RunwayVideoResult | undefined => {
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
    model: options.model ?? DEFAULT_MODEL ?? 'gen4_turbo',
    timestamp: new Date().toISOString(),
    jobId: pickString(payload.jobId),
    duration: options.duration,
    ratio: options.ratio,
  };
};

export function useRunwayVideoGeneration() {
  const { user } = useAuth();
  const tracker = useGenerationJobTracker();
  const [state, setState] = useState<{
    status: RunwayVideoStatus;
    error: string | null;
    videoUrl: string | null;
    taskId: string | null;
    progress?: string;
  }>({
    status: 'idle',
    error: null,
    videoUrl: null,
    taskId: null,
    progress: undefined,
  });

  const generate = useCallback(
    async (options: RunwayVideoGenerateOptions) => {
      if (!options.prompt?.trim()) {
        throw new Error('Prompt is required for Runway video generation.');
      }

      setState({
        status: 'running',
        error: null,
        videoUrl: null,
        taskId: null,
        progress: 'Submitting request…',
      });

      try {
        const providerOptions: Record<string, unknown> = {};
        if (options.ratio) providerOptions.ratio = options.ratio;
        if (options.duration) providerOptions.duration = options.duration;
        if (options.seed !== undefined) providerOptions.seed = options.seed;
        if (options.contentModeration) {
          providerOptions.contentModeration = options.contentModeration;
        }

        const { result, jobId } = await runGenerationJob<RunwayVideoResult, Record<string, unknown>>({
          provider: 'runway',
          mediaType: 'video',
          body: {
            prompt: options.prompt,
            model: options.model ?? DEFAULT_MODEL ?? 'gen4_turbo',
            providerOptions,
          },
          tracker,
          prompt: options.prompt,
          model: options.model ?? DEFAULT_MODEL ?? 'gen4_turbo',
          signal: options.signal,
          timeoutMs: options.requestTimeoutMs,
          pollTimeoutMs: options.pollTimeoutMs,
          pollIntervalMs: options.pollIntervalMs,
          requestTimeoutMs: options.pollRequestTimeoutMs,
          parseImmediateResult: (response) =>
            parseImmediateRunwayVideoResult(response, options),
          parseJobResult: (snapshot, response) =>
            parseRunwayVideoJobResult(snapshot, response, options),
          onUpdate: (snapshot) => {
            setState((prev) => ({
              ...prev,
              status: 'running',
              taskId: snapshot.job.id ?? prev.taskId,
              progress:
                snapshot.progress !== undefined
                  ? `${Math.round(snapshot.progress)}%`
                  : snapshot.stage ?? prev.progress,
            }));
          },
        });

        setState({
          status: 'done',
          error: null,
          videoUrl: result.url,
          taskId: jobId ?? result.jobId ?? null,
          progress: undefined,
        });

        return {
          ...result,
          ownerId: user?.id,
        };
      } catch (error) {
        const message = resolveGenerationCatchError(
          error,
          'Runway couldn’t generate that video. Try again in a moment.',
        );

        setState({
          status: 'error',
          error: message,
          videoUrl: null,
          taskId: null,
          progress: undefined,
        });

        throw new Error(message);
      }
    },
    [tracker, user?.id],
  );

  return { ...state, generate };
}
