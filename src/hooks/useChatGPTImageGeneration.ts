import { useState, useCallback } from 'react';
import { getApiUrl } from '../utils/api';
import { debugError, debugLog } from '../utils/debug';
import { useAuth } from '../auth/useAuth';
import { resolveApiErrorMessage, resolveGenerationCatchError } from '../utils/errorMessages';

export interface ChatGPTGeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  size: string;
  quality: string;
  background: string;
  ownerId?: string; // Optional user ID who generated the image
  avatarId?: string;
  avatarImageId?: string;
}

export interface ChatGPTImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImage: ChatGPTGeneratedImage | null;
}

export interface ChatGPTImageGenerationOptions {
  prompt: string;
  n?: number; // Number of images to generate (1-8)
  size?: '256x256' | '512x512' | '1024x1024' | '1024x1536' | '1536x1024';
  quality?: 'standard' | 'high';
  background?: 'transparent' | 'white' | 'black';
  avatarId?: string;
  avatarImageId?: string;
}

export const useChatGPTImageGeneration = () => {
  const { token, user } = useAuth();
  const [state, setState] = useState<ChatGPTImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImage: null,
  });

  const pollForJobCompletion = useCallback(
    async (
      jobId: string,
      prompt: string,
      options: ChatGPTImageGenerationOptions,
    ): Promise<ChatGPTGeneratedImage> => {
      const maxAttempts = 60;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
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
          return {
            url: job.resultUrl,
            prompt,
            model: 'chatgpt-image',
            timestamp: new Date().toISOString(),
            size: options.size ?? '1024x1024',
            quality: options.quality ?? 'high',
            background: options.background ?? 'transparent',
            ownerId: user?.id,
            avatarId: options.avatarId,
            avatarImageId: options.avatarImageId,
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

  const generateImage = useCallback(async (options: ChatGPTImageGenerationOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      // TEMPORARILY DISABLED: Authentication check
      // if (!token) {
      //   const message = 'Please sign in to generate images.';
      //   setState(prev => ({
      //     ...prev,
      //     isLoading: false,
      //     error: message,
      //   }));
      //   throw new Error(message);
      // }

      const { prompt, n = 1, size = '1024x1024', quality = 'high', background = 'transparent' } = options;

      // Use the ChatGPT API endpoint
      const apiUrl = getApiUrl('/api/image/chatgpt');

      debugLog('[chatgpt-image] POST', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt,
          n,
          size,
          quality,
          background,
          model: 'chatgpt-image',
        }),
      });

      debugLog('[chatgpt-image] Response status:', res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const rawMessage =
          (typeof errorData.error === 'string' && errorData.error) ||
          (typeof errorData.message === 'string' && errorData.message) ||
          null;
        const friendlyMessage = resolveApiErrorMessage({
          status: res.status,
          message: rawMessage,
          fallback: `HTTP ${res.status}: ${res.statusText}`,
          context: 'generation',
        });
        throw new Error(friendlyMessage);
      }

      const data = await res.json();
      debugLog('[chatgpt-image] Response data:', data);

      if (data?.jobId) {
        const generatedImage = await pollForJobCompletion(data.jobId, prompt, options);

        setState(prev => ({
          ...prev,
          isLoading: false,
          generatedImage,
          error: null,
        }));

        return generatedImage;
      }

      // Handle multiple images (dataUrls array) or single image (dataUrl)
      const imageUrls = data.dataUrls || (data.dataUrl ? [data.dataUrl] : []);
      
      if (imageUrls.length === 0) {
        throw new Error('No image data received from API');
      }

      const generatedImage: ChatGPTGeneratedImage = {
        url: imageUrls[0], // For now, return the first image
        prompt,
        model: 'chatgpt-image',
        timestamp: new Date().toISOString(),
        size,
        quality,
        background,
        ownerId: user?.id,
        avatarId: options.avatarId,
        avatarImageId: options.avatarImageId,
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImage,
        error: null,
      }));

      return generatedImage;
    } catch (error) {
      debugError('[chatgpt-image] Generation failed:', error);

      const errorMessage = resolveGenerationCatchError(error, 'ChatGPT couldn’t generate that image. Try again in a moment.');

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        generatedImage: null,
      }));

      throw new Error(errorMessage);
    }
  }, [token, user?.id, pollForJobCompletion]);

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
