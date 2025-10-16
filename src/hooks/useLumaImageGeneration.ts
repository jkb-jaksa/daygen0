import { useCallback, useState } from 'react';
import { getApiUrl } from '../utils/api';
import { useAuth } from '../auth/useAuth';
import { resolveApiErrorMessage, resolveGenerationCatchError } from '../utils/errorMessages';
import type { GeneratedImage } from './useGeminiImageGeneration';

export interface LumaGeneratedImage extends GeneratedImage {
  generationId?: string | null;
  state?: string | null;
  contentType?: string | null;
}

interface LumaImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImage: LumaGeneratedImage | null;
  generationId: string | null;
  status: string | null;
  contentType: string | null;
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
}

// const AUTH_ERROR_MESSAGE = 'Please sign in to generate Luma images.';
const DEFAULT_ASPECT_RATIO = '16:9';

export function useLumaImageGeneration() {
  const { token, user } = useAuth();
  const [state, setState] = useState<LumaImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImage: null,
    generationId: null,
    status: null,
    contentType: null,
  });

  const pollForJobCompletion = useCallback(
    async (
      jobId: string,
      options: LumaImageGenerationOptions,
    ): Promise<LumaGeneratedImage> => {
      const maxAttempts = 60;

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const response = await fetch(getApiUrl(`/api/jobs/${jobId}`), {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to check job status: ${response.status}`);
        }

        const job = await response.json();
        if (job.status === 'COMPLETED' && job.resultUrl) {
          return {
            url: job.resultUrl,
            prompt: options.prompt,
            model: options.model,
            timestamp: new Date().toISOString(),
            ownerId: user?.id,
            avatarId: options.avatarId,
            generationId: job.id ?? null,
            state: job.status,
            contentType: null,
          };
        }

        if (job.status === 'FAILED') {
          throw new Error(job.error || 'Job failed');
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      throw new Error('Job polling timeout');
    },
    [token, user?.id],
  );

  const generateImage = useCallback(
    async (options: LumaImageGenerationOptions) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        // TEMPORARILY DISABLED: Authentication check
        // if (!token) {
        //   setState((prev) => ({
        //     ...prev,
        //     isLoading: false,
        //     error: AUTH_ERROR_MESSAGE,
        //   }));
        //   throw new Error(AUTH_ERROR_MESSAGE);
        // }

        const providerOptions: Record<string, unknown> = {};

        if (options.aspectRatio) {
          providerOptions.aspect_ratio = options.aspectRatio;
        } else {
          providerOptions.aspect_ratio = DEFAULT_ASPECT_RATIO;
        }

        if (options.imageRef) {
          providerOptions.image_ref = options.imageRef;
        }
        if (options.styleRef) {
          providerOptions.style_ref = options.styleRef;
        }
        if (options.characterRef) {
          providerOptions.character_ref = options.characterRef;
        }
        if (options.modifyImageRef) {
          providerOptions.modify_image_ref = options.modifyImageRef;
        }
        if (options.format) {
          providerOptions.format = options.format;
        }
        if (options.callbackUrl) {
          providerOptions.callback_url = options.callbackUrl;
        }

        const response = await fetch(getApiUrl('/api/image/luma'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            prompt: options.prompt,
            model: options.model,
            providerOptions,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const rawMessage =
            (payload && typeof payload.error === 'string' && payload.error) ||
            (payload && typeof payload.message === 'string' && payload.message) ||
            null;
          const message = resolveApiErrorMessage({
            status: response.status,
            message: rawMessage,
            fallback: 'Luma generation failed',
            context: 'generation',
          });
          throw new Error(message);
        }

        const payload = (await response.json()) as Record<string, unknown>;

        if (typeof payload.jobId === 'string') {
          const generatedImage = await pollForJobCompletion(payload.jobId, options);

          setState({
            isLoading: false,
            error: null,
            generatedImage,
            generationId: generatedImage.generationId ?? null,
            status: 'COMPLETED',
            contentType: generatedImage.contentType ?? null,
          });

          return generatedImage;
        }

        const dataUrl = typeof payload.dataUrl === 'string'
          ? payload.dataUrl
          : Array.isArray(payload.dataUrls)
            ? payload.dataUrls.find((url): url is string => typeof url === 'string')
            : typeof payload.image === 'string'
              ? payload.image
              : null;

        if (!dataUrl) {
          throw new Error('Luma generation did not return an image.');
        }

        const generationId =
          typeof payload.generationId === 'string'
            ? payload.generationId
            : typeof payload.generation_id === 'string'
              ? payload.generation_id
              : typeof payload.id === 'string'
                ? payload.id
                : null;

        const status =
          typeof payload.state === 'string'
            ? payload.state
            : typeof payload.status === 'string'
              ? payload.status
              : null;

        const contentType =
          typeof payload.contentType === 'string'
            ? payload.contentType
            : typeof payload.mimeType === 'string'
              ? payload.mimeType
              : null;

        const generatedImage: LumaGeneratedImage = {
          url: dataUrl,
          prompt: options.prompt,
          model: options.model,
          timestamp: new Date().toISOString(),
          ownerId: user?.id,
          generationId,
          state: status,
          contentType,
          avatarId: options.avatarId,
        };

        setState({
          isLoading: false,
          error: null,
          generatedImage,
          generationId,
          status,
          contentType,
        });

        return generatedImage;
      } catch (error) {
        const message = resolveGenerationCatchError(error, 'Luma couldn’t generate that image. Try again in a moment.');
        setState({
          isLoading: false,
          error: message,
          generatedImage: null,
          generationId: null,
          status: null,
          contentType: null,
        });
        throw new Error(message);
      }
    },
    [token, user?.id, pollForJobCompletion],
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
