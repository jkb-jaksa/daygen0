import { useState, useCallback, useRef, useEffect } from 'react';
import { debugLog, debugWarn } from '../utils/debug';
import { useAuth } from '../auth/useAuth';
import { PLAN_LIMIT_MESSAGE, resolveGenerationCatchError } from '../utils/errorMessages';
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
  productId?: string;
  styleId?: string;
  r2FileId?: string;
  jobId?: string;
}

export type ImageGenerationStatus =
  | 'idle'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed';

export interface ImageGenerationProgressUpdate {
  clientJobId?: string;
  jobId?: string;
  progress: number;
  backendProgress?: number;
  status: ImageGenerationStatus;
  stage?: string;
}

interface ProgressController {
  timer: ReturnType<typeof setInterval> | null;
  backend: number;
  display: number;
  jobId: string | null;
  clientJobId?: string;
  status: ImageGenerationStatus;
  stage?: string;
  onProgress?: (update: ImageGenerationProgressUpdate) => void;
  lastEmitValue?: number;
  lastEmitStatus?: ImageGenerationStatus;
  lastEmitStage?: string;
  lastEmitJobId?: string | null;
}

const normalizeJobStatus = (
  status?: string,
): ImageGenerationStatus | undefined => {
  if (!status) return undefined;
  const upper = status.toUpperCase();
  if (upper === 'PENDING' || upper === 'QUEUED' || upper === 'SCHEDULED') {
    return 'queued';
  }
  if (
    upper === 'PROCESSING' ||
    upper === 'RUNNING' ||
    upper === 'IN_PROGRESS'
  ) {
    return 'processing';
  }
  if (upper === 'COMPLETED' || upper === 'SUCCEEDED' || upper === 'DONE') {
    return 'completed';
  }
  if (
    upper === 'FAILED' ||
    upper === 'CANCELLED' ||
    upper === 'CANCELED' ||
    upper === 'ERROR'
  ) {
    return 'failed';
  }
  return undefined;
};

const pickString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const clampProgress = (value: number): number =>
  Math.max(0, Math.min(100, Math.round(value)));

const buildProviderOptions = (options: ImageGenerationOptions): Record<string, unknown> => {
  const providerOptions: Record<string, unknown> = {};
  if (options.aspectRatio) providerOptions.aspectRatio = options.aspectRatio;
  return providerOptions;
};

const collectGeminiResultUrls = (
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
    push(pickString(metadata.fileUrl));
    push(pickString(metadata.r2FileUrl));
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
  const payloadDataUrls = Array.isArray(payload.dataUrls) ? payload.dataUrls : [];
  for (const entry of payloadDataUrls) {
    push(pickString(entry));
  }

  push(pickString(payload.dataUrl));
  push(pickString(payload.resultUrl));

  return Array.from(urls);
};

const extractR2FileId = (
  snapshot: JobStatusSnapshot,
  response: ProviderJobResponse,
): string | undefined => {
  const metadata = asRecord(snapshot.job.metadata);
  if (metadata) {
    return (
      pickString(metadata.r2FileId) ??
      pickString(metadata.r2_file_id) ??
      pickString(metadata.fileId)
    );
  }

  const payload = response.payload;
  return (
    pickString(payload.r2FileId) ??
    pickString(payload.r2_file_id) ??
    pickString(payload.fileId)
  );
};

const parseGeminiJobResult = (
  snapshot: JobStatusSnapshot,
  response: ProviderJobResponse,
  options: ImageGenerationOptions,
  ownerId: string | undefined,
  modelUsed: string,
): GeneratedImage => {
  const urls = collectGeminiResultUrls(snapshot, response);
  const resolvedUrl = urls[0];

  if (!resolvedUrl) {
    throw new Error('Job completed but no result URL was provided.');
  }

  return {
    url: resolvedUrl,
    prompt: options.prompt,
    model: modelUsed,
    timestamp: new Date().toISOString(),
    jobId: response.jobId ?? snapshot.job.id ?? undefined,
    references: options.references && options.references.length ? options.references : undefined,
    ownerId,
    avatarId: options.avatarId,
    avatarImageId: options.avatarImageId,
    productId: options.productId,
    styleId: options.styleId,
    r2FileId: extractR2FileId(snapshot, response),
  };
};

