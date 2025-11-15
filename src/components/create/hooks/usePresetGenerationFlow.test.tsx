/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';

// Mock Supabase before any other imports to prevent env var errors
vi.mock('../../../lib/supabase', () => {
  const mockSupabase = {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: null }, unsubscribe: vi.fn() })),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
  return {
    supabase: mockSupabase,
  };
});

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePresetGenerationFlow } from './usePresetGenerationFlow';
import { generatePresetImage } from '../../../api/presetGeneration';
import { pollJobStatus } from '../../../hooks/generationJobHelpers';
import type { StyleOption } from './useStyleHandlers';
import { GenerationProvider } from '../contexts/GenerationContext';
import type { JobStatusSnapshot } from '../../../hooks/generationJobHelpers';

vi.mock('../../../api/presetGeneration', () => ({
  generatePresetImage: vi.fn(),
}));

vi.mock('../../../hooks/generationJobHelpers', async () => {
  const actual = await vi.importActual('../../../hooks/generationJobHelpers');
  return {
    ...actual,
    pollJobStatus: vi.fn(),
  };
});

const addImageMock = vi.fn().mockResolvedValue(undefined);

vi.mock('../contexts/GalleryContext', () => ({
  useGallery: () => ({
    addImage: addImageMock,
  }),
}));

const mockedGeneratePreset = vi.mocked(generatePresetImage);
const mockedPollJobStatus = vi.mocked(pollJobStatus);

const mockStyles: StyleOption[] = [
  {
    id: 'style-one',
    name: 'Style One',
    prompt: 'prompt-one',
    image: 'https://cdn.example.com/style-one.png',
  },
  {
    id: 'style-two',
    name: 'Style Two',
    prompt: 'prompt-two',
    image: 'https://cdn.example.com/style-two.png',
  },
];

const originalCreateObjectURL = global.URL.createObjectURL;
const originalRevokeObjectURL = global.URL.revokeObjectURL;

beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = vi.fn();
});

afterAll(() => {
  global.URL.createObjectURL = originalCreateObjectURL;
  global.URL.revokeObjectURL = originalRevokeObjectURL;
});

describe('usePresetGenerationFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addImageMock.mockClear();
  });

  it('opens the modal with selected styles', () => {
    const { result } = renderHook(() => usePresetGenerationFlow(), {
      wrapper: ({ children }) => <GenerationProvider>{children}</GenerationProvider>,
    });

    act(() => {
      result.current.openForStyles(mockStyles);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.jobs).toHaveLength(2);
    expect(result.current.jobs[0].style.id).toBe('style-one');
  });

  it('generates an image for each style and records gallery entries', async () => {
    mockedGeneratePreset
      .mockResolvedValueOnce({ jobId: 'job-1' })
      .mockResolvedValueOnce({ jobId: 'job-2' });

    const mockSnapshot1: JobStatusSnapshot = {
      job: {
        id: 'job-1',
        status: 'completed',
        resultUrl: 'https://cdn.example.com/result-one.png',
        metadata: {
          template: { id: 't-one', title: 'Style One', styleOptionId: 'style-one' },
          prompt: 'Prompt 1',
          r2FileId: 'r2-1',
        },
      },
      status: 'completed',
      progress: 100,
    };

    const mockSnapshot2: JobStatusSnapshot = {
      job: {
        id: 'job-2',
        status: 'completed',
        resultUrl: 'https://cdn.example.com/result-two.png',
        metadata: {
          template: { id: 't-two', title: 'Style Two', styleOptionId: 'style-two' },
          prompt: 'Prompt 2',
          r2FileId: 'r2-2',
        },
      },
      status: 'completed',
      progress: 100,
    };

    mockedPollJobStatus
      .mockResolvedValueOnce(mockSnapshot1)
      .mockResolvedValueOnce(mockSnapshot2);

    const { result } = renderHook(() => usePresetGenerationFlow(), {
      wrapper: ({ children }) => <GenerationProvider>{children}</GenerationProvider>,
    });

    act(() => {
      result.current.openForStyles(mockStyles);
    });

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    await act(async () => {
      result.current.handleFileSelect(file);
    });

    await act(async () => {
      await result.current.startGeneration();
    });

    await waitFor(() => {
      expect(result.current.jobs.every((job) => job.status === 'succeeded')).toBe(true);
    });

    expect(generatePresetImage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ styleOptionId: 'style-one' }),
    );
    expect(generatePresetImage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ styleOptionId: 'style-two' }),
    );
    expect(addImageMock).toHaveBeenCalledTimes(2);
  });
});
