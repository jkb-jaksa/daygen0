import { useState, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { resolveGenerationCatchError } from '../utils/errorMessages';
import {
  runGenerationJob,
  useGenerationJobTracker,
  type JobStatusSnapshot,
  type ProviderJobResponse,
} from './generationJobHelpers';

export interface IdeogramGeneratedImage {
  url: string;
  prompt: string;
  timestamp: string;
  model: 'ideogram';
  aspectRatio?: string;
  resolution?: string;
  renderingSpeed?: string;
  stylePreset?: string;
  styleType?: string;
  negativePrompt?: string;
  ownerId?: string;
  avatarId?: string;
  avatarImageId?: string;
  styleId?: string;
  jobId?: string;
}

export interface IdeogramImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImages: IdeogramGeneratedImage[];
  progress?: string;
  progressValue?: number;
}

export interface IdeogramGenerateOptions {
  prompt: string;
  aspect_ratio?: string;
  resolution?: string;
  rendering_speed?: 'TURBO' | 'DEFAULT' | 'QUALITY';
  num_images?: number;
  seed?: number;
  style_preset?: string;
  style_type?: 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'FICTION';
  negative_prompt?: string;
  avatarId?: string;
  avatarImageId?: string;
  productId?: string;
  styleId?: string;
  signal?: AbortSignal;
  requestTimeoutMs?: number;
  pollTimeoutMs?: number;
  pollIntervalMs?: number;
  pollRequestTimeoutMs?: number;
  mask?: string;
  references?: string[];
}

export interface IdeogramEditOptions {
  image: File;
  mask: File;
  prompt: string;
  rendering_speed?: 'TURBO' | 'DEFAULT' | 'QUALITY';
  seed?: number;
  num_images?: number;
  style_preset?: string;
  style_type?: 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'FICTION';
}

export interface IdeogramReframeOptions {
  image: File;
  resolution: string;
  rendering_speed?: 'TURBO' | 'DEFAULT' | 'QUALITY';
  seed?: number;
  num_images?: number;
  style_preset?: string;
}

export interface IdeogramReplaceBgOptions {
  image: File;
  prompt: string;
  rendering_speed?: 'TURBO' | 'DEFAULT' | 'QUALITY';
  seed?: number;
  num_images?: number;
  style_preset?: string;
}

export interface IdeogramUpscaleOptions {
  image: File;
  resemblance?: number;
  detail?: number;
  prompt?: string;
}

export interface IdeogramDescribeOptions {
  image: File;
  model_version?: 'V_2' | 'V_3';
}

// const AUTH_ERROR_MESSAGE = 'Please sign in to generate Ideogram images.';

const pickString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const clampProgress = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const formatProgressUpdate = (
  snapshot: JobStatusSnapshot,
  previous: { progress?: string; progressValue?: number },
): { progress?: string; progressValue?: number } => {
  if (typeof snapshot.progress === 'number' && Number.isFinite(snapshot.progress)) {
    const value = clampProgress(snapshot.progress);
    return {
      progress: `${value}%`,
      progressValue: value,
    };
  }

  if (snapshot.stage) {
    return {
      progress: snapshot.stage,
      progressValue: previous.progressValue,
    };
  }

  return {
    progress: previous.progress ?? 'Processing…',
    progressValue: previous.progressValue,
  };
};

const buildProviderOptions = (
  options: IdeogramGenerateOptions,
): Record<string, unknown> => {
  const providerOptions: Record<string, unknown> = {};
  if (options.aspect_ratio) providerOptions.aspect_ratio = options.aspect_ratio;
  if (options.resolution) providerOptions.resolution = options.resolution;
  if (options.rendering_speed) providerOptions.rendering_speed = options.rendering_speed;
  if (options.num_images) providerOptions.num_images = options.num_images;
  if (options.seed !== undefined) providerOptions.seed = options.seed;
  if (options.style_preset) providerOptions.style_preset = options.style_preset;
  if (options.style_type) providerOptions.style_type = options.style_type;
  if (options.negative_prompt) providerOptions.negative_prompt = options.negative_prompt;
  if (options.mask) providerOptions.mask = options.mask;
  return providerOptions;
};