const parseImmediateGeminiResult = (
  response: ProviderJobResponse,
  options: ImageGenerationOptions,
  ownerId: string | undefined,
  modelUsed: string,
): GeneratedImage | undefined => {
  const payload = response.payload;
  const imageBase64 = pickString(payload.imageBase64) ?? pickString(payload.image_base64);
  const mimeType = pickString(payload.mimeType) ?? pickString(payload.mime_type) ?? 'image/png';
  const dataUrl = pickString(payload.dataUrl) ?? pickString(payload.resultUrl);

  let url: string | undefined;

  if (imageBase64) {
    url = `data:${mimeType};base64,${imageBase64}`;
  } else if (dataUrl) {
    url = dataUrl;
  }

  if (!url) {
    return undefined;
  }

  const jobId =
    pickString(payload.jobId) ??
    pickString(payload.job_id) ??
    undefined;

  return {
    url,
    prompt: options.prompt,
    model: modelUsed,
    timestamp: new Date().toISOString(),
    references: options.references && options.references.length ? options.references : undefined,
    ownerId,
    avatarId: options.avatarId,
    avatarImageId: options.avatarImageId,
    productId: options.productId,
    styleId: options.styleId,
    jobId,
  };
};

export interface ImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImage: GeneratedImage | null;
  progress: number;
  status: ImageGenerationStatus;
  jobId: string | null;
}

export interface ImageGenerationOptions {
  prompt: string;
  model?: string;
  imageData?: string; // Base64 encoded image for image-to-image
  references?: string[]; // Base64 data URLs for reference images
  temperature?: number;
  outputLength?: number; // maps to maxOutputTokens
  topP?: number;
  aspectRatio?: string;
  avatarId?: string;
  avatarImageId?: string;
  productId?: string;
  styleId?: string;
  clientJobId?: string;
  onProgress?: (update: ImageGenerationProgressUpdate) => void;
  signal?: AbortSignal;
  requestTimeoutMs?: number;
  pollTimeoutMs?: number;
  pollIntervalMs?: number;
  pollRequestTimeoutMs?: number;
}

