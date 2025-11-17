/* @vitest-environment jsdom */
import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { GalleryProvider, useGallery } from '../contexts/GalleryContext';
import { GenerationProvider, useGeneration } from '../contexts/GenerationContext';
import { useCreateGenerationController } from '../hooks/useCreateGenerationController';
import type { StoredAvatar } from '../../avatars/types';
import type { StoredProduct } from '../../products/types';

const mockGeminiGenerate = vi.fn().mockResolvedValue({
  url: 'https://example.com/gemini.jpg',
  jobId: 'job-image-1',
});

const mockAvatarHandlers = {
  selectedAvatar: null as StoredAvatar | null,
  activeAvatarImageId: null,
  avatarButtonRef: { current: null },
  handleAvatarPickerOpen: vi.fn(),
  handleAvatarSelect: vi.fn(),
  loadStoredAvatars: vi.fn(),
};

const mockProductHandlers = {
  selectedProduct: null as StoredProduct | null,
  productButtonRef: { current: null },
  handleProductPickerOpen: vi.fn(),
  handleProductSelect: vi.fn(),
  loadStoredProducts: vi.fn(),
};

// Mock auth to avoid requiring AuthProvider
vi.mock('../../../auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user', email: 'test@example.com' } }),
}));

// Mock gallery images service to avoid real I/O
vi.mock('../../../hooks/useGalleryImages', () => ({
  useGalleryImages: () => ({
    images: [],
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

// Avoid auth dependency by mocking avatar/product handlers
vi.mock('../hooks/useAvatarHandlers', () => ({
  useAvatarHandlers: () => mockAvatarHandlers,
}));
vi.mock('../hooks/useProductHandlers', () => ({
  useProductHandlers: () => mockProductHandlers,
}));

// Mock provider hooks used by the controller
vi.mock('../../../hooks/useGeminiImageGeneration', () => ({
  useGeminiImageGeneration: () => ({
    generateImage: mockGeminiGenerate,
    isLoading: false,
  }),
}));
vi.mock('../../../hooks/useFluxImageGeneration', () => ({ useFluxImageGeneration: () => ({ generateImage: vi.fn(), isLoading: false }) }));
vi.mock('../../../hooks/useChatGPTImageGeneration', () => ({ useChatGPTImageGeneration: () => ({ generateImage: vi.fn(), isLoading: false }) }));
vi.mock('../../../hooks/useIdeogramImageGeneration', () => ({ useIdeogramImageGeneration: () => ({ generateImage: vi.fn(), isLoading: false }) }));
vi.mock('../../../hooks/useQwenImageGeneration', () => ({ useQwenImageGeneration: () => ({ generateImage: vi.fn(), isLoading: false }) }));
vi.mock('../../../hooks/useRunwayImageGeneration', () => ({ useRunwayImageGeneration: () => ({ generateImage: vi.fn(), isLoading: false }) }));
vi.mock('../../../hooks/useReveImageGeneration', () => ({ useReveImageGeneration: () => ({ generateImage: vi.fn(), isLoading: false }) }));
vi.mock('../../../hooks/useLumaImageGeneration', () => ({ useLumaImageGeneration: () => ({ generateImage: vi.fn(), isLoading: false }) }));
vi.mock('../../../hooks/useVeoVideoGeneration', () => ({ useVeoVideoGeneration: () => ({ startGeneration: vi.fn(), isLoading: false }) }));
vi.mock('../../../hooks/useRunwayVideoGeneration', () => ({ useRunwayVideoGeneration: () => ({ status: 'idle', generate: vi.fn() }) }));
vi.mock('../../../hooks/useWanVideoGeneration', () => ({ useWanVideoGeneration: () => ({ status: 'idle', generateVideo: vi.fn().mockResolvedValue({ url: 'https://example.com/wan.mp4', jobId: 'job-video-1', type: 'video' }) }) }));
vi.mock('../../../hooks/useHailuoVideoGeneration', () => ({ useHailuoVideoGeneration: () => ({ status: 'idle', generateVideo: vi.fn() }) }));
vi.mock('../../../hooks/useKlingVideoGeneration', () => ({ useKlingVideoGeneration: () => ({ status: 'idle', generateVideo: vi.fn() }) }));
vi.mock('../../../hooks/useSeedanceVideoGeneration', () => ({ useSeedanceVideoGeneration: () => ({ isLoading: false, generateVideo: vi.fn() }) }));
vi.mock('../../../hooks/useLumaVideoGeneration', () => ({ useLumaVideoGeneration: () => ({ isLoading: false, generate: vi.fn() }) }));

function TriggerImage() {
  const { state } = useGallery();
  const controller = useCreateGenerationController();
  useEffect(() => {
    controller.promptHandlers.handlePromptChange('a scenic lake');
    void controller.handleGenerate();
  }, [controller]);
  return <div data-testid="img-count">{state.images.length}</div>;
}

function TriggerVideo() {
  const { state } = useGallery();
  const controller = useCreateGenerationController();
  const { setSelectedModel } = useGeneration();
  useEffect(() => {
    setSelectedModel('wan-video-2.2');
    controller.promptHandlers.handlePromptChange('a moving car');
    void controller.handleGenerate();
  }, [controller, setSelectedModel]);
  return <div data-testid="vid-count">{state.videos.length}</div>;
}

describe('useCreateGenerationController', () => {
  beforeEach(() => {
    mockGeminiGenerate.mockClear();
    mockAvatarHandlers.selectedAvatar = null;
    mockProductHandlers.selectedProduct = null;
  });

  it('adds an image to gallery after generation (gemini)', async () => {
    render(
      <MemoryRouter>
        <GenerationProvider>
          <GalleryProvider>
            <TriggerImage />
          </GalleryProvider>
        </GenerationProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('img-count').textContent).toBe('1');
    });
  });

  it('adds a video to gallery after generation (wan)', async () => {
    render(
      <MemoryRouter>
        <GenerationProvider>
          <GalleryProvider>
            <TriggerVideo />
          </GalleryProvider>
        </GenerationProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('vid-count').textContent).toBe('1');
    });
  });

  it('passes avatar and product identifiers to generation payloads', async () => {
    mockAvatarHandlers.selectedAvatar = {
      id: 'avatar-123',
      slug: 'hero-avatar',
      name: 'Hero Avatar',
      imageUrl: 'https://example.com/avatar.png',
      createdAt: new Date().toISOString(),
      source: 'upload',
      published: false,
      ownerId: 'test-user',
      primaryImageId: 'avatar-img-1',
      images: [],
    };
    mockProductHandlers.selectedProduct = {
      id: 'product-456',
      slug: 'magic-product',
      name: 'Magic Product',
      imageUrl: 'https://example.com/product.png',
      createdAt: new Date().toISOString(),
      source: 'upload',
      published: false,
      ownerId: 'test-user',
      primaryImageId: 'product-img-1',
      images: [],
    };

    render(
      <MemoryRouter>
        <GenerationProvider>
          <GalleryProvider>
            <TriggerImage />
          </GalleryProvider>
        </GenerationProvider>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockGeminiGenerate).toHaveBeenCalled();
    });

    const payload = mockGeminiGenerate.mock.calls.at(-1)?.[0] ?? {};
    expect(payload.avatarId).toBe('avatar-123');
    expect(payload.productId).toBe('product-456');
  });
});


