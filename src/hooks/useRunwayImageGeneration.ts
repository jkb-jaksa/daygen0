import { useState, useCallback } from 'react';
import { debugLog } from '../utils/debug';
import { resolveGenerationCatchError } from '../utils/errorMessages';
import { normalizeAssetUrl } from '../utils/api';
import { useAuth } from '../auth/useAuth';
import { useCreditCheck } from './useCreditCheck';
import {
  runGenerationJob,
  useGenerationJobTracker,
  type JobStatusSnapshot,
  type ProviderJobResponse,
} from './generationJobHelpers';

export interface GeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  references?: string[]; // Base64 data URLs for reference images used
  ownerId?: string; // Optional user ID who generated the image
  avatarId?: string;
  avatarImageId?: string;
  styleId?: string;
  jobId?: string;
}

export interface ImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImage: GeneratedImage | null;
  jobStatus: 'queued' | 'processing' | 'completed' | 'failed' | null;
  progress?: string;
}

export interface ImageGenerationOptions {
  prompt: string;
  model?: string; // Internal API model name (gen4_image, gen4_image_turbo)
  uiModel?: string; // UI model ID (runway-gen4, runway-gen4-turbo)
  references?: string[]; // Base64 data URLs for reference images
  ratio?: string; // Aspect ratio like "1920:1080"
  seed?: number; // Optional seed for reproducible results
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

export const useRunwayImageGeneration = () => {
  const { user } = useAuth();
  const tracker = useGenerationJobTracker();
  const {
    checkCredits,
    showInsufficientCreditsModal,
    creditCheckData,
    handleBuyCredits,
    handleCloseModal
  } = useCreditCheck();
  const [state, setState] = useState<ImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImage: null,
    jobStatus: null,
    progress: undefined,
  });

  const clampProgress = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

  const formatProgress = useCallback((snapshot: JobStatusSnapshot, previous?: string): string | undefined => {
    if (typeof snapshot.progress === 'number' && Number.isFinite(snapshot.progress)) {
      return `${clampProgress(snapshot.progress)}%`;
    }

    if (snapshot.stage) {
      return snapshot.stage;
    }

    return previous;
  }, []);

  const buildProviderOptions = (options: ImageGenerationOptions): Record<string, unknown> => {
    const providerOptions: Record<string, unknown> = {};
    if (options.ratio) providerOptions.ratio = options.ratio;
    if (options.seed !== undefined) providerOptions.seed = options.seed;
    return providerOptions;
  };

  const pickString = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

  const asRecord = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;

  const collectCandidateUrls = useCallback((
    snapshot: JobStatusSnapshot,
    response: ProviderJobResponse,
  ): string[] => {
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
  }, []);

  const parseRunwayJobResult = useCallback((
    snapshot: JobStatusSnapshot,
    response: ProviderJobResponse,
    options: ImageGenerationOptions,
    ownerId: string | undefined,
  ): GeneratedImage => {
    const urls = collectCandidateUrls(snapshot, response);

    const resolvedUrl = urls[0];
    if (!resolvedUrl) {
      throw new Error('Job completed but no result URL was provided.');
    }

    const resolvedModel = options.uiModel ?? options.model ?? 'runway-gen4';

    return {
      url: resolvedUrl,
      prompt: options.prompt,
      model: resolvedModel,
      timestamp: new Date().toISOString(),
      jobId: response.jobId ?? snapshot.job.id ?? undefined,
      references: options.references && options.references.length ? options.references : undefined,
      ownerId,
      avatarId: options.avatarId,
      avatarImageId: options.avatarImageId,
      styleId: options.styleId,
    };
  }, [collectCandidateUrls]);

  const parseImmediateRunwayResult = useCallback((
    response: ProviderJobResponse,
    options: ImageGenerationOptions,
    ownerId: string | undefined,
  ): GeneratedImage | undefined => {
    const payload = response.payload;

    const url =
      pickString(payload.dataUrl) ??
      pickString(payload.url) ??
      pickString(payload.image) ??
      (Array.isArray(payload.dataUrls)
        ? payload.dataUrls.map(pickString).find((value): value is string => Boolean(value))
        : undefined);

    if (!url) {
      return undefined;
    }

    const resolvedModel = options.uiModel ?? options.model ?? 'runway-gen4';
    const jobId = response.jobId ?? pickString(payload.jobId) ?? `runway-${Date.now()}`;

    return {
      url: normalizeAssetUrl(url) || url,
      prompt: options.prompt,
      model: resolvedModel,
      timestamp: new Date().toISOString(),
      references: options.references && options.references.length ? options.references : undefined,
      ownerId,
      avatarId: options.avatarId,
      avatarImageId: options.avatarImageId,
      styleId: options.styleId,
      jobId,
    };
  }, []);

  const generateImage = useCallback(async (options: ImageGenerationOptions) => {
    // Check credits before starting generation
    const creditCheck = checkCredits(1, 'image generation');
    if (!creditCheck.hasCredits) {
      return; // Modal will be shown by useCreditCheck hook
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      generatedImage: null,
      jobStatus: 'queued',
      progress: 'Submitting request…',
    }));

    try {
      const { prompt } = options;
      const resolvedModel = options.uiModel ?? options.model ?? 'runway-gen4';
      const providerModel = options.model ?? resolvedModel;
      const references = options.references ?? [];

      debugLog('[runway] Starting generation', { promptLength: prompt.length, resolvedModel });

      const { result } = await runGenerationJob<GeneratedImage, Record<string, unknown>>({
        provider: 'runway',
        mediaType: 'image',
        body: {
          prompt,
          model: providerModel,
          references,
          avatarId: options.avatarId,
          avatarImageId: options.avatarImageId,
          styleId: options.styleId,
          providerOptions: buildProviderOptions(options),
        },
        tracker,
        prompt,
        model: providerModel,
        signal: options.signal,
        timeoutMs: options.requestTimeoutMs,
        pollTimeoutMs: options.pollTimeoutMs,
        pollIntervalMs: options.pollIntervalMs,
        requestTimeoutMs: options.pollRequestTimeoutMs,
        parseImmediateResult: (response) =>
          parseImmediateRunwayResult(response, options, user?.id),
        parseJobResult: (snapshot, response) =>
          parseRunwayJobResult(snapshot, response, options, user?.id),
        onUpdate: (snapshot) => {
          setState(prev => ({
            ...prev,
            jobStatus: snapshot.status,
            progress: formatProgress(snapshot, prev.progress),
          }));
        },
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImage: result,
        error: null,
        jobStatus: 'completed',
        progress: 'Generation complete!',
      }));

      return result;
    } catch (error) {
      const errorMessage = resolveGenerationCatchError(error, 'Runway couldn’t generate that image. Try again in a moment.');

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        generatedImage: null,
        jobStatus: 'failed',
        progress: undefined,
      }));

      throw new Error(errorMessage);
    }
  }, [checkCredits, tracker, user?.id, formatProgress, parseImmediateRunwayResult, parseRunwayJobResult]);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  const clearImage = useCallback(() => {
    setState(prev => ({
      ...prev,
      generatedImage: null,
      jobStatus: null,
      progress: undefined,
    }));
  }, []);

  return {
    ...state,
    generateImage,
    clearError,
    clearImage,
    showInsufficientCreditsModal,
    creditCheckData,
    handleBuyCredits,
    handleCloseModal,
  };
};
