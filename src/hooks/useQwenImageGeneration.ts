import { useState, useCallback } from 'react';
import { getApiUrl } from '../utils/api';
import { debugApiRequest, debugApiError, debugApiSuccess } from '../utils/debug';
import { useAuth } from '../auth/useAuth';

export interface QwenGeneratedImage {
  url: string;
  prompt: string;
  timestamp: string;
  model: 'qwen-image' | 'qwen-image-edit';
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
  size?: string; // e.g. "1328*1328", "1664*928", "1472*1140", "1140*1472", "928*1664"
  seed?: number;
  negative_prompt?: string;
  prompt_extend?: boolean;
  watermark?: boolean;
}

export interface QwenEditOptions {
  image: File;
  prompt: string;
  negative_prompt?: string;
  seed?: number;
  watermark?: boolean;
}

export const useQwenImageGeneration = () => {
  const [state, setState] = useState<QwenImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImages: [],
    progress: undefined,
  });
  const { token, refreshProfile } = useAuth();

  const generateImage = useCallback(async (options: QwenGenerateOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: 'Generating image with Qwen...',
    }));

    try {
      const apiUrl = getApiUrl('/unified-generate');
      
      debugApiRequest('qwen', apiUrl);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...options, model: 'qwen-image' }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const errorMessage = errBody?.error || `Request failed with ${res.status}`;
        debugApiError('qwen', errorMessage);
        
        if (res.status === 403) {
          throw new Error('Insufficient credits. Each generation costs 1 credit. Please purchase more credits to continue.');
        }
        if (res.status === 429) {
          throw new Error('Rate limit reached for the image API. Please wait a minute and try again.');
        }
        throw new Error(errorMessage);
      }

      const { dataUrl } = await res.json();
      debugApiSuccess('qwen', 'Image generated successfully');

      const generatedImage: QwenGeneratedImage = {
        url: dataUrl,
        prompt: options.prompt,
        timestamp: new Date().toISOString(),
        model: 'qwen-image',
        size: options.size,
        seed: options.seed,
        negativePrompt: options.negative_prompt,
        promptExtend: options.prompt_extend,
        watermark: options.watermark,
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImages: [...prev.generatedImages, generatedImage],
        progress: 'Generation complete!',
        error: null,
      }));

      // Refresh user profile to get updated credits
      try {
        await refreshProfile();
      } catch (error) {
        console.warn('Failed to refresh user profile after generation:', error);
      }

      return [generatedImage];

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        progress: undefined,
      }));

      throw error;
    }
  }, [token]);

  const editImage = useCallback<
    (_options: QwenEditOptions) => Promise<QwenGeneratedImage[]>
  >(async (_options) => {
    void _options;
    const message = 'Qwen image editing is no longer supported in this client.';
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: message,
      progress: undefined,
    }));
    throw new Error(message);
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  const clearGeneratedImages = useCallback(() => {
    setState(prev => ({
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
