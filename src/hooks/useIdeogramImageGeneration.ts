import { useState, useCallback } from 'react';
import { getApiUrl } from '../utils/api';
import { useAuth } from '../auth/useAuth';
import { resolveApiErrorMessage, resolveGenerationCatchError } from '../utils/errorMessages';

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
    progressValue: undefined,
  });

  const pollForJobCompletion = useCallback(
    async (
      jobId: string,
      prompt: string,
      model: string,
      aspectRatio: string | undefined,
      resolution: string | undefined,
      renderingSpeed: string | undefined,
      stylePreset: string | undefined,
      styleType: string | undefined,
      negativePrompt: string | undefined,
      avatarId: string | undefined,
      avatarImageId: string | undefined,
      ownerId: string | undefined,
    ): Promise<IdeogramGeneratedImage[]> => {
      const maxAttempts = 60; // 5 minutes with 5-second intervals
      let attempts = 0;

      while (attempts < maxAttempts) {
        try {
          const response = await fetch(getApiUrl(`/api/jobs/${jobId}`), {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to check job status: ${response.status}`);
          }

          const job = await response.json();

          if (job.status === 'COMPLETED' && job.resultUrl) {
            return [
              {
                url: job.resultUrl,
                prompt,
                timestamp: new Date().toISOString(),
                model,
                aspectRatio,
                resolution,
                renderingSpeed,
                stylePreset,
                styleType,
                negativePrompt,
                ownerId,
                avatarId,
              },
            ];
          } else if (job.status === 'FAILED') {
            throw new Error(job.error || 'Job failed');
          }

          const rawProgress =
            typeof job.progress === 'number'
              ? job.progress
              : typeof job.progress === 'string'
                ? Number.parseFloat(job.progress)
                : undefined;
          const boundedProgress =
            typeof rawProgress === 'number' && Number.isFinite(rawProgress)
              ? Math.max(0, Math.min(100, rawProgress))
              : undefined;

          setState((prev) => ({
            ...prev,
            progress: boundedProgress !== undefined ? `${Math.round(boundedProgress)}%` : 'Processing...',
            progressValue:
              boundedProgress ??
              (typeof prev.progressValue === 'number' ? prev.progressValue : 0),
          }));

          // Wait 5 seconds before next poll
          await new Promise((resolve) => setTimeout(resolve, 5000));
          attempts++;
        } catch (error) {
          if (attempts === maxAttempts - 1) {
            throw error;
          }
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 5000));
          attempts++;
        }
      }

      throw new Error('Job polling timeout');
    },
    [token],
  );

  const generateImage = useCallback(
    async (options: IdeogramGenerateOptions) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        progress: 'Generating image with Ideogram…',
        progressValue: 0,
      }));

      try {
        if (!token) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: AUTH_ERROR_MESSAGE,
            progress: undefined,
            progressValue: undefined,
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

        const response = await fetch(getApiUrl('/api/image/ideogram'), {
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
          const rawMessage =
            (payload && typeof payload.error === 'string' && payload.error) ||
            (payload && typeof payload.message === 'string' && payload.message) ||
            null;
          const message = resolveApiErrorMessage({
            status: response.status,
            message: rawMessage,
            fallback: 'Ideogram generation failed',
            context: 'generation',
          });
          throw new Error(message);
        }

        const payload = (await response.json()) as {
          jobId?: string;
          dataUrls?: string[];
        };

        if (payload.jobId) {
          const generatedImages = await pollForJobCompletion(
            payload.jobId,
            options.prompt,
            'ideogram',
            options.aspect_ratio,
            options.resolution,
            options.rendering_speed,
            options.style_preset,
            options.style_type,
            options.negative_prompt,
            options.avatarId,
            options.avatarImageId,
            user?.id,
          );

          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: null,
            progress: 'Generation complete!',
            progressValue: 100,
            generatedImages: [...prev.generatedImages, ...generatedImages],
          }));

          return generatedImages;
        }

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
          avatarId: options.avatarId,
        }));

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
          progress: 'Generation complete!',
          progressValue: 100,
          generatedImages: [...prev.generatedImages, ...generatedImages],
        }));

        return generatedImages;
      } catch (error) {
        const message = resolveGenerationCatchError(error, 'Ideogram couldn’t generate that image. Try again in a moment.');
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
    [token, user?.id, pollForJobCompletion],
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
