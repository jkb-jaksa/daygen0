import { useState, useCallback } from 'react';
import { getApiUrl } from '../utils/api';
import { useAuth } from '../auth/useAuth';
import { resolveApiErrorMessage, resolveGenerationCatchError } from '../utils/errorMessages';

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
}

// const AUTH_ERROR_MESSAGE = 'Please sign in to generate Qwen images.';
const UNSUPPORTED_MESSAGE = 'Qwen image editing is not yet available in the backend integration.';

export const useQwenImageGeneration = () => {
  const { token, user } = useAuth();
  const [state, setState] = useState<QwenImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImages: [],
    progress: undefined,
  });

  const pollForJobCompletion = useCallback(
    async (
      jobId: string,
      options: QwenGenerateOptions,
    ): Promise<QwenGeneratedImage[]> => {
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
          const image: QwenGeneratedImage = {
            url: job.resultUrl,
            prompt: options.prompt,
            timestamp: new Date().toISOString(),
            model: 'qwen-image',
            size: options.size,
            seed: options.seed,
            negativePrompt: options.negative_prompt,
            promptExtend: options.prompt_extend,
            watermark: options.watermark,
            ownerId: user?.id,
            avatarId: options.avatarId,
            avatarImageId: options.avatarImageId,
            jobId,
          };

          return [image];
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
    async (options: QwenGenerateOptions) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        progress: 'Generating image with Qwen…',
      }));

      try {
        // TEMPORARILY DISABLED: Authentication check
        // if (!token) {
        //   setState((prev) => ({
        //     ...prev,
        //     isLoading: false,
        //     error: AUTH_ERROR_MESSAGE,
        //     progress: undefined,
        //   }));
        //   throw new Error(AUTH_ERROR_MESSAGE);
        // }

        const providerOptions: Record<string, unknown> = {};
        if (options.size) providerOptions.size = options.size;
        if (options.seed !== undefined) providerOptions.seed = options.seed;
        if (options.negative_prompt) providerOptions.negative_prompt = options.negative_prompt;
        if (options.prompt_extend !== undefined) providerOptions.prompt_extend = options.prompt_extend;
        if (options.watermark !== undefined) providerOptions.watermark = options.watermark;

        const response = await fetch(getApiUrl('/api/image/qwen'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            prompt: options.prompt,
            model: 'qwen-image',
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
            fallback: 'Qwen generation failed',
            context: 'generation',
          });
          throw new Error(message);
        }

        const payload = (await response.json()) as { jobId?: string; dataUrl?: string };

        if (payload.jobId) {
          const generatedImages = await pollForJobCompletion(payload.jobId, options);

          setState((prev) => ({
            ...prev,
            isLoading: false,
            generatedImages: [...prev.generatedImages, ...generatedImages],
            error: null,
            progress: 'Generation complete!',
          }));

          return generatedImages;
        }

        if (!payload.dataUrl) {
          throw new Error('Qwen did not return an image.');
        }

        const generatedImage: QwenGeneratedImage = {
          url: payload.dataUrl,
          prompt: options.prompt,
          timestamp: new Date().toISOString(),
          model: 'qwen-image',
          size: options.size,
          seed: options.seed,
          negativePrompt: options.negative_prompt,
          promptExtend: options.prompt_extend,
          watermark: options.watermark,
          ownerId: user?.id,
          avatarId: options.avatarId,
          avatarImageId: options.avatarImageId,
        };

        setState((prev) => ({
          ...prev,
          isLoading: false,
          generatedImages: [...prev.generatedImages, generatedImage],
          error: null,
          progress: 'Generation complete!',
        }));

        return [generatedImage];
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
    [token, user?.id, pollForJobCompletion],
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
