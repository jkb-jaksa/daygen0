/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { GalleryProvider, useGallery } from '../contexts/GalleryContext';
import { GenerationProvider } from '../contexts/GenerationContext';

vi.mock('../../../hooks/useGalleryImages', () => {
  const now = new Date().toISOString();
  return {
    useGalleryImages: () => ({
      images: [
        {
          url: 'https://example.com/image.jpg',
          prompt: 'test',
          model: 'gemini-2.5-flash-image',
          jobId: 'abc',
          timestamp: now,
        },
      ],
      isLoading: false,
      error: null,
      hasBase64Images: false,
      needsMigration: false,
      fetchGalleryImages: vi.fn(),
      updateImages: vi.fn(),
      removeImages: vi.fn(),
      deleteImage: vi.fn().mockResolvedValue(true),
    }),
  };
});

function Probe() {
  const { state } = useGallery();
  return (
    <div>
      <div data-testid="open">{state.isFullSizeOpen ? 'open' : 'closed'}</div>
      <div data-testid="job">{state.fullSizeImage?.jobId ?? ''}</div>
    </div>
  );
}

describe('Gallery deep link hydration', () => {
  it('opens full-size modal for /job/:jobId in v2 mode', async () => {
    render(
      <MemoryRouter initialEntries={["/job/abc?v2=1"]}>
        <GenerationProvider>
          <GalleryProvider>
            <Routes>
              <Route path="/job/:jobId" element={<Probe />} />
            </Routes>
          </GalleryProvider>
        </GenerationProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('open').textContent).toBe('open');
    });
    expect(screen.getByTestId('job').textContent).toBe('abc');
  });
});


