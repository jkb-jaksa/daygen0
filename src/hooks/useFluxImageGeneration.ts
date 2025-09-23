import { useState, useCallback } from 'react';
import type { FluxModel, FluxModelType } from '../lib/bfl';
import { FLUX_MODEL_MAP } from '../lib/bfl';
import { getApiUrl } from '../utils/api';
import { debugLog } from '../utils/debug';
import { useAuth } from '../auth/useAuth';

export interface FluxGeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  jobId: string;
  references?: string[]; // Base64 data URLs for reference images used
  ownerId?: string; // Optional user ID who generated the image
}

export interface FluxImageGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedImage: FluxGeneratedImage | null;
  jobStatus: 'queued' | 'processing' | 'completed' | 'failed' | null;
  progress?: string;
}

export interface FluxImageGenerationOptions {
  prompt: string;
  model: FluxModel | FluxModelType;
  // Sizing options
  width?: number;
  height?: number;
  aspect_ratio?: string;
  // Ultra-specific params
  raw?: boolean;
  image_prompt?: string;
  image_prompt_strength?: number;
  // Kontext (editing) params
  input_image?: string; // Base64 encoded image
  input_image_2?: string;
  input_image_3?: string;
  input_image_4?: string;
  // Common params
  seed?: number;
  output_format?: 'jpeg' | 'png';
  prompt_upsampling?: boolean;
  safety_tolerance?: number;
  // Generation options
  useWebhook?: boolean;
  references?: string[]; // Base64 data URLs for reference images
}

export const useFluxImageGeneration = () => {
  const [state, setState] = useState<FluxImageGenerationState>({
    isLoading: false,
    error: null,
    generatedImage: null,
    jobStatus: null,
    progress: undefined,
  });
  const { token } = useAuth();

  const generateImage = useCallback(async (options: FluxImageGenerationOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      jobStatus: 'processing',
      progress: 'Generating image with Flux...',
    }));

    try {
      const { prompt, model, references, useWebhook: unusedUseWebhook, ...providerParams } = options;
      void unusedUseWebhook;

      const bflModel =
        model in FLUX_MODEL_MAP ? FLUX_MODEL_MAP[model as FluxModelType] : (model as FluxModel);

      const apiUrl = getApiUrl('/unified-generate');
      debugLog('[flux] POST', apiUrl);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt,
          model: bflModel,
          references,
          providerOptions: providerParams,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const errorMessage = errBody?.error || `Request failed with ${res.status}`;

        if (res.status === 402) {
          throw new Error('Flux credits exceeded. Please add credits to continue.');
        }
        if (res.status === 429) {
          throw new Error('Flux rate limit reached. Please wait and try again.');
        }
        throw new Error(errorMessage);
      }

      const payload = await res.json();

      if (!payload?.dataUrl) {
        throw new Error('Flux did not return an image.');
      }

      const generatedImage: FluxGeneratedImage = {
        url: payload.dataUrl,
        prompt,
        model: bflModel,
        timestamp: new Date().toISOString(),
        jobId: typeof payload.jobId === 'string' ? payload.jobId : 'unknown',
        references: references || undefined,
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedImage,
        jobStatus: 'completed',
        progress: 'Generation complete!',
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
        jobStatus: 'failed',
        progress: undefined,
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
      jobStatus: null,
      progress: undefined,
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
