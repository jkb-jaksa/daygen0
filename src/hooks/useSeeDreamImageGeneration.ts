import { useState, useCallback } from 'react';
import { getApiUrl } from '../utils/api';

export interface SeeDreamGeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  size: string;
  ownerId?: string; // Optional user ID who generated the image
}

export interface SeeDreamImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImage: SeeDreamGeneratedImage | null;
}

export interface SeeDreamImageGenerationOptions {
  prompt: string;
  size?: string;
  n?: number;
}

export interface SeeDreamImageEditOptions {
  prompt: string;
  image: File;
  mask?: File;
  size?: string;
  n?: number;
}

export const useSeeDreamImageGeneration = () => {
  const [state, setState] = useState<SeeDreamImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImage: null,
  });

  const generateImage = useCallback(async (options: SeeDreamImageGenerationOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const { prompt, size = "1024x1024", n = 1 } = options;

      console.log('[seedream] Generating image with prompt:', prompt.substring(0, 100) + '...');
      
      const res = await fetch(getApiUrl('/api/seedream/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size, n }),
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

      const generatedImage: SeeDreamGeneratedImage = {
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
  }, []);

  const editImage = useCallback(async (options: SeeDreamImageEditOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const { prompt, image, mask, size = "1024x1024", n = 1 } = options;

      console.log('[seedream] Editing image with prompt:', prompt.substring(0, 100) + '...');
      
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('size', size);
      formData.append('n', String(n));
      formData.append('image', image);
      if (mask) {
        formData.append('mask', mask);
      }
      
      const res = await fetch(getApiUrl('/api/seedream/edit'), {
        method: 'POST',
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

      const generatedImage: SeeDreamGeneratedImage = {
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
  }, []);

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
