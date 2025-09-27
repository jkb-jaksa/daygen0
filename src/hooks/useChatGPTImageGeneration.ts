import { useState, useCallback } from 'react';
import { useAuth } from '../auth/useAuth';
import { getApiUrl } from '../utils/api';
import { debugApiRequest, debugApiResponse, debugApiError } from '../utils/debug';

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
  const { token, refreshProfile } = useAuth();

  const generateImage = useCallback(async (options: ChatGPTImageGenerationOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const { prompt, n = 1, size = '1024x1024', quality = 'high', background = 'transparent' } = options;

      // Use the ChatGPT Image API endpoint
      const apiUrl = getApiUrl('/unified-generate');

      debugApiRequest('chatgpt-image', apiUrl);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt,
          n,
          size,
          quality,
          background,
          model: 'chatgpt-image',
        }),
      });

      debugApiResponse('chatgpt-image', res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${res.status}: ${res.statusText}`;
        debugApiError('chatgpt-image', errorMessage);
        
        if (res.status === 403) {
          throw new Error('Insufficient credits. Each generation costs 1 credit. Please purchase more credits to continue.');
        }
        if (res.status === 429) {
          throw new Error('Rate limit reached for the image API. Please wait a minute and try again.');
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      debugApiResponse('chatgpt-image', res.status, data);

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

      // Refresh user profile to get updated credits
      try {
        await refreshProfile();
      } catch (error) {
        console.warn('Failed to refresh user profile after generation:', error);
      }

      return generatedImage;
    } catch (error) {
      debugApiError('chatgpt-image', error);
      
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
    clearError,
    clearGeneratedImage,
    reset,
  };
};
