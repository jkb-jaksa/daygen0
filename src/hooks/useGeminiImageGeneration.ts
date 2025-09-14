import { useState, useCallback } from 'react';

export interface GeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  references?: string[]; // Base64 data URLs for reference images used
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

  const generateImage = useCallback(async (options: ImageGenerationOptions) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const { prompt, model, imageData, references, temperature, outputLength, topP } = options;

      // Build a list of candidate API endpoints to try
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const configuredBase = (import.meta as any)?.env?.VITE_API_BASE_URL || '';
      const tried: Array<{ url: string; status?: number; message?: string }> = [];
      const isLocalhost = /localhost|127\.0\.0\.1/.test(origin);
      const candidates = Array.from(
        new Set([
          `${origin}/api/generate-image`,
          // If running Vite on :5173 and serverless via `vercel dev` on :3000, try those
          isLocalhost ? `http://localhost:3000/api/generate-image` : '',
          isLocalhost ? `http://127.0.0.1:3000/api/generate-image` : '',
          configuredBase ? `${configuredBase.replace(/\/$/, '')}/api/generate-image` : '',
        ].filter(Boolean))
      );

      let payload: { success?: boolean; image?: GeneratedImage } | null = null;
      let lastError: Error | null = null;

      for (const url of candidates) {
        try {
          // eslint-disable-next-line no-console
          console.log('[image] POST', url);
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, model, imageData, references, temperature, outputLength, topP }),
          });
          if (!res.ok) {
            const errBody = await res.json().catch(() => null);
            // Handle both string errors and Google API error objects
            const errorMessage = errBody?.error?.message || errBody?.error || `Request failed with ${res.status}`;
            tried.push({ url, status: res.status, message: errorMessage });
            if (res.status === 429) {
              throw new Error('Rate limit reached for the image API. Please wait a minute and try again.');
            }
            // Try next candidate when 404 or 403; otherwise throw
            if (res.status === 404 || res.status === 403) continue;
            throw new Error(errorMessage);
          }
          payload = await res.json();
          break; // success
        } catch (e) {
          lastError = e instanceof Error ? e : new Error(String(e));
          tried.push({ url, message: lastError.message });
        }
      }

      if (!payload) {
        const details = tried.map(t => `${t.url}${t.status ? ` [${t.status}]` : ''}${t.message ? ` - ${t.message}` : ''}`).join(' | ');
        throw new Error(`Unable to reach image API. Tried: ${details}`);
      }

      if (!payload?.image?.url) {
        throw new Error('Malformed response from image API');
      }

      const generatedImage: GeneratedImage = payload.image;

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
    clearError,
    clearGeneratedImage,
    reset,
  };
};
