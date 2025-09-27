import { useState, useCallback } from 'react';
import { getApiUrl } from '../utils/api';
import { debugLog } from '../utils/debug';
import { useAuth } from '../auth/useAuth';

export interface IdeogramGeneratedImage {
  url: string;
  prompt: string;
  timestamp: string;
  model: 'ideogram';
  aspectRatio?: string;
  resolution?: string;
  renderingSpeed?: string;
  stylePreset?: string;
  styleType?: string;
  negativePrompt?: string;
  ownerId?: string;
}

export interface IdeogramImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImages: IdeogramGeneratedImage[];
  progress?: string;
}

export interface IdeogramGenerateOptions {
  prompt: string;
  aspect_ratio?: string;   // e.g. "16:9" (can't be used with resolution)
  resolution?: string;     // e.g. "1024x1024"
  rendering_speed?: "TURBO" | "DEFAULT" | "QUALITY";
  num_images?: number;     // 1..8
  seed?: number;
  style_preset?: string;
  style_type?: "AUTO" | "GENERAL" | "REALISTIC" | "DESIGN" | "FICTION";
  negative_prompt?: string;
}

export interface IdeogramEditOptions {
  image: File;
  mask: File;
  prompt: string;
  rendering_speed?: "TURBO" | "DEFAULT" | "QUALITY";
  seed?: number;
  num_images?: number;
  style_preset?: string;
  style_type?: "AUTO" | "GENERAL" | "REALISTIC" | "DESIGN" | "FICTION";
}

export interface IdeogramReframeOptions {
  image: File;
  resolution: string;
  rendering_speed?: "TURBO" | "DEFAULT" | "QUALITY";
  seed?: number;
  num_images?: number;
  style_preset?: string;
}

export interface IdeogramReplaceBgOptions {
  image: File;
  prompt: string;
  rendering_speed?: "TURBO" | "DEFAULT" | "QUALITY";
  seed?: number;
  num_images?: number;
  style_preset?: string;
}

export interface IdeogramUpscaleOptions {
  image: File;
  resemblance?: number;
  detail?: number;
  prompt?: string;
}

export interface IdeogramDescribeOptions {
  image: File;
  model_version?: "V_2" | "V_3";
}

export const useIdeogramImageGeneration = () => {
  const [state, setState] = useState<IdeogramImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImages: [],
    progress: undefined,
  });
  const { token, refreshProfile } = useAuth();

  const generateImage = useCallback(async (options: IdeogramGenerateOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: 'Generating image with Ideogram...',
    }));

    try {
      const apiUrl = getApiUrl('/unified-generate');
      
      debugLog('[ideogram] POST', apiUrl);
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...options, model: 'ideogram' }),
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

      const generatedImages: IdeogramGeneratedImage[] = dataUrls.map((url: string) => ({
        url,
        prompt: options.prompt,
        timestamp: new Date().toISOString(),
        model: 'ideogram',
        aspectRatio: options.aspect_ratio,
        resolution: options.resolution,
        renderingSpeed: options.rendering_speed,
        stylePreset: options.style_preset,
        styleType: options.style_type,
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

  const editImage = useCallback<
    (_options: IdeogramEditOptions) => Promise<IdeogramGeneratedImage[]>
  >(async (_options) => {
    void _options;
    const message = 'Ideogram image editing is no longer supported in this client.';
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: message,
      progress: undefined,
    }));
    throw new Error(message);
  }, []);

  const reframeImage = useCallback<
    (_options: IdeogramReframeOptions) => Promise<IdeogramGeneratedImage[]>
  >(async (_options) => {
    void _options;
    const message = 'Ideogram reframing is no longer supported in this client.';
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: message,
      progress: undefined,
    }));
    throw new Error(message);
  }, []);

  const replaceBackground = useCallback<
    (_options: IdeogramReplaceBgOptions) => Promise<IdeogramGeneratedImage[]>
  >(async (_options) => {
    void _options;
    const message = 'Ideogram background replacement is no longer supported in this client.';
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: message,
      progress: undefined,
    }));
    throw new Error(message);
  }, []);

  const upscaleImage = useCallback<
    (_options: IdeogramUpscaleOptions) => Promise<IdeogramGeneratedImage[]>
  >(async (_options) => {
    void _options;
    const message = 'Ideogram upscaling is no longer supported in this client.';
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: message,
      progress: undefined,
    }));
    throw new Error(message);
  }, []);

  const describeImage = useCallback<
    (_options: IdeogramDescribeOptions) => Promise<string[]>
  >(async (_options) => {
    void _options;
    const message = 'Ideogram image description is no longer supported in this client.';
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
    reframeImage,
    replaceBackground,
    upscaleImage,
    describeImage,
    clearError,
    clearGeneratedImages,
    reset,
  };
};
