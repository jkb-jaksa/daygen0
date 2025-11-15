import type { GalleryFilters } from '../types';

const STORAGE_KEY = 'daygen:pendingGalleryFilters';
const MAX_AGE_MS = 60_000;

type StoredBadgeFilters = {
  filters: GalleryFilters;
  timestamp: number;
};

const isBrowser = typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const sanitizeFilters = (filters: Partial<GalleryFilters>): GalleryFilters => ({
  liked: false,
  public: false,
  models: [],
  types: [],
  folder: '',
  avatar: '',
  product: '',
  style: '',
  ...filters,
});

export const savePendingBadgeFilters = (filters: Partial<GalleryFilters>): void => {
  if (!isBrowser) {
    return;
  }

  const payload: StoredBadgeFilters = {
    filters: sanitizeFilters(filters),
    timestamp: Date.now(),
  };

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const consumePendingBadgeFilters = (): GalleryFilters | null => {
  if (!isBrowser) {
    return null;
  }

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);

  try {
    const parsed = JSON.parse(raw) as StoredBadgeFilters;
    if (!parsed || !parsed.filters) {
      return null;
    }

    if (Date.now() - parsed.timestamp > MAX_AGE_MS) {
      return null;
    }

    return sanitizeFilters(parsed.filters);
  } catch {
    return null;
  }
};
