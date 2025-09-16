import { useState, useCallback } from 'react';
import { getApiUrl } from '../utils/api';

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

  const generateImage = useCallback(async (options: IdeogramGenerateOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: 'Generating image with Ideogram...',
    }));

    try {
      const apiUrl = getApiUrl('/api/ideogram/generate');
      
      console.log('[ideogram] POST', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const errorMessage = errBody?.error || `Request failed with ${res.status}`;
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
  }, []);

  const editImage = useCallback(async (options: IdeogramEditOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: 'Editing image with Ideogram...',
    }));

    try {
      const apiUrl = getApiUrl('/api/ideogram/edit');
      
      const formData = new FormData();
      formData.append('image', options.image);
      formData.append('mask', options.mask);
      formData.append('prompt', options.prompt);
      if (options.rendering_speed) formData.append('rendering_speed', options.rendering_speed);
      if (options.seed !== undefined) formData.append('seed', String(options.seed));
      if (options.num_images) formData.append('num_images', String(options.num_images));
      if (options.style_preset) formData.append('style_preset', options.style_preset);
      if (options.style_type) formData.append('style_type', options.style_type);
      
      console.log('[ideogram] POST', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const errorMessage = errBody?.error || `Request failed with ${res.status}`;
        throw new Error(errorMessage);
      }

      const { dataUrls } = await res.json();

      const generatedImages: IdeogramGeneratedImage[] = dataUrls.map((url: string) => ({
        url,
        prompt: options.prompt,
        timestamp: new Date().toISOString(),
        model: 'ideogram',
        renderingSpeed: options.rendering_speed,
        stylePreset: options.style_preset,
        styleType: options.style_type,
      }));

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImages: [...prev.generatedImages, ...generatedImages],
        progress: 'Edit complete!',
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
  }, []);

  const reframeImage = useCallback(async (options: IdeogramReframeOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: 'Reframing image with Ideogram...',
    }));

    try {
      const apiUrl = getApiUrl('/api/ideogram/reframe');
      
      const formData = new FormData();
      formData.append('image', options.image);
      formData.append('resolution', options.resolution);
      if (options.rendering_speed) formData.append('rendering_speed', options.rendering_speed);
      if (options.seed !== undefined) formData.append('seed', String(options.seed));
      if (options.num_images) formData.append('num_images', String(options.num_images));
      if (options.style_preset) formData.append('style_preset', options.style_preset);
      
      console.log('[ideogram] POST', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const errorMessage = errBody?.error || `Request failed with ${res.status}`;
        throw new Error(errorMessage);
      }

      const { dataUrls } = await res.json();

      const generatedImages: IdeogramGeneratedImage[] = dataUrls.map((url: string) => ({
        url,
        prompt: `Reframe to ${options.resolution}`,
        timestamp: new Date().toISOString(),
        model: 'ideogram',
        resolution: options.resolution,
        renderingSpeed: options.rendering_speed,
        stylePreset: options.style_preset,
      }));

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImages: [...prev.generatedImages, ...generatedImages],
        progress: 'Reframe complete!',
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
  }, []);

  const replaceBackground = useCallback(async (options: IdeogramReplaceBgOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: 'Replacing background with Ideogram...',
    }));

    try {
      const apiUrl = getApiUrl('/api/ideogram/replace-background');
      
      const formData = new FormData();
      formData.append('image', options.image);
      formData.append('prompt', options.prompt);
      if (options.rendering_speed) formData.append('rendering_speed', options.rendering_speed);
      if (options.seed !== undefined) formData.append('seed', String(options.seed));
      if (options.num_images) formData.append('num_images', String(options.num_images));
      if (options.style_preset) formData.append('style_preset', options.style_preset);
      
      console.log('[ideogram] POST', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const errorMessage = errBody?.error || `Request failed with ${res.status}`;
        throw new Error(errorMessage);
      }

      const { dataUrls } = await res.json();

      const generatedImages: IdeogramGeneratedImage[] = dataUrls.map((url: string) => ({
        url,
        prompt: options.prompt,
        timestamp: new Date().toISOString(),
        model: 'ideogram',
        renderingSpeed: options.rendering_speed,
        stylePreset: options.style_preset,
      }));

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImages: [...prev.generatedImages, ...generatedImages],
        progress: 'Background replacement complete!',
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
  }, []);

  const upscaleImage = useCallback(async (options: IdeogramUpscaleOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: 'Upscaling image with Ideogram...',
    }));

    try {
      const apiUrl = getApiUrl('/api/ideogram/upscale');
      
      const formData = new FormData();
      formData.append('image', options.image);
      if (options.resemblance !== undefined) formData.append('resemblance', String(options.resemblance));
      if (options.detail !== undefined) formData.append('detail', String(options.detail));
      if (options.prompt) formData.append('prompt', options.prompt);
      
      console.log('[ideogram] POST', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const errorMessage = errBody?.error || `Request failed with ${res.status}`;
        throw new Error(errorMessage);
      }

      const { dataUrls } = await res.json();

      const generatedImages: IdeogramGeneratedImage[] = dataUrls.map((url: string) => ({
        url,
        prompt: options.prompt || 'Upscaled image',
        timestamp: new Date().toISOString(),
        model: 'ideogram',
      }));

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImages: [...prev.generatedImages, ...generatedImages],
        progress: 'Upscale complete!',
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
  }, []);

  const describeImage = useCallback(async (options: IdeogramDescribeOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: 'Describing image with Ideogram...',
    }));

    try {
      const apiUrl = getApiUrl('/api/ideogram/describe');
      
      const formData = new FormData();
      formData.append('image', options.image);
      if (options.model_version) formData.append('model_version', options.model_version);
      
      console.log('[ideogram] POST', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const errorMessage = errBody?.error || `Request failed with ${res.status}`;
        throw new Error(errorMessage);
      }

      const { descriptions } = await res.json();

      setState(prev => ({
        ...prev,
        isLoading: false,
        progress: 'Description complete!',
        error: null,
      }));

      return descriptions;

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
