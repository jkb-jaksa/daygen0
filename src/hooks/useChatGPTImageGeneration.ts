import { useState, useCallback } from 'react';
import { getApiUrl } from '../utils/api';

export interface ChatGPTGeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  size: string;
  quality: string;
  background: string;
  ownerId?: string; // Optional user ID who generated the image
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
}

export const useChatGPTImageGeneration = () => {
  const [state, setState] = useState<ChatGPTImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImage: null,
  });

  const generateImage = useCallback(async (options: ChatGPTImageGenerationOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const { prompt, n = 1, size = '1024x1024', quality = 'high', background = 'transparent' } = options;

      // Use the ChatGPT Image API endpoint
      const apiUrl = getApiUrl('/api/chatgpt-image');

      console.log('[chatgpt-image] POST', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          n,
          size,
          quality,
          background,
        }),
      });

      console.log('[chatgpt-image] Response status:', res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log('[chatgpt-image] Response data:', data);

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
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImage,
        error: null,
      }));

      return generatedImage;
    } catch (error) {
      console.error('[chatgpt-image] Generation failed:', error);
      
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
    clearError,
    clearGeneratedImage,
    reset,
  };
};
