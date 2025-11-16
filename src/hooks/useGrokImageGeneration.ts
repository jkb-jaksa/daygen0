import { useCallback, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { resolveGenerationCatchError } from '../utils/errorMessages';
import { debugError } from '../utils/debug';
import {
  runGenerationJob,
  useGenerationJobTracker,
  type JobStatusSnapshot,
  type ProviderJobResponse,
} from './generationJobHelpers';

export interface GrokGeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  ownerId?: string;
  avatarId?: string;
  avatarImageId?: string;
  productId?: string;
  styleId?: string;
  jobId?: string;
}

export interface GrokImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImages: GrokGeneratedImage[];
  jobStatus: 'queued' | 'processing' | 'completed' | 'failed' | null;
  progress?: string;
}

export interface GrokImageGenerationOptions {
  prompt: string;
  model?: 'grok-2-image' | 'grok-2-image-1212' | 'grok-2-image-latest';
  n?: number;
  count?: number;
  responseFormat?: 'url' | 'b64_json';
  imageFormat?: 'url' | 'base64';
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

const DEFAULT_MODEL: GrokImageGenerationOptions['model'] = 'grok-2-image';

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

  return snapshot.stage ?? previous;
};

const buildProviderOptions = (options: GrokImageGenerationOptions): Record<string, unknown> => {
  const providerOptions: Record<string, unknown> = {};
  const responseFormat = options.responseFormat ?? 'b64_json';
  providerOptions.response_format = responseFormat;

  const count = options.n ?? options.count;
  if (typeof count === 'number' && Number.isFinite(count)) {
    providerOptions.n = Math.max(1, Math.min(10, Math.round(count)));
  }
  if (options.imageFormat) {
    providerOptions.image_format = options.imageFormat;
  }
  return providerOptions;
};

const parseGrokJobResult = (
  snapshot: JobStatusSnapshot,
  response: ProviderJobResponse,
  prompt: string,
  model: string,
  options: GrokImageGenerationOptions,
  ownerId: string | undefined,
): GrokGeneratedImage[] => {
  const metadata = asRecord(snapshot.job.metadata);
  const url =
    pickString(snapshot.job.resultUrl) ??
    pickString(metadata?.fileUrl) ??
    pickString(metadata?.r2FileUrl) ??
    pickString(metadata?.url) ??
    pickString(metadata?.imageUrl);

  if (!url) {
    throw new Error('Job completed but no result URL was provided.');
  }

  return [
    {
      url,
      prompt,
      model,
      timestamp: new Date().toISOString(),
      ownerId,
      avatarId: options.avatarId,
      avatarImageId: options.avatarImageId,
      productId: options.productId,
      styleId: options.styleId,
      jobId: response.jobId ?? snapshot.job.id ?? undefined,
    },
  ];
};

const parseImmediateGrokResult = (
  response: ProviderJobResponse,
  prompt: string,
  model: string,
  options: GrokImageGenerationOptions,
  ownerId: string | undefined,
): GrokGeneratedImage[] | undefined => {
  const payload = response.payload;
  const dataUrls = Array.isArray(payload.dataUrls)
    ? payload.dataUrls.map(pickString).filter((value): value is string => Boolean(value))
    : [];

  const directUrl =
    pickString(payload.dataUrl) ??
    pickString(payload.image) ??
    pickString(payload.url);

  const url = dataUrls[0] ?? directUrl;
  if (!url) {
    return undefined;
  }

  return [
    {
      url,
      prompt,
      model,
      timestamp: new Date().toISOString(),
      ownerId,
      avatarId: options.avatarId,
      avatarImageId: options.avatarImageId,
      productId: options.productId,
      styleId: options.styleId,
    },
  ];
};

export const useGrokImageGeneration = () => {
  const { user } = useAuth();
  const tracker = useGenerationJobTracker();
  const [state, setState] = useState<GrokImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImages: [],
    jobStatus: null,
    progress: undefined,
  });

  const generateImage = useCallback(
    async (options: GrokImageGenerationOptions) => {
      const prompt = options.prompt;
      const modelToUse = options.model ?? DEFAULT_MODEL;

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        generatedImages: [],
        jobStatus: 'queued',
        progress: 'Submitting request…',
      }));

      try {
        const { result } = await runGenerationJob<GrokGeneratedImage[], Record<string, unknown>>({
          provider: 'grok',
          mediaType: 'image',
          body: {
            prompt,
            model: modelToUse,
            providerOptions: buildProviderOptions(options),
            avatarId: options.avatarId,
            avatarImageId: options.avatarImageId,
            productId: options.productId,
            styleId: options.styleId,
          },
          tracker,
          prompt,
          model: modelToUse,
          signal: options.signal,
          timeoutMs: options.requestTimeoutMs,
          pollTimeoutMs: options.pollTimeoutMs,
          pollIntervalMs: options.pollIntervalMs,
          requestTimeoutMs: options.pollRequestTimeoutMs,
          parseImmediateResult: (response) =>
            parseImmediateGrokResult(response, prompt, modelToUse, options, user?.id),
          parseJobResult: (snapshot, response) =>
            parseGrokJobResult(snapshot, response, prompt, modelToUse, options, user?.id),
          onUpdate: (snapshot) => {
            setState((prev) => ({
              ...prev,
              jobStatus: snapshot.status,
              progress: formatProgress(snapshot, prev.progress),
            }));
          },
        });

        setState({
          isLoading: false,
          error: null,
          generatedImages: result,
          jobStatus: 'completed',
          progress: undefined,
        });

        return result;
      } catch (error) {
        debugError('[grok-image] Generation failed:', error);
        const message = resolveGenerationCatchError(
          error,
          'Grok could not generate that image. Try again in a moment.',
        );
        setState({
          isLoading: false,
          error: message,
          generatedImages: [],
          jobStatus: 'failed',
          progress: undefined,
        });
        throw new Error(message);
      }
    },
    [tracker, user?.id],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      generatedImages: [],
      jobStatus: null,
      progress: undefined,
    });
  }, []);

  return {
    ...state,
    generateImage,
    clearError,
    reset,
  };
};

