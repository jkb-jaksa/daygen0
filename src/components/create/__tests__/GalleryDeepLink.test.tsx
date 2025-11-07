/* @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GalleryProvider, useGallery } from '../contexts/GalleryContext';
import { GenerationProvider } from '../contexts/GenerationContext';
import { useGalleryActions } from '../hooks/useGalleryActions';
import FullImageModal from '../FullImageModal';
import { ToastContext } from '../../../contexts/ToastContext';
import type { GalleryImageLike } from '../types';

const mockLocation = {
  pathname: '/create/image',
  search: '',
  hash: '',
  state: null,
  key: 'default',
};
const mockNavigate = vi.fn((path: unknown, options?: { replace?: boolean; state?: unknown }) => {
  if (typeof path === 'string') {
    const url = new URL(path, 'http://localhost');
    mockLocation.pathname = url.pathname;
    mockLocation.search = url.search ?? '';
    mockLocation.state = options?.state ?? null;
  }
  return null;
});

vi.mock('react-router-dom', () => ({
  useLocation: () => mockLocation,
  useNavigate: () => mockNavigate,
}));

// Mock auth to avoid requiring AuthProvider
vi.mock('../../../auth/useAuth', () => ({
  useAuth: () => ({ 
    user: { id: 'test-user', email: 'test@example.com' },
    storagePrefix: 'test-user',
  }),
}));

const now = new Date().toISOString();
const mockGalleryImages: GalleryImageLike[] = [
  {
    url: 'https://example.com/image.jpg',
    prompt: 'test',
    model: 'gemini-2.5-flash-image',
    jobId: 'abc',
    r2FileId: 'r2-primary',
    timestamp: now,
  },
  {
    url: 'https://example.com/r2-only.jpg',
    prompt: 'fallback',
    model: 'flux',
    r2FileId: 'r2-fallback',
    timestamp: new Date(Date.now() - 1000).toISOString(),
  },
  {
    url: 'https://example.com/url-only.jpg',
    prompt: 'url-only',
    model: 'flux',
    timestamp: new Date(Date.now() - 2000).toISOString(),
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
      <div data-testid="identifier">
        {state.fullSizeImage?.jobId ??
          state.fullSizeImage?.r2FileId ??
          state.fullSizeImage?.url ??
          ''}
      </div>
    </div>
  );
}

function ClickTester({ image }: { image: GalleryImageLike }) {
  const { handleImageClick } = useGalleryActions();
  return (
    <button type="button" onClick={() => handleImageClick(image, 0)}>
      open
    </button>
  );
}

function renderWithProviders(children: React.ReactNode) {
  return render(
    <GenerationProvider>
      <ToastContext.Provider value={{ showToast: vi.fn() }}>
        <GalleryProvider>{children}</GalleryProvider>
      </ToastContext.Provider>
    </GenerationProvider>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockLocation.pathname = '/create/image';
  mockLocation.search = '';
  mockLocation.state = null;
});

describe('Gallery deep link hydration', () => {
  it('opens full-size modal for /job/:jobId', async () => {
    mockLocation.pathname = '/job/abc';

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
    expect(screen.getByTestId('identifier').textContent).toBe('abc');
  });

  it('hydrates modal when /job identifier matches r2FileId', async () => {
    mockLocation.pathname = '/job/r2-fallback';

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
    expect(screen.getByTestId('job').textContent).toBe('');
    expect(screen.getByTestId('identifier').textContent).toBe('r2-fallback');
  });

  it('hydrates modal when /job identifier encodes image URL', async () => {
    const targetUrl = mockGalleryImages[2]!.url;
    mockLocation.pathname = `/job/${encodeURIComponent(targetUrl)}`;

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
    expect(screen.getByTestId('identifier').textContent).toBe(targetUrl);
  });
});

describe('Gallery action navigation fallbacks', () => {
  it('navigates with r2FileId when jobId missing', () => {
    renderWithProviders(<ClickTester image={mockGalleryImages[1]!} />);

    fireEvent.click(screen.getByRole('button', { name: /open/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/job/r2-fallback', expect.objectContaining({
      replace: false,
      state: { jobOrigin: '/create/image' },
    }));
  });

  it('encodes URL when neither jobId nor r2FileId exist', () => {
    const image = mockGalleryImages[2]!;

    renderWithProviders(<ClickTester image={image} />);

    fireEvent.click(screen.getByRole('button', { name: /open/i }));

    expect(mockNavigate).toHaveBeenCalledWith(
      `/job/${encodeURIComponent(image.url)}`,
      expect.objectContaining({
        replace: false,
        state: { jobOrigin: '/create/image' },
      }),
    );
  });
});

describe('FullImageModal navigation sync', () => {
  it('updates the job route when using next arrow navigation', async () => {
    renderWithProviders(
      <>
        <ClickTester image={mockGalleryImages[0]!} />
        <FullImageModal />
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: /open/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Next image/i)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });
    mockNavigate.mockClear();

    fireEvent.click(screen.getByLabelText(/Next image/i));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/job/r2-fallback',
        expect.objectContaining({
          replace: false,
          state: expect.objectContaining({
            jobOrigin: expect.any(String),
          }),
        }),
      );
    });
  });
});
