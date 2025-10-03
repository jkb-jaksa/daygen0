import { useState, useCallback } from 'react';
import { getApiUrl } from '../utils/api';
import { debugLog, debugWarn } from '../utils/debug';
import { useAuth } from '../auth/useAuth';
import { PLAN_LIMIT_MESSAGE, resolveApiErrorMessage, resolveGenerationCatchError } from '../utils/errorMessages';

export interface GeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  references?: string[]; // Base64 data URLs for reference images used
  ownerId?: string; // Optional user ID who generated the image
  avatarId?: string;
}

export interface ImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImage: GeneratedImage | null;
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
}

export const useGeminiImageGeneration = () => {
  const { token, user } = useAuth();
  const [state, setState] = useState<ImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImage: null,
  });

  const generateImage = useCallback(async (options: ImageGenerationOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      if (!token) {
        const message = 'Please sign in to generate images.';
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw new Error(message);
      }

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

      if (aspectRatio) {
        baseBody.providerOptions = { aspectRatio };
        baseBody.config = {
          imageConfig: { aspectRatio },
        };
      }

      const performRequest = async (
        modelToUse: string,
        allowFallback: boolean,
      ): Promise<{ payload: any; modelUsed: string }> => {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
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
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImage,
        error: null,
      }));

      return generatedImage;
    } catch (error) {
      const errorMessage = resolveGenerationCatchError(error, 'We couldn’t generate that image. Try again in a moment.');

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        generatedImage: null,
      }));

      throw new Error(errorMessage);
    }
  }, [token, user?.id]);

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
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      generatedImage: null,
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
