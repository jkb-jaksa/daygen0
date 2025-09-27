import { useCallback, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { getApiUrl } from '../utils/api';
import { debugLog } from '../utils/debug';

export interface RecraftGeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  style?: string;
  substyle?: string;
  size?: string;
  negativePrompt?: string;
}

export interface RecraftImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImages: RecraftGeneratedImage[];
  progress?: string;
}

export interface RecraftImageGenerationOptions {
  prompt: string;
  model?: 'recraft-v2' | 'recraft-v3';
  style?: string;
  substyle?: string;
  size?: string;
  n?: number;
  negative_prompt?: string;
  controls?: Record<string, unknown>;
  text_layout?: string;
  response_format?: 'url' | 'b64_json';
}

export const useRecraftImageGeneration = () => {
  const [state, setState] = useState<RecraftImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImages: [],
    progress: undefined,
  });
  const { token, refreshProfile } = useAuth();

  const generateImage = useCallback(async (options: RecraftImageGenerationOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: 'Generating image with Recraft...',
    }));

    try {
      const apiUrl = getApiUrl('/unified-generate');
      
      debugLog('[recraft] POST', apiUrl);
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          ...options, 
          model: options.model || 'recraft-v3' 
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const errorMessage = errBody?.error || `Request failed with ${res.status}`;
        
        if (res.status === 403) {
          throw new Error('Insufficient credits. Each generation costs 1 credit. Please purchase more credits to continue.');
        }
        if (res.status === 429) {
          throw new Error('Rate limit reached for the image API. Please wait a minute and try again.');
        }
        throw new Error(errorMessage);
      }

      const { dataUrls } = await res.json();

      const generatedImages: RecraftGeneratedImage[] = dataUrls.map((url: string) => ({
        url,
        prompt: options.prompt,
        model: options.model || 'recraft-v3',
        timestamp: new Date().toISOString(),
        style: options.style,
        substyle: options.substyle,
        size: options.size,
        negativePrompt: options.negative_prompt,
      }));

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImages: [...prev.generatedImages, ...generatedImages],
        progress: 'Generation complete!',
        error: null,
      }));

      // Refresh user profile to get updated credits
      try {
        await refreshProfile();
      } catch (error) {
        console.warn('Failed to refresh user profile after generation:', error);
      }

      return generatedImages;

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

  const clearImages = useCallback(() => {
    setState(prev => ({
      ...prev,
      generatedImages: [],
      error: null,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  return {
    ...state,
    generateImage,
    clearImages,
    clearError,
  };
};
