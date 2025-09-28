import { useState, useCallback } from 'react';
import { getApiUrl } from '../utils/api';
import { useAuth } from '../auth/useAuth';

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
}

const AUTH_ERROR_MESSAGE = 'Please sign in to generate Qwen images.';
const UNSUPPORTED_MESSAGE = 'Qwen image editing is not yet available in the backend integration.';

export const useQwenImageGeneration = () => {
  const { token, user } = useAuth();
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
        progress: 'Generating image with Qwen…',
      }));

      try {
        if (!token) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: AUTH_ERROR_MESSAGE,
            progress: undefined,
          }));
          throw new Error(AUTH_ERROR_MESSAGE);
        }

        const providerOptions: Record<string, unknown> = {};
        if (options.size) providerOptions.size = options.size;
        if (options.seed !== undefined) providerOptions.seed = options.seed;
        if (options.negative_prompt) providerOptions.negative_prompt = options.negative_prompt;
        if (options.prompt_extend !== undefined) providerOptions.prompt_extend = options.prompt_extend;
        if (options.watermark !== undefined) providerOptions.watermark = options.watermark;

        const response = await fetch(getApiUrl('/api/unified-generate'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            prompt: options.prompt,
            model: 'qwen-image',
            providerOptions,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message =
            (payload && typeof payload.error === 'string' && payload.error) ||
            response.statusText ||
            'Qwen generation failed';
          throw new Error(message);
        }

        const payload = (await response.json()) as { dataUrl?: string };
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
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
          progress: undefined,
        }));
        throw error;
      }
    },
    [token, user?.id],
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
