import { useState } from 'react';
import { getApiUrl } from '../utils/api';

export type RunwayVideoOptions = {
  model?: 'gen4_turbo' | 'gen4_aleph' | 'act_two';
  ratio?: '1280:720' | '720:1280' | '1104:832' | '832:1104' | '960:960' | '1584:672';
  duration?: 5 | 10;
  seed?: number;
  contentModeration?: Record<string, unknown>;
};

export function useRunwayVideoGeneration() {
  const [status, setStatus] = useState<'idle' | 'running' | 'error' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);

  async function generate({
    promptText,
    promptImage,
    options = {},
  }: {
    promptText: string;
    promptImage?: string; // URL or data: URI - Made optional
    options?: RunwayVideoOptions;
  }) {
    setStatus('running'); 
    setError(null); 
    setVideoUrl(null); 
    setTaskId(null);
    
    try {
      const res = await fetch(getApiUrl('/api/unified-video'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'runway',
          action: 'create',
          promptText,
          promptImage,
          ...options,
        }),
      });
      
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      
      const body = await res.json();
      setVideoUrl(body.url);
      setTaskId(body.taskId ?? null);
      setStatus('done');
      return body as { url: string; taskId: string; meta?: unknown };
    } catch (e: any) {
      setError(e?.message || 'Generation failed');
      setStatus('error');
      throw e;
    }
  }

  return { status, error, videoUrl, taskId, generate };
}
