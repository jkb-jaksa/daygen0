import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  postProviderJob,
  pollJobStatus,
  normalizeJobStatus,
  runGenerationJob,
  type JobStatusSnapshot,
} from '../generationJobHelpers';

vi.mock('../../utils/api', () => {
  const apiFetch = vi.fn();
  const withTimeout = vi.fn(<T extends AbortSignal | undefined>(signal?: T) => signal ?? new AbortController().signal);

  return {
    apiFetch,
    withTimeout,
  };
});

const apiModule = await import('../../utils/api');
const apiFetchMock = apiModule.apiFetch as unknown as ReturnType<typeof vi.fn>;

describe('generationJobHelpers', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  describe('normalizeJobStatus', () => {
    it('maps provider statuses to normalized states', () => {
      expect(normalizeJobStatus('QUEUED')).toBe('queued');
      expect(normalizeJobStatus('running')).toBe('processing');
      expect(normalizeJobStatus('SUCCEEDED')).toBe('completed');
      expect(normalizeJobStatus('error')).toBe('failed');
      expect(normalizeJobStatus(undefined)).toBe('queued');
    });
  });

  describe('postProviderJob', () => {
    it('posts to the provider endpoint and extracts the job id', async () => {
      apiFetchMock.mockResolvedValueOnce({ jobId: 'job-123', status: 'QUEUED' });

      const response = await postProviderJob({
        provider: 'flux',
        mediaType: 'image',
        body: { prompt: 'hello', model: 'flux-2-pro' },
      });

      expect(apiFetchMock).toHaveBeenCalledWith('/api/image/flux', expect.objectContaining({ method: 'POST' }));
      expect(response.jobId).toBe('job-123');
      expect(response.status).toBe('queued');
    });
  });

  describe('pollJobStatus', () => {
    it('polls until the job is completed and emits updates', async () => {
      apiFetchMock
        .mockResolvedValueOnce({ status: 'PROCESSING', progress: '12' })
        .mockResolvedValueOnce({ status: 'COMPLETED', resultUrl: 'https://cdn/test.png' });

      const updates: JobStatusSnapshot[] = [];
      const result = await pollJobStatus({
        jobId: 'job-1',
        intervalMs: 1,
        onUpdate: (snapshot) => updates.push(snapshot),
      });

      expect(apiFetchMock).toHaveBeenCalledTimes(2);
      expect(updates).toHaveLength(2);
      expect(updates[0].status).toBe('processing');
      expect(result.status).toBe('completed');
      expect(result.job.resultUrl).toBe('https://cdn/test.png');
    });

    it('respects abort signals', async () => {
      const controller = new AbortController();

      apiFetchMock.mockImplementation(async () => {
        controller.abort();
        return { status: 'PROCESSING' };
      });

      await expect(
        pollJobStatus({ jobId: 'job-abort', intervalMs: 1, signal: controller.signal }),
      ).rejects.toMatchObject({ name: 'AbortError' });
    });
  });

  describe('runGenerationJob', () => {
    it('returns immediate results when job id is missing', async () => {
      const tracker = { enqueue: vi.fn(), update: vi.fn(), finalize: vi.fn() };
      apiFetchMock.mockResolvedValueOnce({ dataUrl: 'https://cdn/immediate.png' });

      const result = await runGenerationJob({
        provider: 'chatgpt',
        mediaType: 'image',
        body: { prompt: 'hi', model: 'gpt-image-1.5' },
        tracker,
        prompt: 'hi',
        model: 'gpt-image-1.5',
        parseImmediateResult: () => ({
          url: 'https://cdn/immediate.png',
          prompt: 'hi',
          model: 'gpt-image-1.5',
          timestamp: 'now',
        }),
        parseJobResult: () => {
          throw new Error('should not be called');
        },
      });

      expect(result.result.url).toBe('https://cdn/immediate.png');
      expect(tracker.enqueue).not.toHaveBeenCalled();
      expect(tracker.finalize).not.toHaveBeenCalled();
    });

    it('tracks lifecycle for job-based responses', async () => {
      const tracker = { enqueue: vi.fn(), update: vi.fn(), finalize: vi.fn() };
      apiFetchMock
        .mockResolvedValueOnce({ jobId: 'job-xyz' })
        .mockResolvedValueOnce({ status: 'COMPLETED', resultUrl: 'https://cdn/result.png' });

      const result = await runGenerationJob({
        provider: 'flux',
        mediaType: 'image',
        body: { prompt: 'hi', model: 'flux-2-pro' },
        tracker,
        prompt: 'hi',
        model: 'flux-2-pro',
        parseJobResult: () => ({
          url: 'https://cdn/result.png',
          prompt: 'hi',
          model: 'flux-2-pro',
          timestamp: 'now',
          jobId: 'job-xyz',
        }),
        onUpdate: vi.fn(),
        pollIntervalMs: 1,
      });

      expect(result.jobId).toBe('job-xyz');
      expect(tracker.enqueue).toHaveBeenCalledWith('job-xyz', 'hi', 'flux-2-pro');
      expect(tracker.update).toHaveBeenCalled();
      expect(tracker.finalize).toHaveBeenCalledWith('job-xyz');
    });
  });
});
