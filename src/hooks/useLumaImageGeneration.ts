import { useCallback, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { normalizeAssetUrl } from '../utils/api';
import { resolveGenerationCatchError } from '../utils/errorMessages';
import {
  runGenerationJob,
  useGenerationJobTracker,
  type JobStatusSnapshot,
  type ProviderJobResponse,
} from './generationJobHelpers';
import type { GeneratedImage } from './useGeminiImageGeneration';

export interface LumaGeneratedImage extends GeneratedImage {
  generationId?: string | null;
  state?: string | null;
  contentType?: string | null;
  jobId?: string;
}

interface LumaImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImage: LumaGeneratedImage | null;
  generationId: string | null;
  status: string | null;
  contentType: string | null;
  progress?: string;
}

export interface LumaImageGenerationOptions {
  prompt: string;
  model: 'luma-photon-1' | 'luma-photon-flash-1';
  aspectRatio?: string;
  imageRef?: unknown;
  styleRef?: unknown;
  characterRef?: unknown;
  modifyImageRef?: unknown;
  format?: string;
  callbackUrl?: string;
  avatarId?: string;
  signal?: AbortSignal;
  requestTimeoutMs?: number;
  pollTimeoutMs?: number;
  pollIntervalMs?: number;
  pollRequestTimeoutMs?: number;
}

// const AUTH_ERROR_MESSAGE = 'Please sign in to generate Luma images.';
const DEFAULT_ASPECT_RATIO = '16:9';

