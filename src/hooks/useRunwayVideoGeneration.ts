import { useState, useCallback } from 'react';

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

  const generate = useCallback(
    async () => {
      const message = 'Runway video generation is not yet supported in this backend integration.';
      setStatus('error');
      setError(message);
      setVideoUrl(null);
      setTaskId(null);
      throw new Error(message);
    },
    []
  );

  return { status, error, videoUrl, taskId, generate };
}
