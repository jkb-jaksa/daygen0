import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { StoredAvatar } from '../../avatars/types';
import type { StoredProduct } from '../../products/types';
import type { GalleryFilters } from '../types';
import { useGallery } from '../contexts/GalleryContext';
import { savePendingBadgeFilters } from './badgeNavigationStorage';

const RESET_FILTERS_FOR_BADGES: GalleryFilters = {
  liked: false,
  public: false,
  models: [],
  types: [],
  folder: '',
  avatar: '',
  product: '',
  style: '',
};

export function useBadgeNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setFilters } = useGallery();

  const applyGalleryFilters = useCallback(
    (overrides: Partial<GalleryFilters>) => {
      setFilters({
        ...RESET_FILTERS_FOR_BADGES,
        ...overrides,
      });
    },
    [setFilters],
  );

  const goToGalleryWithFilters = useCallback(
    (overrides: Partial<GalleryFilters>) => {
      const nextFilters = {
        ...RESET_FILTERS_FOR_BADGES,
        ...overrides,
      };

      applyGalleryFilters(nextFilters);

      const isAlreadyOnGalleryRoute = location.pathname.startsWith('/app/gallery') || location.pathname.startsWith('/gallery');
      if (!isAlreadyOnGalleryRoute) {
        savePendingBadgeFilters(nextFilters);
      }

      navigate('/app/gallery');
    },
    [applyGalleryFilters, navigate, location.pathname],
  );

  const goToPublicGallery = useCallback(() => {
    goToGalleryWithFilters({ public: true });
  }, [goToGalleryWithFilters]);

  const goToModelGallery = useCallback(
    (modelId?: string | null, type?: 'image' | 'video') => {
      if (!modelId) {
        return;
      }
      goToGalleryWithFilters({
        models: [modelId],
        types: type ? [type] : [],
      });
    },
    [goToGalleryWithFilters],
  );

  const goToAvatarProfile = useCallback(
    (avatar?: StoredAvatar | null) => {
      if (!avatar?.slug) {
        return;
      }
      navigate(`/app/avatars/${avatar.slug}`);
    },
    [navigate],
  );

  const goToProductProfile = useCallback(
    (product?: StoredProduct | null) => {
      if (!product?.slug) {
        return;
      }
      navigate(`/app/products/${product.slug}`);
    },
    [navigate],
  );

  return {
    goToAvatarProfile,
    goToProductProfile,
    goToPublicGallery,
    goToModelGallery,
  };
}

export default useBadgeNavigation;