export function useLumaImageGeneration() {
  const { user } = useAuth();
  const tracker = useGenerationJobTracker();
  const [state, setState] = useState<LumaImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImage: null,
    generationId: null,
    status: null,
    contentType: null,
    progress: undefined,
  });

  const pickString = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

  const asRecord = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;

  const buildProviderOptions = (options: LumaImageGenerationOptions): Record<string, unknown> => {
    const providerOptions: Record<string, unknown> = {
      aspect_ratio: options.aspectRatio ?? DEFAULT_ASPECT_RATIO,
    };

    if (options.imageRef !== undefined) {
      providerOptions.image_ref = options.imageRef;
    }
    if (options.styleRef !== undefined) {
      providerOptions.style_ref = options.styleRef;
    }
    if (options.characterRef !== undefined) {
      providerOptions.character_ref = options.characterRef;
    }
    if (options.modifyImageRef !== undefined) {
      providerOptions.modify_image_ref = options.modifyImageRef;
    }
    if (options.format !== undefined) {
      providerOptions.format = options.format;
    }
    if (options.callbackUrl !== undefined) {
      providerOptions.callback_url = options.callbackUrl;
    }

    return providerOptions;
  };

  const collectResultUrl = useCallback((
    snapshot: JobStatusSnapshot,
    response: ProviderJobResponse,
  ): string | undefined => {
    const urls: (string | undefined)[] = [];

    urls.push(pickString(snapshot.job.resultUrl));

    const metadata = asRecord(snapshot.job.metadata);
    if (metadata) {
      urls.push(
        pickString(metadata.resultUrl) ??
        pickString(metadata.result_url) ??
        pickString(metadata.url) ??
        pickString(metadata.fileUrl) ??
        pickString(metadata.imageUrl),
      );

      const results = metadata.results;
      if (Array.isArray(results)) {
        for (const entry of results) {
          if (typeof entry === 'string') {
            urls.push(pickString(entry));
          } else {
            const record = asRecord(entry);
            if (record) {
              urls.push(
                pickString(record.url) ??
                pickString(record.resultUrl) ??
                pickString(record.imageUrl),
              );
            }
          }
        }
      }
    }

    const payload = response.payload;
    if (typeof payload.resultUrl === 'string') {
      urls.push(pickString(payload.resultUrl));
    }
    if (typeof payload.dataUrl === 'string') {
      urls.push(pickString(payload.dataUrl));
    }
    if (Array.isArray(payload.dataUrls)) {
      for (const entry of payload.dataUrls) {
        urls.push(pickString(entry));
      }
    }
    if (typeof payload.image === 'string') {
      urls.push(pickString(payload.image));
    }

    return urls.find((value): value is string => Boolean(value));
  }, []);

  const extractGenerationId = useCallback((
    snapshot: JobStatusSnapshot,
    response?: ProviderJobResponse,
  ): string | undefined => {
    const metadata = asRecord(snapshot.job.metadata);
    if (metadata) {
      const candidate =
        pickString(metadata.generationId) ??
        pickString(metadata.generation_id) ??
        pickString(metadata.id);
      if (candidate) return candidate;
    }

    if (response) {
      const payload = response.payload;
      const candidate =
        pickString(payload.generationId) ??
        pickString(payload.generation_id) ??
        pickString(payload.id);
      if (candidate) {
        return candidate;
      }
    }

    return pickString(snapshot.job.id);
  }, []);

  const extractContentType = useCallback((
    snapshot: JobStatusSnapshot,
    response?: ProviderJobResponse,
  ): string | undefined => {
    const metadata = asRecord(snapshot.job.metadata);
    if (metadata) {
      const candidate =
        pickString(metadata.contentType) ??
        pickString(metadata.mimeType) ??
        pickString(metadata.mime_type);
      if (candidate) {
        return candidate;
      }
    }

    if (response) {
      const payload = response.payload;
      const candidate =
        pickString(payload.contentType) ??
        pickString(payload.mimeType) ??
        pickString(payload.mime_type);
      if (candidate) {
        return candidate;
      }
    }

    return undefined;
  }, []);

  const parseLumaJobResult = useCallback((
    snapshot: JobStatusSnapshot,
    response: ProviderJobResponse,
    options: LumaImageGenerationOptions,
    ownerId: string | undefined,
  ): LumaGeneratedImage => {
    const url = normalizeAssetUrl(collectResultUrl(snapshot, response));

    if (!url) {
      throw new Error('Job completed but no result URL was provided.');
    }

    return {
      url,
      prompt: options.prompt,
      model: options.model,
      timestamp: new Date().toISOString(),
      ownerId,
      avatarId: options.avatarId,
      generationId: extractGenerationId(snapshot, response) ?? null,
      state: snapshot.job.status ?? snapshot.status ?? null,
      contentType: extractContentType(snapshot, response) ?? null,
      jobId: response.jobId ?? snapshot.job.id ?? undefined,
    };
  }, [extractGenerationId, extractContentType, collectResultUrl]);

  const parseImmediateLumaResult = useCallback((
    response: ProviderJobResponse,
    options: LumaImageGenerationOptions,
    ownerId: string | undefined,
  ): LumaGeneratedImage | undefined => {
    const payload = response.payload;

    const directUrl =
      (typeof payload.dataUrl === 'string' && payload.dataUrl) ||
      (Array.isArray(payload.dataUrls)
        ? payload.dataUrls.find((value): value is string => typeof value === 'string')
        : undefined) ||
      (typeof payload.image === 'string' ? payload.image : undefined) ||
      (typeof payload.resultUrl === 'string' ? payload.resultUrl : undefined);

    if (!directUrl) {
      return undefined;
    }

    const generationId =
      pickString(payload.generationId) ??
      pickString(payload.generation_id) ??
      pickString(payload.id);

    const contentType =
      pickString(payload.contentType) ??
      pickString(payload.mimeType) ??
      pickString(payload.mime_type);

    const state = pickString(payload.state) ?? pickString(payload.status);

    return {
      url: normalizeAssetUrl(directUrl) || directUrl,
      prompt: options.prompt,
      model: options.model,
      timestamp: new Date().toISOString(),
      ownerId,
      avatarId: options.avatarId,
      generationId: generationId ?? null,
      state: state ?? null,
      contentType: contentType ?? null,
      jobId: pickString(payload.jobId) ?? undefined,
    };
  }, []);

  const generateImage = useCallback(
    async (options: LumaImageGenerationOptions) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        progress: 'Submitting request…',
      }));

      try {
        const providerOptions = buildProviderOptions(options);

        const { result } = await runGenerationJob<LumaGeneratedImage, Record<string, unknown>>({
          provider: 'luma',
          mediaType: 'image',
          body: {
            prompt: options.prompt,
            model: options.model,
            providerOptions,
            avatarId: options.avatarId,
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
            parseImmediateLumaResult(response, options, user?.id),
          parseJobResult: (snapshot, response) =>
            parseLumaJobResult(snapshot, response, options, user?.id),
          onUpdate: (snapshot) => {
            const metadata = asRecord(snapshot.job.metadata);
            const status = snapshot.job.status ?? snapshot.status ?? null;
            const generationId = extractGenerationId(snapshot) ?? undefined;
            const contentType =
              extractContentType(snapshot) ??
              (metadata
                ? pickString(metadata.contentType) ??
                pickString(metadata.mimeType) ??
                pickString(metadata.mime_type)
                : undefined);

            setState((prev) => ({
              ...prev,
              status,
              generationId: generationId ?? prev.generationId,
              contentType: contentType ?? prev.contentType,
              progress:
                snapshot.progress !== undefined
                  ? `${Math.round(snapshot.progress)}%`
                  : snapshot.stage ?? prev.progress,
            }));
          },
        });

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
          generatedImage: result,
          generationId: result.generationId ?? prev.generationId,
          status: result.state ?? 'COMPLETED',
          contentType: result.contentType ?? prev.contentType,
          progress: 'Generation complete!',
        }));

        return result;
      } catch (error) {
        const message = resolveGenerationCatchError(error, 'Luma couldn’t generate that image. Try again in a moment.');
        setState({
          isLoading: false,
          error: message,
          generatedImage: null,
          generationId: null,
          status: null,
          contentType: null,
          progress: undefined,
        });
        throw new Error(message);
      }
    },
    [tracker, user?.id, extractContentType, extractGenerationId, parseImmediateLumaResult, parseLumaJobResult],
  );

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
      generationId: null,
      status: null,
      contentType: null,
      progress: undefined,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      generatedImage: null,
      generationId: null,
      status: null,
      contentType: null,
      progress: undefined,
    });
  }, []);

  return {
    ...state,
    generateImage,
    clearError,
    clearGeneratedImage,
    reset,
  };
}
