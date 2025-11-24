/* @vitest-environment jsdom */
import React, { useRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GalleryProvider, useGallery } from '../contexts/GalleryContext';
import { GenerationProvider } from '../contexts/GenerationContext';
import { useGalleryActions } from '../hooks/useGalleryActions';
import FullImageModal from '../FullImageModal';
import { ToastContext } from '../../../contexts/ToastContext';
import type { GalleryImageLike } from '../types';
import { CreateBridgeProvider, type GalleryBridgeActions } from '../contexts/CreateBridgeContext';

const mockLocation = {
  pathname: '/app/image',
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
  } else if (path && typeof path === 'object') {
    const target = path as { pathname?: string; search?: string };
    if (typeof target.pathname === 'string') {
      mockLocation.pathname = target.pathname;
    }
    if (typeof target.search === 'string') {
      const trimmed = target.search.trim();
      if (!trimmed) {
        mockLocation.search = '';
      } else if (trimmed.startsWith('?')) {
        mockLocation.search = trimmed;
      } else {
        mockLocation.search = `?${trimmed}`;
      }
    }
  }
  mockLocation.state = options?.state ?? null;
  return null;
});

vi.mock('react-router-dom', () => ({
  useLocation: () => mockLocation,
  useNavigate: () => mockNavigate,
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode; [key: string]: unknown }) => {
    return React.createElement('a', { href: to, ...props }, children);
  },
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
    model: 'gemini-3.0-pro-image',
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

const mockFetchGalleryImages = vi.fn().mockResolvedValue(undefined);

vi.mock('../../../hooks/useGalleryImages', () => ({
  useGalleryImages: () => ({
    images: mockGalleryImages,
    isLoading: false,
    error: null,
    hasBase64Images: false,
    needsMigration: false,
    fetchGalleryImages: mockFetchGalleryImages,
    updateImages: vi.fn().mockResolvedValue(undefined),
    removeImages: vi.fn().mockResolvedValue(undefined),
    deleteImage: vi.fn().mockResolvedValue(true),
  }),
}));

// Mock clientStorage to prevent IndexedDB hangs
vi.mock('../../../lib/clientStorage', () => ({
  getPersistedValue: vi.fn().mockResolvedValue(null),
  setPersistedValue: vi.fn().mockResolvedValue(undefined),
  removePersistedValue: vi.fn().mockResolvedValue(undefined),
}));

// Mock API module to prevent actual API calls
vi.mock('../../../utils/api', () => ({
  apiFetch: vi.fn(),
  getApiUrl: vi.fn((path: string) => path),
  API_BASE_URL: '',
}));

const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

afterAll(() => {
  consoleLogSpy.mockRestore();
  consoleInfoSpy.mockRestore();
});

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
  const TestWrapper = () => {
    const bridgeRef = useRef<GalleryBridgeActions>({
      setPromptFromGallery: vi.fn(),
      setReferenceFromUrl: vi.fn(),
      focusPromptInput: vi.fn(),
      isInitialized: true,
    });

    return (
      <GenerationProvider>
        <ToastContext.Provider value={{ showToast: vi.fn() }}>
          <CreateBridgeProvider value={bridgeRef}>
            <GalleryProvider>{children}</GalleryProvider>
          </CreateBridgeProvider>
        </ToastContext.Provider>
      </GenerationProvider>
    );
  };

  return render(<TestWrapper />);
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockFetchGalleryImages.mockClear();
  mockLocation.pathname = '/app/image';
  mockLocation.search = '';
  mockLocation.state = null;
});

