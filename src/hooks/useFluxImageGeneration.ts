import { useState, useCallback } from 'react';
import type { FluxModel, FluxModelType } from '../lib/bfl';
import { FLUX_MODEL_MAP } from '../lib/bfl';
import { getApiUrl } from '../utils/api';
import { debugError, debugLog } from '../utils/debug';

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

  const generateImage = useCallback(async (options: FluxImageGenerationOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      jobStatus: 'queued',
      progress: 'Submitting job...',
    }));

    try {
      const { prompt, model, references, useWebhook = false, ...params } = options;

      // Map model to BFL model if needed
      const bflModel = model in FLUX_MODEL_MAP 
        ? FLUX_MODEL_MAP[model as FluxModelType]
        : model as FluxModel;

      // Submit the job
      const apiUrl = getApiUrl('/api/flux/generate');

      debugLog('[flux] POST', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          model: bflModel,
          ...params,
          useWebhook
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const errorMessage = errBody?.error || `Request failed with ${res.status}`;
        
        if (res.status === 402) {
          throw new Error('BFL credits exceeded. Please add credits to your account.');
        }
        if (res.status === 429) {
          throw new Error('Rate limit reached. Too many active tasks. Please wait and try again.');
        }
        throw new Error(errorMessage);
      }

      const { id, pollingUrl } = await res.json();

      setState(prev => ({
        ...prev,
        jobStatus: 'processing',
        progress: 'Job submitted, processing...',
      }));

      // If using webhooks, we don't need to poll
      if (useWebhook) {
        // For webhook mode, we'll simulate the completion
        // In a real app, you'd listen for webhook events or poll a status endpoint
        const generatedImage: FluxGeneratedImage = {
          url: '', // This would be set by the webhook handler
          prompt,
          model,
          timestamp: new Date().toISOString(),
          jobId: id,
          references: references || undefined,
        };
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          jobStatus: 'completed',
          progress: 'Job completed via webhook',
          generatedImage,
        }));
        
        return generatedImage;
      }

      // Polling mode - check job status periodically
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max (5s intervals)
      
      debugLog('[flux] Starting polling for job:', id);
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        attempts++;
        
        debugLog(`[flux] Polling attempt ${attempts}/${maxAttempts}`);
        
        try {
          const pollRes = await fetch(getApiUrl(`/api/flux/result?pollingUrl=${encodeURIComponent(pollingUrl)}`));
          
          if (!pollRes.ok) {
            throw new Error(`Polling failed: ${pollRes.status}`);
          }

          const result = await pollRes.json();
          debugLog('[flux] Polling result:', result.status);
          
          if (result.status === 'Ready' && result.result?.sample) {
            // Download the image via our server to avoid CORS issues
            const downloadRes = await fetch(getApiUrl(`/api/flux/download?url=${encodeURIComponent(result.result.sample)}`));
            if (!downloadRes.ok) {
              throw new Error(`Failed to download image: ${downloadRes.status}`);
            }
            
            const { dataUrl } = await downloadRes.json();

            const generatedImage: FluxGeneratedImage = {
              url: dataUrl,
              prompt,
              model,
              timestamp: new Date().toISOString(),
              jobId: id,
              references: references || undefined,
            };

            setState(prev => ({
              ...prev,
              isLoading: false,
              jobStatus: 'completed',
              progress: 'Generation complete!',
              generatedImage,
              error: null,
            }));

            return generatedImage;
          }
          
          if (result.status === 'Error' || result.status === 'Failed') {
            throw new Error(`Generation failed: ${result.error || 'Unknown error'}`);
          }
          
          // Update progress
          setState(prev => ({
            ...prev,
            progress: `Processing... (${result.status})`,
          }));
          
        } catch (pollError) {
          debugError('Polling error:', pollError);
          // If it's a download error, stop polling immediately
          if (pollError instanceof Error && pollError.message.includes('Failed to download image')) {
            throw pollError;
          }
          // Continue polling unless it's a critical error
          if (attempts >= maxAttempts - 1) {
            throw pollError;
          }
        }
      }
      
      throw new Error('Generation timed out. Please try again.');

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
