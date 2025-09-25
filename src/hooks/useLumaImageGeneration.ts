import { useCallback, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { getApiUrl } from '../utils/api';
import { debugLog } from '../utils/debug';

export interface LumaGeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  aspectRatio?: string;
  style?: string;
  quality?: string;
}

export interface LumaImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImages: LumaGeneratedImage[];
  progress?: string;
}

export interface LumaImageGenerationOptions {
  prompt: string;
  model?: 'luma-dream-shaper' | 'luma-realistic-vision';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  style?: 'realistic' | 'artistic' | 'cinematic';
  quality?: 'standard' | 'high';
  negativePrompt?: string;
  seed?: number;
  steps?: number;
  guidanceScale?: number;
}

export const useLumaImageGeneration = () => {
  const [state, setState] = useState<LumaImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImages: [],
    progress: undefined,
  });
  const { token } = useAuth();

  const generateImage = useCallback(async (options: LumaImageGenerationOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: 'Generating image with Luma AI...',
    }));

    try {
      const apiUrl = getApiUrl('/unified-generate');
      
      debugLog('[luma] POST', apiUrl);
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          ...options, 
          model: 'luma-dream-shaper' // Default model
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const errorMessage = errBody?.error || `Request failed with ${res.status}`;
        throw new Error(errorMessage);
      }

      const { dataUrls } = await res.json();

      const generatedImages: LumaGeneratedImage[] = dataUrls.map((url: string) => ({
        url,
        prompt: options.prompt,
        model: options.model || 'luma-dream-shaper',
        timestamp: new Date().toISOString(),
        aspectRatio: options.aspectRatio,
        style: options.style,
        quality: options.quality,
      }));

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImages: [...prev.generatedImages, ...generatedImages],
        progress: 'Generation complete!',
        error: null,
      }));

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
