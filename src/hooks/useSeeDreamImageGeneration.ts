import { useState, useCallback } from 'react';
import { getApiUrl } from '../utils/api';
import { debugLog } from '../utils/debug';
import { useAuth } from '../auth/useAuth';

export interface SeedreamGeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  size: string;
  ownerId?: string; // Optional user ID who generated the image
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

export interface SeedreamImageEditOptions {
  prompt: string;
  image: File;
  mask?: File;
  size?: string;
  n?: number;
}

export const useSeeDreamImageGeneration = () => {
  const [state, setState] = useState<SeedreamImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImage: null,
  });
  const { token } = useAuth();

  const generateImage = useCallback(async (options: SeedreamImageGenerationOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const { prompt, size = "1024x1024", n = 1 } = options;

      debugLog('[seedream] Generating image with prompt:', `${prompt.substring(0, 100)}...`);
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(getApiUrl('/unified-generate'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, size, n, model: 'seedream-3.0' }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const errorMessage = errBody?.error || `Request failed with ${res.status}`;
        throw new Error(errorMessage);
      }

      const { images } = await res.json();
      
      if (!images || images.length === 0) {
        throw new Error('No images generated');
      }

      const generatedImage: SeedreamGeneratedImage = {
        url: images[0], // images[0] is already a complete data URL
        prompt,
        model: 'seedream-3.0',
        timestamp: new Date().toISOString(),
        size,
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImage,
        error: null,
      }));

      return generatedImage;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        generatedImage: null,
      }));

      throw error;
    }
  }, [token]);

  const editImage = useCallback(async (options: SeedreamImageEditOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const { prompt, image, mask, size = "1024x1024", n = 1 } = options;

      debugLog('[seedream] Editing image with prompt:', `${prompt.substring(0, 100)}...`);
      
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('size', size);
      formData.append('n', String(n));
      formData.append('image', image);
      if (mask) {
        formData.append('mask', mask);
      }
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(getApiUrl('/unified-generate'), {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const errorMessage = errBody?.error || `Request failed with ${res.status}`;
        throw new Error(errorMessage);
      }

      const { images } = await res.json();
      
      if (!images || images.length === 0) {
        throw new Error('No images generated');
      }

      const generatedImage: SeedreamGeneratedImage = {
        url: images[0], // images[0] is already a complete data URL
        prompt,
        model: 'seedream-3.0',
        timestamp: new Date().toISOString(),
        size,
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImage,
        error: null,
      }));

      return generatedImage;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        generatedImage: null,
      }));

      throw error;
    }
  }, [token]);

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
    editImage,
    clearError,
    clearGeneratedImage,
    reset,
  };
};
