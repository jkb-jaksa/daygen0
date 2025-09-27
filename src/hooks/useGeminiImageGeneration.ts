import { useState, useCallback } from 'react';
import { getApiUrl } from '../utils/api';
import { debugApiRequest, debugApiSuccess } from '../utils/debug';
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
      const { prompt, model, imageData, references, temperature, outputLength, topP } = options;

      // Use the new API endpoint structure
      const apiUrl = getApiUrl('/unified-generate');

      debugApiRequest('gemini', apiUrl);
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
        
        if (res.status === 403) {
          throw new Error('Insufficient credits. Each generation costs 1 credit. Please purchase more credits to continue.');
        }
        if (res.status === 429) {
          throw new Error('Rate limit reached for the image API. Please wait a minute and try again.');
        }
        throw new Error(errorMessage);
      }

      const payload = await res.json();

      if (!payload?.imageBase64) {
        throw new Error('No image data returned from API');
      }

      // Always try to upload to R2 first, fallback to base64 if it fails
      // Always use data URL - backend will handle R2 upload
      const imageUrl = `data:${payload.mimeType || 'image/png'};base64,${payload.imageBase64}`;
      debugApiSuccess('gemini', 'Image generated successfully');

      // Convert the new API response format to our expected format
      const generatedImage: GeneratedImage = {
        url: imageUrl,
        prompt,
        model: model || 'gemini-2.5-flash-image-preview',
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
