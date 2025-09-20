import { useState, useCallback, useRef } from 'react';
import { getApiUrl } from '../utils/api';
import { debugLog, debugError } from '../utils/debug';

export interface GeneratedVideo {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  jobId?: string;
  references?: string[];
  ownerId?: string;
  type: 'video';
}

export interface VideoGenerationState {
  isLoading: boolean;
  error: string | null;
  generatedVideo: GeneratedVideo | null;
  operationName: string | null;
  isPolling: boolean;
}

export interface VideoGenerationOptions {
  prompt: string;
  model?: 'veo-3.0-generate-001' | 'veo-3.0-fast-generate-001';
  aspectRatio?: '16:9' | '9:16';
  negativePrompt?: string;
  seed?: number;
  imageBase64?: string;
  imageMimeType?: string;
}

export const useVeoVideoGeneration = () => {
  const [state, setState] = useState<VideoGenerationState>({
    isLoading: false,
    error: null,
    generatedVideo: null,
    operationName: null,
    isPolling: false,
  });

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const generationParamsRef = useRef<VideoGenerationOptions | null>(null);

  const startGeneration = useCallback(async (options: VideoGenerationOptions) => {
    // Store generation parameters for later use
    generationParamsRef.current = options;
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      generatedVideo: null,
      operationName: null,
      isPolling: false,
    }));

    try {
      const { prompt, model = 'veo-3.0-generate-001', aspectRatio = '16:9', negativePrompt, seed, imageBase64, imageMimeType } = options;

      const apiUrl = getApiUrl('/api/video/veo/create');
      debugLog('[video] POST', apiUrl);
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          model,
          aspectRatio,
          negativePrompt,
          seed,
          imageBase64,
          imageMimeType
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      debugLog('[video] Operation started:', data.name);

      setState(prev => ({
        ...prev,
        operationName: data.name,
        isLoading: false,
        isPolling: true,
      }));

      // Start polling
      pollStatus(data.name);

    } catch (error) {
      debugError('[video] Generation failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        isPolling: false,
      }));
    }
  }, []);

  const pollStatus = useCallback(async (operationName: string) => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }

    const poll = async () => {
      try {
        const apiUrl = getApiUrl(`/api/video/veo/status/${encodeURIComponent(operationName)}`);
        debugLog('[video] Polling status:', apiUrl);
        
        const res = await fetch(apiUrl);
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        debugLog('[video] Status response:', data);

        if (data.done) {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }

          if (data.error) {
            setState(prev => ({
              ...prev,
              isLoading: false,
              error: data.error,
              isPolling: false,
            }));
          } else {
            // Video is ready, download it
            downloadVideo(operationName);
          }
        }
      } catch (error) {
        debugError('[video] Polling failed:', error);
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Polling failed',
          isPolling: false,
        }));
      }
    };

    // Poll every 10 seconds
    pollTimerRef.current = setInterval(poll, 10000);
    
    // Initial poll
    poll();
  }, []);

  const downloadVideo = useCallback(async (operationName: string) => {
    try {
      const apiUrl = getApiUrl(`/api/video/veo/download/${encodeURIComponent(operationName)}`);
      debugLog('[video] Downloading video:', apiUrl);
      
      const res = await fetch(apiUrl);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      // Convert response to blob and create object URL
      const blob = await res.blob();
      const videoUrl = URL.createObjectURL(blob);

      const params = generationParamsRef.current;
      const generatedVideo: GeneratedVideo = {
        url: videoUrl,
        prompt: params?.prompt || '',
        model: params?.model || 'veo-3.0-generate-001',
        timestamp: new Date().toISOString(),
        jobId: operationName,
        type: 'video',
      };

      setState(prev => ({
        ...prev,
        isLoading: false,
        generatedVideo,
        isPolling: false,
      }));

    } catch (error) {
      debugError('[video] Download failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Download failed',
        isPolling: false,
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setState({
      isLoading: false,
      error: null,
      generatedVideo: null,
      operationName: null,
      isPolling: false,
    });
  }, []);

  return {
    ...state,
    startGeneration,
    clearError,
    reset,
  };
};
