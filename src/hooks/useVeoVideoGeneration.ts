import { useCallback, useState } from 'react';
import { resolveGenerationCatchError } from '../utils/errorMessages';
import {
  runGenerationJob,
  useGenerationJobTracker,
  type JobStatusSnapshot,
  type ProviderJobResponse,
} from './generationJobHelpers';

export interface GeneratedVideo {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  jobId?: string;
  references?: string[];
  ownerId?: string;
  type: 'video';
}

export interface VideoGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedVideo: GeneratedVideo | null;
  operationName: string | null;
  isPolling: boolean;
  progress?: string;
}

export interface VideoGenerationOptions {
  prompt: string;
  model?: 'veo-3.1-generate-preview' | 'veo-3.1-fast-generate-preview';
  aspectRatio?: '16:9' | '9:16';
  negativePrompt?: string;
  seed?: number;
  imageBase64?: string;
  imageMimeType?: string;
  references?: string[];
  signal?: AbortSignal;
  requestTimeoutMs?: number;
  pollTimeoutMs?: number;
  pollIntervalMs?: number;
  pollRequestTimeoutMs?: number;
}

const INITIAL_STATE: VideoGenerationState = {
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

const parseVeoVideoJobResult = (
  snapshot: JobStatusSnapshot,
  response: ProviderJobResponse,
  options: VideoGenerationOptions,
): GeneratedVideo => {
  const url = collectVideoUrl(snapshot, response);
  if (!url) {
    throw new Error('Job completed but no result URL was provided.');
  }

  return {
    url,
    prompt: options.prompt,
    model: options.model ?? 'veo-3.1-generate-preview',
    timestamp: new Date().toISOString(),
    jobId: response.jobId ?? snapshot.job.id ?? undefined,
    type: 'video',
    references: options.references,
  };
};

const parseImmediateVeoVideoResult = (
  response: ProviderJobResponse,
  options: VideoGenerationOptions,
): GeneratedVideo | undefined => {
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
    model: options.model ?? 'veo-3.1-generate-preview',
    timestamp: new Date().toISOString(),
    jobId: pickString(payload.jobId),
    type: 'video',
    references: options.references,
  };
};

export const useVeoVideoGeneration = () => {
  const tracker = useGenerationJobTracker();
  const [state, setState] = useState<VideoGenerationState>(INITIAL_STATE);

  const startGeneration = useCallback(async (options: VideoGenerationOptions) => {
    if (!options.prompt?.trim()) {
      throw new Error('Prompt is required for Veo video generation.');
    }

    setState({
      isLoading: true,
      error: null,
      generatedVideo: null,
      operationName: 'veo_video_generate',
      isPolling: true,
      progress: 'Submitting request…',
    });

    try {
      const providerOptions: Record<string, unknown> = {};
      if (options.aspectRatio) providerOptions.aspect_ratio = options.aspectRatio;
      if (options.negativePrompt) providerOptions.negative_prompt = options.negativePrompt;
      if (options.seed !== undefined) providerOptions.seed = options.seed;
      if (options.imageBase64) providerOptions.image_base64 = options.imageBase64;
      if (options.imageMimeType) providerOptions.image_mime_type = options.imageMimeType;

      const { result } = await runGenerationJob<GeneratedVideo, Record<string, unknown>>({
        provider: 'veo',
        mediaType: 'video',
        body: {
          prompt: options.prompt,
          model: options.model ?? 'veo-3.1-generate-preview',
          providerOptions,
          references: options.references,
        },
        tracker,
        prompt: options.prompt,
        model: options.model ?? 'veo-3.1-generate-preview',
        signal: options.signal,
        timeoutMs: options.requestTimeoutMs,
        pollTimeoutMs: options.pollTimeoutMs,
        pollIntervalMs: options.pollIntervalMs,
        requestTimeoutMs: options.pollRequestTimeoutMs,
        parseImmediateResult: (response) =>
          parseImmediateVeoVideoResult(response, options),
        parseJobResult: (snapshot, response) =>
          parseVeoVideoJobResult(snapshot, response, options),
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
        operationName: 'veo_video_generate',
        isPolling: false,
        progress: 'Generation complete!',
      });

      return result;
    } catch (error) {
      const message = resolveGenerationCatchError(
        error,
        'Veo couldn’t generate that video. Try again in a moment.',
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
  }, [tracker]);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    startGeneration,
    reset,
  };
};
