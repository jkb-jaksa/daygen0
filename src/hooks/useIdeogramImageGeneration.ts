import { useState, useCallback } from 'react';
import { getApiUrl } from '../utils/api';
import { useAuth } from '../auth/useAuth';

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
}

export interface IdeogramImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImages: IdeogramGeneratedImage[];
  progress?: string;
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

const AUTH_ERROR_MESSAGE = 'Please sign in to generate Ideogram images.';

export const useIdeogramImageGeneration = () => {
  const { token, user } = useAuth();
  const [state, setState] = useState<IdeogramImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImages: [],
    progress: undefined,
  });

  const generateImage = useCallback(
    async (options: IdeogramGenerateOptions) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        progress: 'Generating image with Ideogram…',
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
        if (options.aspect_ratio) providerOptions.aspect_ratio = options.aspect_ratio;
        if (options.resolution) providerOptions.resolution = options.resolution;
        if (options.rendering_speed) providerOptions.rendering_speed = options.rendering_speed;
        if (options.num_images) providerOptions.num_images = options.num_images;
        if (options.seed !== undefined) providerOptions.seed = options.seed;
        if (options.style_preset) providerOptions.style_preset = options.style_preset;
        if (options.style_type) providerOptions.style_type = options.style_type;
        if (options.negative_prompt) providerOptions.negative_prompt = options.negative_prompt;

        const response = await fetch(getApiUrl('/api/unified-generate'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            prompt: options.prompt,
            model: 'ideogram',
            providerOptions,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message =
            (payload && typeof payload.error === 'string' && payload.error) ||
            response.statusText ||
            'Ideogram generation failed';
          throw new Error(message);
        }

        const payload = (await response.json()) as { dataUrls?: string[] };
        const dataUrls = Array.isArray(payload.dataUrls) ? payload.dataUrls : [];
        if (dataUrls.length === 0) {
          throw new Error('Ideogram did not return any images.');
        }

        const generatedImages: IdeogramGeneratedImage[] = dataUrls.map((url) => ({
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
          ownerId: user?.id,
        }));

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
          progress: 'Generation complete!',
          generatedImages: [...prev.generatedImages, ...generatedImages],
        }));

        return generatedImages;
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

  const reportUnsupported = useCallback(async (feature: string) => {
    const message = `${feature} is not yet supported in the backend integration.`;
    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: message,
      progress: undefined,
    }));
    throw new Error(message);
  }, []);

  const editImage = useCallback(
    async (_options: IdeogramEditOptions): Promise<IdeogramGeneratedImage[]> => {
      await reportUnsupported('Ideogram editing');
      return [];
    },
    [reportUnsupported],
  );

  const reframeImage = useCallback(
    async (_options: IdeogramReframeOptions): Promise<IdeogramGeneratedImage[]> => {
      await reportUnsupported('Ideogram reframing');
      return [];
    },
    [reportUnsupported],
  );

  const replaceBackground = useCallback(
    async (_options: IdeogramReplaceBgOptions): Promise<IdeogramGeneratedImage[]> => {
      await reportUnsupported('Ideogram background replacement');
      return [];
    },
    [reportUnsupported],
  );

  const upscaleImage = useCallback(
    async (_options: IdeogramUpscaleOptions): Promise<IdeogramGeneratedImage[]> => {
      await reportUnsupported('Ideogram upscaling');
      return [];
    },
    [reportUnsupported],
  );

  const describeImage = useCallback(
    async (_options: IdeogramDescribeOptions): Promise<string[]> => {
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
  };
};
