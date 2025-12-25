import { useState, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { resolveGenerationCatchError } from '../utils/errorMessages';
import { normalizeAssetUrl } from '../utils/api';
import {
  runGenerationJob,
  useGenerationJobTracker,
  type JobStatusSnapshot,
  type ProviderJobResponse,
} from './generationJobHelpers';

export interface QwenGeneratedImage {
  url: string;
  prompt: string;
  timestamp: string;
  model: 'qwen-image';
  size?: string;
  seed?: number;
  negativePrompt?: string;
  promptExtend?: boolean;
  watermark?: boolean;
  ownerId?: string;
  avatarId?: string;
  avatarImageId?: string;
  styleId?: string;
  jobId?: string;
}

export interface QwenImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImages: QwenGeneratedImage[];
  progress?: string;
}

export interface QwenGenerateOptions {
  prompt: string;
  size?: string;
  seed?: number;
  negative_prompt?: string;
  prompt_extend?: boolean;
  watermark?: boolean;
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

// const AUTH_ERROR_MESSAGE = 'Please sign in to generate Qwen images.';
const UNSUPPORTED_MESSAGE = 'Qwen image editing is not yet available in the backend integration.';

const DEFAULT_MODEL = 'qwen-image';

const pickString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const formatProgress = (snapshot: JobStatusSnapshot, previous?: string): string | undefined => {
  if (typeof snapshot.progress === 'number' && Number.isFinite(snapshot.progress)) {
    return `${Math.max(0, Math.min(100, Math.round(snapshot.progress)))}%`;
  }

  if (snapshot.stage) {
    return snapshot.stage;
  }

  return previous;
};

const buildProviderOptions = (options: QwenGenerateOptions): Record<string, unknown> => {
  const providerOptions: Record<string, unknown> = {};
  if (options.size) providerOptions.size = options.size;
  if (options.seed !== undefined) providerOptions.seed = options.seed;
  if (options.negative_prompt) providerOptions.negative_prompt = options.negative_prompt;
  if (options.prompt_extend !== undefined) providerOptions.prompt_extend = options.prompt_extend;
  if (options.watermark !== undefined) providerOptions.watermark = options.watermark;
  return providerOptions;
};

const extractUrls = (snapshot: JobStatusSnapshot, response: ProviderJobResponse): string[] => {
  const urls = new Set<string>();

  const push = (value?: string) => {
    if (value) {
      const normalized = normalizeAssetUrl(value);
      if (normalized) urls.add(normalized);
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

    const images = metadata.images;
    if (Array.isArray(images)) {
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
    }
  }

  const payload = response.payload;
  const payloadDataUrls = Array.isArray(payload.dataUrls) ? payload.dataUrls : [];
  for (const entry of payloadDataUrls) {
    push(pickString(entry));
  }
  push(pickString(payload.dataUrl));
  push(pickString(payload.url));
  push(pickString(payload.image));

  return Array.from(urls);
};

const parseQwenJobResult = (
  snapshot: JobStatusSnapshot,
  response: ProviderJobResponse,
  options: QwenGenerateOptions,
  ownerId: string | undefined,
): QwenGeneratedImage[] => {
  const urls = extractUrls(snapshot, response);

  if (urls.length === 0) {
    throw new Error('Job completed but no result URL was provided.');
  }

  const jobId = response.jobId ?? snapshot.job.id ?? undefined;

  return urls.map((url) => ({
    url,
    prompt: options.prompt,
    timestamp: new Date().toISOString(),
    model: DEFAULT_MODEL,
    size: options.size,
    seed: options.seed,
    negativePrompt: options.negative_prompt,
    promptExtend: options.prompt_extend,
    watermark: options.watermark,
    ownerId,
    avatarId: options.avatarId,
    avatarImageId: options.avatarImageId,
    styleId: options.styleId,
    jobId,
  }));
};

const parseImmediateQwenResult = (
  response: ProviderJobResponse,
  options: QwenGenerateOptions,
  ownerId: string | undefined,
): QwenGeneratedImage[] | undefined => {
  const payload = response.payload;
  const dataUrls = Array.isArray(payload.dataUrls)
    ? payload.dataUrls
      .map(pickString)
      .filter((value): value is string => Boolean(value))
    : [];

  const directUrl = pickString(payload.dataUrl) ?? pickString(payload.url) ?? pickString(payload.image);

  const urls = dataUrls.length > 0 ? dataUrls : directUrl ? [directUrl] : [];

  if (urls.length === 0) {
    return undefined;
  }

  return urls.map((url) => ({
    url: normalizeAssetUrl(url) || url,
    prompt: options.prompt,
    timestamp: new Date().toISOString(),
    model: DEFAULT_MODEL,
    size: options.size,
    seed: options.seed,
    negativePrompt: options.negative_prompt,
    promptExtend: options.prompt_extend,
    watermark: options.watermark,
    ownerId,
    avatarId: options.avatarId,
    avatarImageId: options.avatarImageId,
    styleId: options.styleId,
  }));
};

export const useQwenImageGeneration = () => {
  const { user } = useAuth();
  const tracker = useGenerationJobTracker();
  const [state, setState] = useState<QwenImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImages: [],
    progress: undefined,
  });

  const generateImage = useCallback(
    async (options: QwenGenerateOptions) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        progress: 'Submitting request…',
      }));

      try {
        const providerOptions = buildProviderOptions(options);

        const { result } = await runGenerationJob<QwenGeneratedImage[], Record<string, unknown>>({
          provider: 'qwen',
          mediaType: 'image',
          body: {
            prompt: options.prompt,
            model: DEFAULT_MODEL,
            providerOptions,
          },
          tracker,
          prompt: options.prompt,
          model: DEFAULT_MODEL,
          signal: options.signal,
          timeoutMs: options.requestTimeoutMs,
          pollTimeoutMs: options.pollTimeoutMs,
          pollIntervalMs: options.pollIntervalMs,
          requestTimeoutMs: options.pollRequestTimeoutMs,
          parseImmediateResult: (response) =>
            parseImmediateQwenResult(response, options, user?.id),
          parseJobResult: (snapshot, response) =>
            parseQwenJobResult(snapshot, response, options, user?.id),
          onUpdate: (snapshot) => {
            setState((prev) => ({
              ...prev,
              progress: formatProgress(snapshot, prev.progress) ?? prev.progress,
            }));
          },
        });

        setState((prev) => ({
          ...prev,
          isLoading: false,
          generatedImages: [...prev.generatedImages, ...result],
          error: null,
          progress: 'Generation complete!',
        }));

        return result;
      } catch (error) {
        const message = resolveGenerationCatchError(error, 'Qwen couldn’t generate that image. Try again in a moment.');
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
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

  const clearGeneratedImages = useCallback(() => {
    setState((prev) => ({
      ...prev,
      generatedImages: [],
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      generatedImages: [],
      progress: undefined,
    });
  }, []);

  return {
    ...state,
    generateImage,
    editImage,
    clearError,
    clearGeneratedImages,
    reset,
  };
};
