import { useState, useCallback } from 'react';
import type { FluxModel, FluxModelType } from '../lib/bfl';
import { FLUX_MODEL_MAP } from '../lib/bfl';
import { getApiUrl } from '../utils/api';
import { debugError } from '../utils/debug';
import { useAuth } from '../auth/useAuth';
import { resolveApiErrorMessage, resolveGenerationCatchError } from '../utils/errorMessages';

export interface FluxGeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  jobId: string;
  references?: string[];
  ownerId?: string;
  avatarId?: string;
}

export interface FluxImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImage: FluxGeneratedImage | null;
  jobStatus: 'queued' | 'processing' | 'completed' | 'failed' | null;
  progress?: string;
}

export interface FluxImageGenerationOptions {
  prompt: string;
  model: FluxModel | FluxModelType;
  width?: number;
  height?: number;
  aspect_ratio?: string;
  raw?: boolean;
  image_prompt?: string;
  image_prompt_strength?: number;
  input_image?: string;
  input_image_2?: string;
  input_image_3?: string;
  input_image_4?: string;
  seed?: number;
  output_format?: 'jpeg' | 'png';
  prompt_upsampling?: boolean;
  safety_tolerance?: number;
  useWebhook?: boolean;
  references?: string[];
}

const AUTH_ERROR_MESSAGE = 'Please sign in to generate Flux images.';

export const useFluxImageGeneration = () => {
  const { token, user } = useAuth();
  const [state, setState] = useState<FluxImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImage: null,
    jobStatus: null,
    progress: undefined,
  });

  const generateImage = useCallback(
    async (options: FluxImageGenerationOptions) => {
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

        const { prompt, model, references, useWebhook = false, ...params } = options;
        if (useWebhook) {
          debugError('Flux webhook delivery is not supported in the backend integration.');
        }

        const resolvedModel =
          model in FLUX_MODEL_MAP
            ? FLUX_MODEL_MAP[model as FluxModelType]
            : (model as FluxModel);

        const providerOptions: Record<string, unknown> = {};
        if (params.width !== undefined) providerOptions.width = params.width;
        if (params.height !== undefined) providerOptions.height = params.height;
        if (params.aspect_ratio !== undefined) providerOptions.aspect_ratio = params.aspect_ratio;
        if (params.raw !== undefined) providerOptions.raw = params.raw;
        if (params.image_prompt !== undefined) providerOptions.image_prompt = params.image_prompt;
        if (params.image_prompt_strength !== undefined) providerOptions.image_prompt_strength = params.image_prompt_strength;
        if (params.input_image !== undefined) providerOptions.input_image = params.input_image;
        if (params.input_image_2 !== undefined) providerOptions.input_image_2 = params.input_image_2;
        if (params.input_image_3 !== undefined) providerOptions.input_image_3 = params.input_image_3;
        if (params.input_image_4 !== undefined) providerOptions.input_image_4 = params.input_image_4;
        if (params.seed !== undefined) providerOptions.seed = params.seed;
        if (params.output_format !== undefined) providerOptions.output_format = params.output_format;
        if (params.prompt_upsampling !== undefined) providerOptions.prompt_upsampling = params.prompt_upsampling;
        if (params.safety_tolerance !== undefined) providerOptions.safety_tolerance = params.safety_tolerance;

        const response = await fetch(getApiUrl('/api/image/flux'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            prompt,
            model: resolvedModel,
            references,
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
            fallback: 'Flux generation failed',
            context: 'generation',
          });
          throw new Error(message);
        }

        const payload = (await response.json()) as {
          dataUrl?: string;
          dataUrls?: string[];
          jobId?: string | null;
          status?: string | null;
        };

        const dataUrl =
          typeof payload.dataUrl === 'string'
            ? payload.dataUrl
            : Array.isArray(payload.dataUrls) && typeof payload.dataUrls[0] === 'string'
              ? payload.dataUrls[0]
              : null;

        if (!dataUrl) {
          throw new Error('Flux generation did not return an image.');
        }

        const generatedImage: FluxGeneratedImage = {
          url: dataUrl,
          prompt,
          model: resolvedModel,
          timestamp: new Date().toISOString(),
          jobId: payload.jobId ?? '',
          references: references || undefined,
          ownerId: user?.id,
        };

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
          generatedImage,
          jobStatus: (payload.status as FluxImageGenerationState['jobStatus']) ?? 'completed',
          progress: undefined,
        }));

        return generatedImage;
      } catch (error) {
        const message = resolveGenerationCatchError(error, 'Flux couldn’t generate that image. Try again in a moment.');
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
          generatedImage: null,
          jobStatus: 'failed',
          progress: undefined,
        }));
        throw new Error(message);
      }
    },
    [token, user?.id],
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
    clearError,
    clearGeneratedImage,
    reset,
  };
};
