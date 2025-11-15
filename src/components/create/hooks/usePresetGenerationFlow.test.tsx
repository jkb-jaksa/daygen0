/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePresetGenerationFlow } from './usePresetGenerationFlow';
import { generatePresetImage } from '../../../api/presetGeneration';
import type { StyleOption } from './useStyleHandlers';

vi.mock('../../../api/presetGeneration', () => ({
  generatePresetImage: vi.fn(),
}));

const addImageMock = vi.fn().mockResolvedValue(undefined);

vi.mock('../contexts/GalleryContext', () => ({
  useGallery: () => ({
    addImage: addImageMock,
  }),
}));

const mockedGeneratePreset = vi.mocked(generatePresetImage);

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
    const { result } = renderHook(() => usePresetGenerationFlow());

    act(() => {
      result.current.openForStyles(mockStyles);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.jobs).toHaveLength(2);
    expect(result.current.jobs[0].style.id).toBe('style-one');
  });

  it('generates an image for each style and records gallery entries', async () => {
    mockedGeneratePreset
      .mockResolvedValueOnce({
        success: true,
        template: { id: 't-one', title: 'Style One' },
        prompt: 'Prompt 1',
        imageUrl: 'https://cdn.example.com/result-one.png',
        r2FileId: 'r2-1',
      })
      .mockResolvedValueOnce({
        success: true,
        template: { id: 't-two', title: 'Style Two' },
        prompt: 'Prompt 2',
        imageUrl: 'https://cdn.example.com/result-two.png',
        r2FileId: 'r2-2',
      });

    const { result } = renderHook(() => usePresetGenerationFlow());

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
