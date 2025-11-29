import { useState, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { resolveGenerationCatchError } from '../utils/errorMessages';
import {
  runGenerationJob,
  useGenerationJobTracker,
  type JobStatusSnapshot,
  type ProviderJobResponse,
} from './generationJobHelpers';

export interface ReveGeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  jobId: string;
  references?: string[];
  ownerId?: string;
  avatarId?: string;
  avatarImageId?: string;
  styleId?: string;
}

export interface ReveImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImage: ReveGeneratedImage | null;
  jobStatus: 'queued' | 'processing' | 'completed' | 'failed' | null;
  progress?: string;
}

export interface ReveImageGenerationOptions {
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  aspect_ratio?: string;
  negative_prompt?: string;
  guidance_scale?: number;
  steps?: number;
  seed?: number;
  references?: string[];
  avatarId?: string;
  avatarImageId?: string;
  productId?: string;
  styleId?: string;
  signal?: AbortSignal;
  requestTimeoutMs?: number;
  pollTimeoutMs?: number;
  pollIntervalMs?: number;
  pollRequestTimeoutMs?: number;
}

// const AUTH_ERROR_MESSAGE = 'Please sign in to generate Reve images.';
const UNSUPPORTED_MESSAGE = 'Reve image editing is not yet available in the backend integration.';

const DEFAULT_MODEL = 'reve-image-1.0';

const pickString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const clampProgress = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const formatProgress = (
  snapshot: JobStatusSnapshot,
  previous?: string,
): string | undefined => {
  if (typeof snapshot.progress === 'number' && Number.isFinite(snapshot.progress)) {
    return `${clampProgress(snapshot.progress)}%`;
  }

  if (snapshot.stage) {
    return snapshot.stage;
  }

  return previous;
};

const buildProviderOptions = (
  options: ReveImageGenerationOptions,
): Record<string, unknown> => {
  const providerOptions: Record<string, unknown> = {};
  if (options.width !== undefined) providerOptions.width = options.width;
  if (options.height !== undefined) providerOptions.height = options.height;
  if (options.aspect_ratio) providerOptions.aspect_ratio = options.aspect_ratio;
  if (options.negative_prompt) providerOptions.negative_prompt = options.negative_prompt;
  if (options.guidance_scale !== undefined) providerOptions.guidance_scale = options.guidance_scale;
  if (options.steps !== undefined) providerOptions.steps = options.steps;
  if (options.seed !== undefined) providerOptions.seed = options.seed;
  return providerOptions;
};

const collectCandidateUrls = (
  snapshot: JobStatusSnapshot,
  response: ProviderJobResponse,
): string[] => {
  const urls: string[] = [];

  const push = (value?: string) => {
    if (value) {
      urls.push(value);
    }
  };

  push(pickString(snapshot.job.resultUrl));

  const metadata = asRecord(snapshot.job.metadata);
  if (metadata) {
    push(pickString(metadata.resultUrl));
    push(pickString(metadata.result_url));
    push(pickString(metadata.url));
    push(pickString(metadata.imageUrl));
    push(pickString(metadata.image_url));

    const results = metadata.results;
    if (Array.isArray(results)) {
      for (const entry of results) {
        if (typeof entry === 'string') {
          push(pickString(entry));
        } else {
          const record = asRecord(entry);
          if (record) {
            push(pickString(record.url));
            push(pickString(record.imageUrl));
            push(pickString(record.resultUrl));
          }
        }
      }
    }
  }

  const payload = response.payload;
  const images = Array.isArray(payload.images) ? payload.images : [];
  for (const entry of images) {
    if (typeof entry === 'string') {
      push(pickString(entry));
    } else {
      const record = asRecord(entry);
      if (record) {
        push(pickString(record.url));
        push(pickString(record.imageUrl));
      }
    }
  }

  push(pickString(payload.dataUrl));
  push(pickString(payload.image));
  push(pickString(payload.url));

  return urls.filter(Boolean);
};