const extractUrls = (
  snapshot: JobStatusSnapshot,
  response: ProviderJobResponse,
): string[] => {
  const urls = new Set<string>();

  const push = (value?: string) => {
    if (value) {
      urls.add(value);
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
            push(pickString(record.resultUrl));
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

  return Array.from(urls);
};

const parseIdeogramJobResult = (
  snapshot: JobStatusSnapshot,
  response: ProviderJobResponse,
  options: IdeogramGenerateOptions,
  ownerId: string | undefined,
): IdeogramGeneratedImage[] => {
  const urls = extractUrls(snapshot, response);

  if (urls.length === 0) {
    throw new Error('Job completed but no result URL was provided.');
  }

  const jobId = response.jobId ?? snapshot.job.id ?? undefined;

  return urls.map((url) => ({
    url,
    prompt: options.prompt,
    timestamp: new Date().toISOString(),
    model: 'ideogram',
    aspectRatio: options.aspect_ratio,
    resolution: options.resolution,
    renderingSpeed: options.rendering_speed,
    stylePreset: options.style_preset,
    styleType: options.style_type,
    negativePrompt: options.negative_prompt,
    ownerId,
    avatarId: options.avatarId,
    avatarImageId: options.avatarImageId,
    styleId: options.styleId,
    jobId,
  }));
};

const parseImmediateIdeogramResult = (
  response: ProviderJobResponse,
  options: IdeogramGenerateOptions,
  ownerId: string | undefined,
): IdeogramGeneratedImage[] | undefined => {
  const payload = response.payload;
  const dataUrls = Array.isArray(payload.dataUrls)
    ? payload.dataUrls
      .map(pickString)
      .filter((value): value is string => Boolean(value))
    : [];

  const directUrl = pickString(payload.dataUrl);

  const urls = dataUrls.length > 0 ? dataUrls : directUrl ? [directUrl] : [];

  if (urls.length === 0) {
    return undefined;
  }

  return urls.map((url) => ({
    url,
    prompt: options.prompt,
    timestamp: new Date().toISOString(),
    model: 'ideogram',
    aspectRatio: options.aspect_ratio,
    resolution: options.resolution,
    renderingSpeed: options.rendering_speed,
    stylePreset: options.style_preset,
    styleType: options.style_type,
    negativePrompt: options.negative_prompt,
    ownerId,
    avatarId: options.avatarId,
    avatarImageId: options.avatarImageId,
    styleId: options.styleId,
  }));
};

export const useIdeogramImageGeneration = () => {
  const { user } = useAuth();
  const tracker = useGenerationJobTracker();
  const [state, setState] = useState<IdeogramImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImages: [],
    progress: undefined,
    progressValue: undefined,
  });

  const generateImage = useCallback(
    async (options: IdeogramGenerateOptions) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        progress: 'Submitting request…',
        progressValue: 0,
      }));

      try {
        const providerOptions = buildProviderOptions(options);

        const { result } = await runGenerationJob<IdeogramGeneratedImage[], Record<string, unknown>>({
          provider: 'ideogram',
          mediaType: 'image',
          body: {
            prompt: options.prompt,
            model: 'ideogram',
            providerOptions,
            references: options.references,
          },
          tracker,
          prompt: options.prompt,
          model: 'ideogram',
          signal: options.signal,
          timeoutMs: options.requestTimeoutMs,
          pollTimeoutMs: options.pollTimeoutMs,
          pollIntervalMs: options.pollIntervalMs,
          requestTimeoutMs: options.pollRequestTimeoutMs,
          parseImmediateResult: (response) =>
            parseImmediateIdeogramResult(response, options, user?.id),
          parseJobResult: (snapshot, response) =>
            parseIdeogramJobResult(snapshot, response, options, user?.id),
          onUpdate: (snapshot) => {
            setState((prev) => ({
              ...prev,
              ...formatProgressUpdate(snapshot, {
                progress: prev.progress,
                progressValue: prev.progressValue,
              }),
            }));
          },
        });

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
          progress: 'Generation complete!',
          progressValue: 100,
          generatedImages: [...prev.generatedImages, ...result],
        }));

        return result;
      } catch (error) {
        const message = resolveGenerationCatchError(
          error,
          'Ideogram couldn’t generate that image. Try again in a moment.',
        );
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
          progress: undefined,
          progressValue: undefined,
        }));
        throw new Error(message);
      }
    },
    [tracker, user?.id],
  );

  const reportUnsupported = useCallback(async (feature: string) => {
    const message = `${feature} is not yet supported in the backend integration.`;
    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: message,
      progress: undefined,
      progressValue: undefined,
    }));
    throw new Error(message);
  }, []);

  const editImage = useCallback(
    async (): Promise<IdeogramGeneratedImage[]> => {
      await reportUnsupported('Ideogram editing');
      return [];
    },
    [reportUnsupported],
  );

  const reframeImage = useCallback(
    async (): Promise<IdeogramGeneratedImage[]> => {
      await reportUnsupported('Ideogram reframing');
      return [];
    },
    [reportUnsupported],
  );

  const replaceBackground = useCallback(
    async (): Promise<IdeogramGeneratedImage[]> => {
      await reportUnsupported('Ideogram background replacement');
      return [];
    },
    [reportUnsupported],
  );

  const upscaleImage = useCallback(
    async (): Promise<IdeogramGeneratedImage[]> => {
      await reportUnsupported('Ideogram upscaling');
      return [];
    },
    [reportUnsupported],
  );

  const describeImage = useCallback(
    async (): Promise<string[]> => {
      await reportUnsupported('Ideogram describe');
      return [];
    },
    [reportUnsupported],
  );

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
      progressValue: undefined,
    });
  }, []);

  return {
    ...state,
    generateImage,
    editImage,
    reframeImage,
    replaceBackground,
    upscaleImage,
    describeImage,
    clearError,
    clearGeneratedImages,
    reset,
  };
};
