import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGeminiImageGeneration } from '../hooks/useGeminiImageGeneration';

// Mock the useAuth hook
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    token: 'mock-token',
    user: { id: 'mock-user-id' }
  })
}));

// Mock the API utilities
vi.mock('../utils/api', () => ({
  getApiUrl: (path: string) => `http://localhost:3001${path}`
}));

// Mock fetch
global.fetch = vi.fn();

describe('useGeminiImageGeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useGeminiImageGeneration());
    
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.generatedImage).toBe(null);
    expect(result.current.progress).toBe(0);
    expect(result.current.status).toBe('idle');
    expect(result.current.jobId).toBe(null);
  });

  it('resets state completely on new generation', async () => {
    const { result } = renderHook(() => useGeminiImageGeneration());
    
    // Mock a successful response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobId: 'test-job-id',
        progress: 0
      })
    });

    // Mock job polling response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'COMPLETED',
        resultUrl: 'https://example.com/image.png',
        progress: 100
      })
    });

    // Start the generation and check initial state
    act(() => {
      result.current.generateImage({
        prompt: 'Test prompt',
        model: 'gemini-2.5-flash-image'
      });
    });

    // Check that state was reset immediately
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.generatedImage).toBe(null);
    expect(result.current.progress).toBeGreaterThanOrEqual(0);
    expect(result.current.status).toBe('queued');

    // Wait for completion
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
  });

  it('handles progress updates smoothly', async () => {
    const { result } = renderHook(() => useGeminiImageGeneration());
    
    // Mock initial response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobId: 'test-job-id',
        progress: 0
      })
    });

    // Mock progressive job polling responses
    let pollCount = 0;
    (global.fetch as any).mockImplementation(() => {
      pollCount++;
      if (pollCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: 'PROCESSING',
            progress: 25
          })
        });
      } else if (pollCount === 2) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: 'PROCESSING',
            progress: 50
          })
        });
      } else {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: 'COMPLETED',
            resultUrl: 'https://example.com/image.png',
            progress: 100
          })
        });
      }
    });

    await act(async () => {
      result.current.generateImage({
        prompt: 'Test prompt',
        model: 'gemini-2.5-flash-image'
      });
    });

    // Fast-forward timers to trigger progress updates
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Progress should be updating
    expect(result.current.progress).toBeGreaterThan(0);
  });

  it('clears progress controller on new generation', async () => {
    const { result } = renderHook(() => useGeminiImageGeneration());
    
    // Mock responses
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobId: 'test-job-id-1',
        progress: 0
      })
    });

    // Start first generation
    await act(async () => {
      result.current.generateImage({
        prompt: 'First prompt',
        model: 'gemini-2.5-flash-image'
      });
    });

    // Mock second generation response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        jobId: 'test-job-id-2',
        progress: 0
      })
    });

    // Start second generation - should clear previous controller
    await act(async () => {
      result.current.generateImage({
        prompt: 'Second prompt',
        model: 'gemini-2.5-flash-image'
      });
    });

    // Should have new job ID
    expect(result.current.jobId).toBe('test-job-id-2');
  });

  it('handles errors gracefully', async () => {
    const { result } = renderHook(() => useGeminiImageGeneration());
    
    // Mock error response
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    await act(async () => {
      try {
        await result.current.generateImage({
          prompt: 'Test prompt',
          model: 'gemini-2.5-flash-image'
        });
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(result.current.generatedImage).toBe(null);
  });
});
