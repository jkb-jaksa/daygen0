import { useState, useCallback } from 'react';
import { getApiUrl } from '../utils/api';
import { useAuth } from '../auth/useAuth';

export interface ReveGeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  jobId: string;
  references?: string[];
  ownerId?: string;
}

export interface ReveImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImage: ReveGeneratedImage | null;
  jobStatus: 'queued' | 'processing' | 'completed' | 'failed' | null;
  progress?: string;
}

export interface ReveImageGenerationOptions {
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  aspect_ratio?: string;
  negative_prompt?: string;
  guidance_scale?: number;
  steps?: number;
  seed?: number;
  batch_size?: number;
  references?: string[];
}

const AUTH_ERROR_MESSAGE = 'Please sign in to generate Reve images.';
const UNSUPPORTED_MESSAGE = 'Reve image editing is not yet available in the backend integration.';

export const useReveImageGeneration = () => {
  const { token, user } = useAuth();
  const [state, setState] = useState<ReveImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImage: null,
    jobStatus: null,
    progress: undefined,
  });

  const generateImage = useCallback(
    async (options: ReveImageGenerationOptions) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        jobStatus: 'queued',
        progress: 'Submitting request…',
      }));

      try {
        if (!token) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: AUTH_ERROR_MESSAGE,
            jobStatus: null,
            progress: undefined,
          }));
          throw new Error(AUTH_ERROR_MESSAGE);
        }

        const providerOptions: Record<string, unknown> = {};
        if (options.width !== undefined) providerOptions.width = options.width;
        if (options.height !== undefined) providerOptions.height = options.height;
        if (options.aspect_ratio) providerOptions.aspect_ratio = options.aspect_ratio;
        if (options.negative_prompt) providerOptions.negative_prompt = options.negative_prompt;
        if (options.guidance_scale !== undefined) providerOptions.guidance_scale = options.guidance_scale;
        if (options.steps !== undefined) providerOptions.steps = options.steps;
        if (options.seed !== undefined) providerOptions.seed = options.seed;
        if (options.batch_size !== undefined) providerOptions.batch_size = options.batch_size;

        const response = await fetch(getApiUrl('/api/unified-generate'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            prompt: options.prompt,
            model: options.model ?? 'reve-image',
            references: options.references,
            providerOptions,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message =
            (payload && typeof payload.error === 'string' && payload.error) ||
            response.statusText ||
            'Reve generation failed';
          throw new Error(message);
        }

        const payload = (await response.json()) as {
          images?: string[];
          dataUrl?: string;
          jobId?: string | null;
          status?: string | null;
        };

        const imageUrl =
          (Array.isArray(payload.images) && payload.images.find((url): url is string => typeof url === 'string')) ||
          (typeof payload.dataUrl === 'string' ? payload.dataUrl : null);

        if (!imageUrl) {
          throw new Error('Reve did not return an image.');
        }

        const generatedImage: ReveGeneratedImage = {
          url: imageUrl,
          prompt: options.prompt,
          model: options.model ?? 'reve-image',
          timestamp: new Date().toISOString(),
          jobId: payload.jobId ?? `reve-${Date.now()}`,
          references: options.references || undefined,
          ownerId: user?.id,
        };

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
          generatedImage,
          jobStatus: (payload.status as ReveImageGenerationState['jobStatus']) ?? 'completed',
          progress: 'Generation complete!',
        }));

        return generatedImage;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
          generatedImage: null,
          jobStatus: 'failed',
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

  const clearGeneratedImage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      generatedImage: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      generatedImage: null,
      jobStatus: null,
      progress: undefined,
    });
  }, []);

  return {
    ...state,
    generateImage,
    editImage,
    clearError,
    clearGeneratedImage,
    reset,
  };
};