const parseReveJobResult = (
  snapshot: JobStatusSnapshot,
  response: ProviderJobResponse,
  options: ReveImageGenerationOptions,
  ownerId: string | undefined,
): ReveGeneratedImage => {
  const urls = collectCandidateUrls(snapshot, response);

  const resolvedUrl = urls[0];

  if (!resolvedUrl) {
    throw new Error('Job completed but no result URL was provided.');
  }

  return {
    url: resolvedUrl,
    prompt: options.prompt,
    model: options.model ?? DEFAULT_MODEL,
    timestamp: new Date().toISOString(),
    jobId: response.jobId ?? snapshot.job.id ?? `reve-${Date.now()}`,
    references: options.references && options.references.length ? options.references : undefined,
    ownerId,
    avatarId: options.avatarId,
    avatarImageId: options.avatarImageId,
    styleId: options.styleId,
  };
};

const parseImmediateReveResult = (
  response: ProviderJobResponse,
  options: ReveImageGenerationOptions,
  ownerId: string | undefined,
): ReveGeneratedImage | undefined => {
  const payload = response.payload;

  const imageUrl =
    (Array.isArray(payload.images)
      ? payload.images
          .map(pickString)
          .find((value): value is string => Boolean(value))
      : undefined) ??
    pickString(payload.dataUrl) ??
    pickString(payload.url) ??
    pickString(payload.image);

  if (!imageUrl) {
    return undefined;
  }

  const jobId =
    response.jobId ??
    pickString(payload.jobId) ??
    pickString(payload.id) ??
    `reve-${Date.now()}`;

  return {
    url: imageUrl,
    prompt: options.prompt,
    model: options.model ?? DEFAULT_MODEL,
    timestamp: new Date().toISOString(),
    jobId,
    references: options.references && options.references.length ? options.references : undefined,
    ownerId,
    avatarId: options.avatarId,
    avatarImageId: options.avatarImageId,
    styleId: options.styleId,
  };
};

export const useReveImageGeneration = () => {
  const { user } = useAuth();
  const tracker = useGenerationJobTracker();
  const [state, setState] = useState<ReveImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImage: null,
    jobStatus: null,
    progress: undefined,
  });

  const generateImage = useCallback(
    async (options: ReveImageGenerationOptions) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        jobStatus: 'queued',
        progress: 'Submitting request…',
      }));

      try {
        const providerOptions = buildProviderOptions(options);

        const { result } = await runGenerationJob<ReveGeneratedImage, Record<string, unknown>>({
          provider: 'reve',
          mediaType: 'image',
          body: {
            prompt: options.prompt,
            model: options.model ?? DEFAULT_MODEL,
            references: options.references,
            providerOptions,
          },
          tracker,
          prompt: options.prompt,
          model: options.model ?? DEFAULT_MODEL,
          signal: options.signal,
          timeoutMs: options.requestTimeoutMs,
          pollTimeoutMs: options.pollTimeoutMs,
          pollIntervalMs: options.pollIntervalMs,
          requestTimeoutMs: options.pollRequestTimeoutMs,
          parseImmediateResult: (response) =>
            parseImmediateReveResult(response, options, user?.id),
          parseJobResult: (snapshot, response) =>
            parseReveJobResult(snapshot, response, options, user?.id),
          onUpdate: (snapshot) => {
            setState((prev) => ({
              ...prev,
              jobStatus: snapshot.status,
              progress: formatProgress(snapshot, prev.progress),
            }));
          },
        });

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
          generatedImage: result,
          jobStatus: 'completed',
          progress: 'Generation complete!',
        }));

        return result;
      } catch (error) {
        const message = resolveGenerationCatchError(error, 'Reve couldn’t generate that image. Try again in a moment.');
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
          generatedImage: null,
          jobStatus: 'failed',
          progress: undefined,
        }));
        throw new Error(message);
      }
    },
    [tracker, user?.id],
  );

  const editImage = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: UNSUPPORTED_MESSAGE,
      progress: undefined,
    }));
    throw new Error(UNSUPPORTED_MESSAGE);
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  const clearGeneratedImage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      generatedImage: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      generatedImage: null,
      jobStatus: null,
      progress: undefined,
    });
  }, []);

  return {
    ...state,
    generateImage,
    editImage,
    clearError,
    clearGeneratedImage,
    reset,
  };
};
