import { useState, useCallback, useRef, useEffect } from 'react';
import { getApiUrl } from '../utils/api';
import { debugLog, debugWarn } from '../utils/debug';
import { useAuth } from '../auth/useAuth';
import { PLAN_LIMIT_MESSAGE, resolveApiErrorMessage, resolveGenerationCatchError } from '../utils/errorMessages';
import { useCreditCheck } from './useCreditCheck';
import { InsufficientCreditsModal } from '../components/modals/InsufficientCreditsModal';

export interface GeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  references?: string[]; // Base64 data URLs for reference images used
  ownerId?: string; // Optional user ID who generated the image
  avatarId?: string;
  avatarImageId?: string;
  r2FileId?: string;
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
  clientJobId?: string;
  onProgress?: (update: ImageGenerationProgressUpdate) => void;
}

export const useGeminiImageGeneration = () => {
  const { token, user } = useAuth();
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
    const progressValue = Math.max(
      0,
      Math.min(100, Math.round(controller.display)),
    );
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

  const pollForJobCompletion = useCallback(async (
    jobId: string,
    prompt: string,
    model: string,
    references: string[] | undefined,
    avatarId: string | undefined,
    avatarImageId: string | undefined,
    ownerId: string | undefined,
  ): Promise<GeneratedImage> => {
    const pollIntervalMs = 3000;
    const maxAttempts = Math.ceil((5 * 60 * 1000) / pollIntervalMs);
    let attempts = 0;

    const pickString = (value: unknown): string | undefined =>
      typeof value === 'string' && value.trim().length > 0
        ? value.trim()
        : undefined;
    const asRecord = (value: unknown): Record<string, unknown> | null =>
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(getApiUrl(`/api/jobs/${jobId}`), {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to check job status: ${response.status}`);
        }

        const job = await response.json();
        const metadata = asRecord(job.metadata);
        const progressValueRaw =
          typeof job.progress === 'number'
            ? job.progress
            : typeof job.progress === 'string'
              ? Number.parseFloat(job.progress)
              : undefined;
        const jobProgress =
          typeof progressValueRaw === 'number' && Number.isFinite(progressValueRaw)
            ? Math.max(0, Math.min(100, progressValueRaw))
            : undefined;
        const metadataStage = metadata
          ? pickString(metadata['stage']) ??
            pickString(metadata['status']) ??
            pickString(metadata['state'])
          : undefined;

        updateControllerWithBackend({
          progress: jobProgress,
          status: job.status,
          stage: metadataStage,
          jobId,
        });

        const metadataFileUrl = metadata
          ? pickString(metadata['fileUrl'])
          : undefined;
        const metadataR2FileUrl = metadata
          ? pickString(metadata['r2FileUrl'])
          : undefined;
        const metadataUrl = metadata ? pickString(metadata['url']) : undefined;
        const metadataResults = metadata ? metadata['results'] : undefined;
        const firstResultUrl = Array.isArray(metadataResults)
          ? metadataResults
              .map((item) => pickString(item))
              .find((value): value is string => Boolean(value))
          : undefined;
        const resolvedUrl =
          pickString(job.resultUrl) ??
          metadataFileUrl ??
          metadataR2FileUrl ??
          metadataUrl ??
          firstResultUrl;
        const r2FileId = metadata
          ? pickString(metadata['r2FileId'])
          : undefined;

        if (job.status === 'COMPLETED') {
          if (!resolvedUrl) {
            throw new Error('Job completed but no result URL was provided.');
          }

          updateControllerWithBackend({
            progress: 100,
            status: job.status,
            stage: metadataStage,
            jobId,
          });

          stopProgressController({
            status: 'completed',
            progress: 100,
            stage: metadataStage,
          });

          return {
            url: resolvedUrl,
            prompt,
            model,
            timestamp: new Date().toISOString(),
            references: references || undefined,
            ownerId,
            avatarId,
            avatarImageId,
            r2FileId,
          };
        }

        if (job.status === 'FAILED') {
          stopProgressController({
            status: 'failed',
            progress: jobProgress,
            stage: metadataStage,
          });
          throw new Error(job.error || 'Job failed');
        }
      } catch (error) {
        if (attempts === maxAttempts - 1) {
          throw error instanceof Error ? error : new Error(String(error));
        }
      }

      attempts += 1;
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error('Job polling timeout');
  }, [token, updateControllerWithBackend, stopProgressController]);

  const generateImage = useCallback(async (options: ImageGenerationOptions) => {
    // Check credits before starting generation
    const creditCheck = checkCredits(1, 'image generation');
    if (!creditCheck.hasCredits) {
      return; // Modal will be shown by useCreditCheck hook
    }

    // Reset state completely for each new generation
    setState({
      isLoading: true,
      error: null,
      generatedImage: null,
      progress: 0,
      status: 'queued',
      jobId: null,
    });
    
    // Clear any existing progress controller
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

    try {
      // TEMPORARILY DISABLED: Authentication check
      // if (!token) {
      //   const message = 'Please sign in to generate images.';
      //   setState(prev => ({
      //     ...prev,
      //     isLoading: false,
      //     error: message,
      //     status: 'failed',
      //     progress: 0,
      //   }));
      //   stopProgressController({ status: 'failed' });
      //   throw new Error(message);
      // }

      const { prompt, model, imageData, references, temperature, outputLength, topP, aspectRatio } = options;

      const resolvedModel = model || 'gemini-2.5-flash-image';
      const apiUrl = getApiUrl('/api/image/gemini');

      debugLog('[image] POST', apiUrl);

      const baseBody: Record<string, unknown> = {
        prompt,
        imageBase64: imageData,
        mimeType: 'image/png',
        references,
        temperature,
        outputLength,
        topP,
      };

      if (options.avatarId) {
        baseBody.avatarId = options.avatarId;
      }
      if (options.avatarImageId) {
        baseBody.avatarImageId = options.avatarImageId;
      }

      if (aspectRatio) {
        baseBody.providerOptions = { aspectRatio };
        baseBody.config = {
          imageConfig: { aspectRatio },
        };
      }

      const performRequest = async (
        modelToUse: string,
        allowFallback: boolean,
      ): Promise<{ payload: unknown; modelUsed: string }> => {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            ...baseBody,
            model: modelToUse,
          }),
        });

        if (res.ok) {
          return { payload: await res.json(), modelUsed: modelToUse };
        }

        const errBody = await res.json().catch(() => null);
        const rawMessage =
          (errBody && typeof errBody.error === 'string' && errBody.error) ||
          (errBody && typeof errBody.message === 'string' && errBody.message) ||
          null;

        if (allowFallback && res.status === 400) {
          debugWarn(
            '[image] Gemini 2.5 Flash returned 400, attempting preview fallback.',
            { rawMessage },
          );
          return performRequest('gemini-2.5-flash-image-preview', false);
        }

        const errorMessage =
          res.status === 429
            ? PLAN_LIMIT_MESSAGE
            : resolveApiErrorMessage({
                status: res.status,
                message: rawMessage,
                fallback: `Request failed with ${res.status}`,
                context: 'generation',
              });
        throw new Error(errorMessage);
      };

      const { payload, modelUsed } = await performRequest(
        resolvedModel,
        resolvedModel === 'gemini-2.5-flash-image',
      );
      const payloadRecord =
        payload && typeof payload === 'object'
          ? (payload as Record<string, unknown>)
          : null;
      const extractJobId = (value: unknown): string | undefined =>
        typeof value === 'string' && value.trim().length > 0
          ? value.trim()
          : undefined;
      const jobIdFromPayload = payloadRecord
        ? extractJobId(payloadRecord['jobId']) ??
          extractJobId(payloadRecord['job_id'])
        : undefined;

      // Check if this is a job-based response
      if (jobIdFromPayload) {
        // Poll for job completion
        const payloadProgress =
          payloadRecord && typeof payloadRecord['progress'] === 'number'
            ? (payloadRecord['progress'] as number)
            : undefined;
        updateControllerWithBackend({
          jobId: jobIdFromPayload,
          status: 'PROCESSING',
          progress: payloadProgress,
        });
        const generatedImage = await pollForJobCompletion(
          jobIdFromPayload,
          prompt,
          modelUsed,
          references,
          options.avatarId,
          options.avatarImageId,
          user?.id
        );

        stopProgressController({
          status: 'completed',
          progress: 100,
        });

        setState(prev => ({
          ...prev,
          isLoading: false,
          generatedImage,
          error: null,
          progress: 100,
          status: 'completed',
        }));

        return generatedImage;
      }

      // Handle immediate response (legacy)
      if (!payload?.imageBase64) {
        throw new Error('No image data returned from API');
      }

      // Convert the new API response format to our expected format
      const generatedImage: GeneratedImage = {
        url: `data:${payload.mimeType || 'image/png'};base64,${payload.imageBase64}`,
        prompt,
        model: modelUsed,
        timestamp: new Date().toISOString(),
        references: references || undefined,
        ownerId: user?.id,
        avatarId: options.avatarId,
        avatarImageId: options.avatarImageId,
      };

      stopProgressController({
        status: 'completed',
        progress: 100,
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImage,
        error: null,
        progress: 100,
        status: 'completed',
      }));

      return generatedImage;
    } catch (error) {
      stopProgressController({
        status: 'failed',
      });
      const errorMessage = resolveGenerationCatchError(error, 'We couldn’t generate that image. Try again in a moment.');

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        generatedImage: null,
        progress: 0,
        status: 'failed',
        jobId: prev.jobId,
      }));

      throw new Error(errorMessage);
    } finally {
      if (progressControllerRef.current) {
        stopProgressController();
      }
    }
  }, [
    token,
    user?.id,
    pollForJobCompletion,
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