describe('Gallery deep link hydration', () => {
  it('opens full-size modal when jobId query param targets a jobId', async () => {
    mockLocation.pathname = '/app/image';
    mockLocation.search = '?jobId=abc';

    render(
      <GenerationProvider>
        <GalleryProvider>
          <Probe />
        </GalleryProvider>
      </GenerationProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByTestId('open').textContent).toBe('open');
      },
      { timeout: 5000 },
    );
    expect(screen.getByTestId('job').textContent).toBe('abc');
    expect(screen.getByTestId('identifier').textContent).toBe('abc');
  });

  it('hydrates modal when query param matches r2FileId', async () => {
    mockLocation.pathname = '/app/image';
    mockLocation.search = '?jobId=r2-fallback';

    render(
      <GenerationProvider>
        <GalleryProvider>
          <Probe />
        </GalleryProvider>
      </GenerationProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByTestId('open').textContent).toBe('open');
      },
      { timeout: 5000 },
    );
    expect(screen.getByTestId('job').textContent).toBe('');
    expect(screen.getByTestId('identifier').textContent).toBe('r2-fallback');
  });

  it('hydrates modal when query param encodes image URL', async () => {
    const targetUrl = mockGalleryImages[2]!.url;
    mockLocation.pathname = '/app/image';
    mockLocation.search = `?jobId=${encodeURIComponent(targetUrl)}`;

    render(
      <GenerationProvider>
        <GalleryProvider>
          <Probe />
        </GalleryProvider>
      </GenerationProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByTestId('open').textContent).toBe('open');
      },
      { timeout: 5000 },
    );
    expect(screen.getByTestId('identifier').textContent).toBe(targetUrl);
  });

  it('still hydrates for legacy /job/:jobId routes', async () => {
    mockLocation.pathname = '/job/abc';
    mockLocation.search = '';

    render(
      <GenerationProvider>
        <GalleryProvider>
          <Probe />
        </GalleryProvider>
      </GenerationProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByTestId('open').textContent).toBe('open');
      },
      { timeout: 5000 },
    );
    expect(screen.getByTestId('job').textContent).toBe('abc');
    expect(screen.getByTestId('identifier').textContent).toBe('abc');
  });
});

describe('Gallery action navigation fallbacks', () => {
  it('navigates with r2FileId when jobId missing', async () => {
    renderWithProviders(<ClickTester image={mockGalleryImages[1]!} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /open/i }));
    });

    const lastCall = mockNavigate.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe('/job/r2-fallback');
    expect(lastCall?.[1]).toMatchObject({
      replace: false,
      state: { jobOrigin: '/app/image' },
    });
    expect(mockLocation.pathname).toBe('/job/r2-fallback');
    expect(mockLocation.search).toBe('');
  });

  it('encodes URL when neither jobId nor r2FileId exist', async () => {
    const image = mockGalleryImages[2]!;

    renderWithProviders(<ClickTester image={image} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /open/i }));
    });

    const lastCall = mockNavigate.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe(`/job/${encodeURIComponent(image.url)}`);
    expect(lastCall?.[1]).toMatchObject({
      replace: false,
      state: { jobOrigin: '/app/image' },
    });
    expect(mockLocation.pathname).toBe(`/job/${encodeURIComponent(image.url)}`);
    expect(mockLocation.search).toBe('');
  });
});

describe('Immediate modal open behavior', () => {
  it('keeps the modal open while jobId query param is still pending', async () => {
    renderWithProviders(
      <>
        <ClickTester image={mockGalleryImages[0]!} />
        <Probe />
      </>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /open/i }));
    });

    await waitFor(
      () => {
        expect(screen.getByTestId('open').textContent).toBe('open');
        expect(screen.getByTestId('identifier').textContent).toBe('abc');
      },
      { timeout: 5000 },
    );
    expect(mockLocation.pathname).toBe('/job/abc');
    expect(mockLocation.search).toBe('');
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

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /open/i }));
    });

    await waitFor(
      () => {
        expect(screen.getByLabelText(/Next image/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );
    mockNavigate.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByLabelText(/Next image/i));
    });

    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalled();
      },
      { timeout: 5000 },
    );

    const lastCall = mockNavigate.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe('/job/r2-fallback');
    expect(lastCall?.[1]).toMatchObject({
      replace: false,
      state: expect.objectContaining({
        jobOrigin: expect.any(String),
      }),
    });
    expect(mockLocation.pathname).toBe('/job/r2-fallback');
    expect(mockLocation.search).toBe('');
  });
});
