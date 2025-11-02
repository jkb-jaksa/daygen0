/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { GalleryProvider, useGallery } from '../contexts/GalleryContext';
import { GenerationProvider } from '../contexts/GenerationContext';

const mockLocation = {
  pathname: '/create/image',
  search: '',
  hash: '',
  state: null,
  key: 'default',
};

vi.mock('react-router-dom', () => ({
  useLocation: () => mockLocation,
}));

const now = new Date().toISOString();
const mockGalleryImages = [
  {
    url: 'https://example.com/image.jpg',
    prompt: 'test',
    model: 'gemini-2.5-flash-image',
    jobId: 'abc',
    timestamp: now,
  },
];

vi.mock('../../../hooks/useGalleryImages', () => ({
  useGalleryImages: () => ({
    images: mockGalleryImages,
    isLoading: false,
    error: null,
    hasBase64Images: false,
    needsMigration: false,
    fetchGalleryImages: vi.fn(),
    updateImages: vi.fn(),
    removeImages: vi.fn(),
    deleteImage: vi.fn().mockResolvedValue(true),
  }),
}));

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
  it('opens full-size modal for /job/:jobId', async () => {
    mockLocation.pathname = '/job/abc';
    mockLocation.search = '';

    render(
      <GenerationProvider>
        <GalleryProvider>
          <Probe />
        </GalleryProvider>
      </GenerationProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('open').textContent).toBe('open');
    });
    expect(screen.getByTestId('job').textContent).toBe('abc');

    // Reset mock location for other tests
    mockLocation.pathname = '/create/image';
    mockLocation.search = '';
  });
});
