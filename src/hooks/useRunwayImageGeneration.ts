import { useState, useCallback } from 'react';
import { getApiUrl } from '../utils/api';
import { debugLog } from '../utils/debug';
import { useAuth } from '../auth/useAuth';

export interface GeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  references?: string[]; // Base64 data URLs for reference images used
  ownerId?: string; // Optional user ID who generated the image
}

export interface ImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImage: GeneratedImage | null;
}

export interface ImageGenerationOptions {
  prompt: string;
  model?: string; // Internal API model name (gen4_image, gen4_image_turbo)
  uiModel?: string; // UI model ID (runway-gen4, runway-gen4-turbo)
  references?: string[]; // Base64 data URLs for reference images
  ratio?: string; // Aspect ratio like "1920:1080"
  seed?: number; // Optional seed for reproducible results
}

export const useRunwayImageGeneration = () => {
  const [state, setState] = useState<ImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImage: null,
  });
  const { token, refreshProfile } = useAuth();

  const generateImage = useCallback(async (options: ImageGenerationOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const { prompt, uiModel = 'runway-gen4', references = [], ratio = '1920:1080', seed } = options;

      // Use the Runway API endpoint
      const apiUrl = getApiUrl('/unified-generate');

      debugLog('[runway] POST', apiUrl);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          prompt, 
          model: uiModel,
          references, 
          ratio,
          seed
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const errorMessage = errBody?.error || `Request failed with ${res.status}`;
        
        if (res.status === 403) {
          throw new Error('Insufficient credits. Each generation costs 1 credit. Please purchase more credits to continue.');
        }
        if (res.status === 422) {
          // Handle Runway task failure specifically
          const details = errBody?.details;
          if (details) {
            throw new Error(`Runway generation failed: ${details.error || 'Task failed'}`);
          }
        }
        
        if (res.status === 429) {
          throw new Error('Rate limit reached for the Runway API. Please wait a minute and try again.');
        }
        throw new Error(errorMessage);
      }

      const payload = await res.json();

      if (!payload?.dataUrl) {
        throw new Error('No image data returned from Runway API');
      }

      // Convert the API response format to our expected format
      const generatedImage: GeneratedImage = {
        url: payload.dataUrl,
        prompt,
        model: uiModel, // Use the UI model ID, not the internal API model
        timestamp: new Date().toISOString(),
        references: references || undefined,
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

  const clearImage = useCallback(() => {
    setState(prev => ({
      ...prev,
      generatedImage: null,
    }));
  }, []);

  return {
    ...state,
    generateImage,
    clearError,
    clearImage,
  };
};
