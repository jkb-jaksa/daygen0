import { useState, useCallback } from 'react';
import { getApiUrl } from '../utils/api';
import { useAuth } from '../auth/useAuth';

export interface SeedreamGeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  size: string;
  ownerId?: string;
  avatarId?: string;
}

export interface SeedreamImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImage: SeedreamGeneratedImage | null;
}

export interface SeedreamImageGenerationOptions {
  prompt: string;
  size?: string;
  n?: number;
}

const AUTH_ERROR_MESSAGE = 'Please sign in to generate SeeDream images.';
const UNSUPPORTED_MESSAGE = 'SeeDream image editing is not yet available in the backend integration.';

export const useSeeDreamImageGeneration = () => {
  const { token, user } = useAuth();
  const [state, setState] = useState<SeedreamImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImage: null,
  });

  const generateImage = useCallback(
    async (options: SeedreamImageGenerationOptions) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        if (!token) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: AUTH_ERROR_MESSAGE,
          }));
          throw new Error(AUTH_ERROR_MESSAGE);
        }

        const size = options.size ?? '1024x1024';
        const providerOptions: Record<string, unknown> = {
          width: Number.parseInt(size.split('x')[0] ?? '1024', 10) || 1024,
          height: Number.parseInt(size.split('x')[1] ?? '1024', 10) || 1024,
          n: options.n ?? 1,
        };

        const response = await fetch(getApiUrl('/api/image/seedream'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            prompt: options.prompt,
            model: 'seedream-4.0',
            providerOptions,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const message =
            (payload && typeof payload.error === 'string' && payload.error) ||
            response.statusText ||
            'SeeDream generation failed';
          throw new Error(message);
        }

        const payload = (await response.json()) as { images?: string[] };
        const images = Array.isArray(payload.images) ? payload.images : [];
        if (images.length === 0) {
          throw new Error('SeeDream did not return any images.');
        }

        const generatedImage: SeedreamGeneratedImage = {
          url: images[0],
          prompt: options.prompt,
          model: 'seedream-4.0',
          timestamp: new Date().toISOString(),
          size,
          ownerId: user?.id,
        };

        setState((prev) => ({
          ...prev,
          isLoading: false,
          generatedImage,
          error: null,
        }));

        return generatedImage;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
          generatedImage: null,
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