export const useGeminiImageGeneration = () => {
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
    progress: 0,
    status: 'idle',
    jobId: null,
  });
  const progressControllerRef = useRef<ProgressController | null>(null);

  useEffect(() => {
    return () => {
      if (progressControllerRef.current?.timer) {
        clearInterval(progressControllerRef.current.timer);
        progressControllerRef.current = null;
      }
    };
  }, []);

  const emitProgress = useCallback((controller: ProgressController) => {
    const progressValue = clampProgress(controller.display);
    const shouldEmit =
      controller.lastEmitValue !== progressValue ||
      controller.lastEmitStatus !== controller.status ||
      controller.lastEmitStage !== controller.stage ||
      controller.lastEmitJobId !== (controller.jobId ?? null);

    if (!shouldEmit) {
      return;
    }

    controller.lastEmitValue = progressValue;
    controller.lastEmitStatus = controller.status;
    controller.lastEmitStage = controller.stage;
    controller.lastEmitJobId = controller.jobId ?? null;

    setState(prev => ({
      ...prev,
      progress: progressValue,
      status: controller.status,
      jobId: controller.jobId ?? prev.jobId,
    }));

    controller.onProgress?.({
      clientJobId: controller.clientJobId,
      jobId: controller.jobId ?? undefined,
      progress: progressValue,
      backendProgress: controller.backend,
      status: controller.status,
      stage: controller.stage,
    });
  }, [setState]);

  const startProgressController = useCallback((params: {
    clientJobId?: string;
    onProgress?: (update: ImageGenerationProgressUpdate) => void;
    initialStatus?: ImageGenerationStatus;
    initialProgress?: number;
  }) => {
    // Clear any existing controller completely
    if (progressControllerRef.current?.timer) {
      clearInterval(progressControllerRef.current.timer);
      progressControllerRef.current = null;
    }

    const initialProgress = Math.max(
      0,
      Math.min(100, params.initialProgress ?? 0),
    );

    const controller: ProgressController = {
      timer: null,
      backend: initialProgress,
      display: Math.max(initialProgress, 1),
      jobId: null,
      clientJobId: params.clientJobId,
      status: params.initialStatus ?? 'queued',
      stage: undefined,
      onProgress: params.onProgress,
      lastEmitValue: undefined,
      lastEmitStatus: undefined,
      lastEmitStage: undefined,
      lastEmitJobId: undefined,
    };

    progressControllerRef.current = controller;
    emitProgress(controller);

    controller.timer = setInterval(() => {
      const current = progressControllerRef.current;
      if (!current || current !== controller) {
        return;
      }

      if (current.status === 'completed' || current.status === 'failed') {
        if (current.timer) {
          clearInterval(current.timer);
          current.timer = null;
        }
        return;
      }

      const backendCap =
        current.backend >= 100
          ? 100
          : Math.min(current.backend + 8, 99);

      const isBackendMaxed = current.backend >= 100;
      let nextDisplay = current.display;

      if (isBackendMaxed) {
        nextDisplay = Math.min(100, current.display + 1.5);
      } else if (current.display < backendCap) {
        const gap = backendCap - current.display;
        const increment =
          gap > 15 ? 1.8 : gap > 8 ? 1.2 : gap > 3 ? 0.8 : 0.4;
        nextDisplay = Math.min(backendCap, current.display + increment);
      } else if (current.display < 96) {
        nextDisplay = Math.min(96, current.display + 0.2);
      }

      if (nextDisplay !== current.display) {
        current.display = nextDisplay;
        emitProgress(current);
      }
    }, 300);
  }, [emitProgress]);

  const updateControllerWithBackend = useCallback((update: {
    progress?: number;
    status?: string;
    stage?: string;
    jobId?: string | null;
  }) => {
    const controller = progressControllerRef.current;
    if (!controller) {
      return;
    }

    if (update.jobId && update.jobId !== controller.jobId) {
      controller.jobId = update.jobId;
    }

    const normalizedStatus = normalizeJobStatus(update.status);
    if (normalizedStatus && normalizedStatus !== controller.status) {
      controller.status = normalizedStatus;
    }

    if (update.stage && update.stage !== controller.stage) {
      controller.stage = update.stage;
    }

    if (typeof update.progress === 'number' && Number.isFinite(update.progress)) {
      const bounded = Math.max(0, Math.min(100, update.progress));
      if (bounded > controller.backend) {
        controller.backend = bounded;
      }
      if (bounded > controller.display) {
        controller.display = bounded;
      }
    }

    emitProgress(controller);
  }, [emitProgress]);

  const stopProgressController = useCallback((options?: {
    status?: ImageGenerationStatus;
    progress?: number;
    stage?: string;
  }) => {
    const controller = progressControllerRef.current;
    if (!controller) {
      return;
    }

    if (controller.timer) {
      clearInterval(controller.timer);
      controller.timer = null;
    }

    if (options?.status) {
      controller.status = options.status;
    }

    if (typeof options?.progress === 'number' && Number.isFinite(options.progress)) {
      const bounded = Math.max(0, Math.min(100, options.progress));
      controller.backend = Math.max(controller.backend, bounded);
      controller.display = Math.max(controller.display, bounded);
    }

    if (options?.stage) {
      controller.stage = options.stage;
    }

    emitProgress(controller);
    progressControllerRef.current = null;
  }, [emitProgress]);

  const generateImage = useCallback(async (options: ImageGenerationOptions) => {
    const creditCheck = checkCredits(1, 'image generation');
    if (!creditCheck.hasCredits) {
      return;
    }

    setState({
      isLoading: true,
      error: null,
      generatedImage: null,
      progress: 0,
      status: 'queued',
      jobId: null,
    });

    if (progressControllerRef.current?.timer) {
      clearInterval(progressControllerRef.current.timer);
      progressControllerRef.current = null;
    }

    startProgressController({
      clientJobId: options.clientJobId,
      onProgress: options.onProgress,
      initialStatus: 'queued',
      initialProgress: 0,
    });

    const providerOptions = buildProviderOptions(options);
    const config = options.aspectRatio
      ? {
          imageConfig: { aspectRatio: options.aspectRatio },
        }
      : undefined;

    const baseBody: Record<string, unknown> = {
      prompt: options.prompt,
      imageBase64: options.imageData,
      mimeType: 'image/png',
      references: options.references,
      temperature: options.temperature,
      outputLength: options.outputLength,
      topP: options.topP,
    };

    if (options.avatarId) {
      baseBody.avatarId = options.avatarId;
    }
    if (options.avatarImageId) {
      baseBody.avatarImageId = options.avatarImageId;
    }

    if (Object.keys(providerOptions).length > 0) {
      baseBody.providerOptions = providerOptions;
    }
    if (config) {
      baseBody.config = config;
    }

    type ApiFetchError = Error & { status?: number };

    const primaryModel = options.model ?? 'gemini-2.5-flash-image';
    let didAttemptPreviewFallback = false;

    const attemptGeneration = async (
      modelToUse: string,
      allowPreviewFallback: boolean,
    ): Promise<{ image: GeneratedImage; jobId?: string; modelUsed: string }> => {
      debugLog('[image] POST /api/image/gemini', { model: modelToUse });

      let resolvedJobId: string | undefined;

      try {
        const { result, jobId } = await runGenerationJob<GeneratedImage, Record<string, unknown>>({
          provider: 'gemini',
          mediaType: 'image',
          body: {
            ...baseBody,
            model: modelToUse,
          },
          tracker,
          prompt: options.prompt,
          model: modelToUse,
          signal: options.signal,
          timeoutMs: options.requestTimeoutMs,
          pollTimeoutMs: options.pollTimeoutMs,
          pollIntervalMs: options.pollIntervalMs,
          requestTimeoutMs: options.pollRequestTimeoutMs,
          parseImmediateResult: (response) =>
            parseImmediateGeminiResult(response, options, user?.id, modelToUse),
          parseJobResult: (snapshot, response) =>
            parseGeminiJobResult(snapshot, response, options, user?.id, modelToUse),
          onUpdate: (snapshot) => {
            const jobIdentifier =
              (typeof snapshot.job.id === 'string' && snapshot.job.id) ||
              resolvedJobId;

            if (!resolvedJobId && jobIdentifier) {
              resolvedJobId = jobIdentifier;
            }

            updateControllerWithBackend({
              jobId: jobIdentifier,
              status: snapshot.status,
              progress: snapshot.progress,
              stage: snapshot.stage,
            });
          },
        });

        if (jobId) {
          resolvedJobId = jobId;
        }

        return { image: result, jobId: resolvedJobId, modelUsed: modelToUse };
      } catch (error) {
        const status = (error as ApiFetchError)?.status;
        const message =
          error instanceof Error ? error.message.toLowerCase() : '';

        if (status === 429) {
          throw new Error(PLAN_LIMIT_MESSAGE);
        }

        const shouldFallback =
          allowPreviewFallback &&
          !didAttemptPreviewFallback &&
          (status === 400 ||
            message.includes('service unavailable') ||
            message.includes('unavailable'));

        if (shouldFallback) {
          didAttemptPreviewFallback = true;
          debugWarn(
            '[image] Gemini primary model failed; retrying with preview fallback.',
            { error },
          );

          startProgressController({
            clientJobId: options.clientJobId,
            onProgress: options.onProgress,
            initialStatus: 'queued',
            initialProgress: 0,
          });

          setState(prev => ({
            ...prev,
            isLoading: true,
            error: null,
            generatedImage: null,
            progress: 0,
            status: 'queued',
            jobId: null,
          }));

          return attemptGeneration('gemini-2.5-flash-image-preview', false);
        }

        throw error;
      }
    };

    try {
      const { image, jobId } = await attemptGeneration(
        primaryModel,
        primaryModel === 'gemini-2.5-flash-image',
      );

      stopProgressController({
        status: 'completed',
        progress: 100,
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImage: image,
        error: null,
        progress: 100,
        status: 'completed',
        jobId: jobId ?? image.jobId ?? prev.jobId,
      }));

      return image;
    } catch (error) {
      stopProgressController({
        status: 'failed',
      });

      const message = resolveGenerationCatchError(
        error,
        'We couldn’t generate that image. Try again in a moment.',
      );

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
        generatedImage: null,
        progress: 0,
        status: 'failed',
      }));

      throw new Error(message);
    } finally {
      if (progressControllerRef.current) {
        stopProgressController();
      }
    }
  }, [
    user?.id,
    tracker,
    checkCredits,
    startProgressController,
    updateControllerWithBackend,
    stopProgressController,
  ]);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  const clearGeneratedImage = useCallback(() => {
    setState(prev => ({
      ...prev,
      generatedImage: null,
      progress: 0,
      status: 'idle',
      jobId: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      generatedImage: null,
      progress: 0,
      status: 'idle',
      jobId: null,
    });
  }, []);

  return {
    ...state,
    generateImage,
    clearError,
    clearGeneratedImage,
    reset,
    showInsufficientCreditsModal,
    creditCheckData,
    handleBuyCredits,
    handleCloseModal,
  };
};
