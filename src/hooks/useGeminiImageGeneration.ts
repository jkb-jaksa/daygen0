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
  model?: string;
  imageData?: string; // Base64 encoded image for image-to-image
  references?: string[]; // Base64 data URLs for reference images
  temperature?: number;
  outputLength?: number; // maps to maxOutputTokens
  topP?: number;
}

export const useGeminiImageGeneration = () => {
  const { token, user } = useAuth();
  const [state, setState] = useState<ImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImage: null,
  });

  const generateImage = useCallback(async (options: ImageGenerationOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      if (!token) {
        const message = 'Please sign in to generate images.';
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw new Error(message);
      }

      const { prompt, model, imageData, references, temperature, outputLength, topP } = options;

      // Use the new API endpoint structure
      const apiUrl = getApiUrl('/api/unified-generate');

      debugLog('[image] POST', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          prompt, 
          imageBase64: imageData, 
          mimeType: "image/png",
          model, 
          references, 
          temperature, 
          outputLength, 
          topP 
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const errorMessage = errBody?.error || `Request failed with ${res.status}`;
        
        if (res.status === 429) {
          throw new Error('Rate limit reached for the image API. Please wait a minute and try again.');
        }
        throw new Error(errorMessage);
      }

      const payload = await res.json();

      if (!payload?.imageBase64) {
        throw new Error('No image data returned from API');
      }

      // Convert the new API response format to our expected format
      const generatedImage: GeneratedImage = {
        url: `data:${payload.mimeType || 'image/png'};base64,${payload.imageBase64}`,
        prompt,
        model: model || 'gemini-2.5-flash-image-preview',
        timestamp: new Date().toISOString(),
        references: references || undefined,
        ownerId: user?.id,
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
  }, [token, user?.id]);

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
