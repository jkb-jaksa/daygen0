import { memo, useMemo, useState, useEffect } from 'react';
import { Settings, Heart, Globe, X, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { glass } from '../../styles/designSystem';
import { useGallery } from './contexts/GalleryContext';
import { CustomDropdown } from './shared/CustomDropdown';
import { CustomMultiSelect } from './shared/CustomMultiSelect';
import { useAuth } from '../../auth/useAuth';
import { getPersistedValue } from '../../lib/clientStorage';
import { normalizeStoredAvatars } from '../../utils/avatars';
import { normalizeStoredProducts } from '../../utils/products';
import type { StoredAvatar } from '../avatars/types';
import type { StoredProduct } from '../products/types';
import { AI_MODELS } from './ModelSelector';
import { isVideoModelId } from './constants';
import { getAspectRatiosForModels, getAllAvailableAspectRatios } from '../../utils/aspectRatioUtils';

const GalleryFilters = memo(() => {
  const { state, setFilters, clearFilters } = useGallery();
  const { filters } = state;
  const { user, storagePrefix } = useAuth();
  const [storedAvatars, setStoredAvatars] = useState<StoredAvatar[]>([]);
  const [storedProducts, setStoredProducts] = useState<StoredProduct[]>([]);

  // Load avatars and products from storage
  useEffect(() => {
    if (!storagePrefix) return;

    const loadData = async () => {
      try {
        const avatars = await getPersistedValue<StoredAvatar[]>(storagePrefix, 'avatars');
        if (avatars) {
          setStoredAvatars(normalizeStoredAvatars(avatars, { ownerId: user?.id }));
        }

        const products = await getPersistedValue<StoredProduct[]>(storagePrefix, 'products');
        if (products) {
          setStoredProducts(normalizeStoredProducts(products, { ownerId: user?.id }));
        }
      } catch {
        // Silently fail - filters will just be empty
      }
    };

    void loadData();
  }, [storagePrefix, user?.id]);

  // Get available models - use static AI_MODELS list, filter by modality
  const availableModels = useMemo(() => {
    let modelList = AI_MODELS;

    if (filters.types.length === 1) {
      if (filters.types.includes('video')) {
        modelList = AI_MODELS.filter(model => isVideoModelId(model.id));
      } else if (filters.types.includes('image')) {
        modelList = AI_MODELS.filter(model => !isVideoModelId(model.id));
      }
    }

    return modelList
      .map(model => ({ value: model.id, label: model.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filters.types]);

  // Get available aspect ratios based on selected models
  const availableAspectRatios = useMemo(() => {
    if (filters.models.length === 0) {
      // If no models selected, show all available aspect ratios
      return getAllAvailableAspectRatios();
    }
    // Otherwise, show only aspect ratios available for selected models
    return getAspectRatiosForModels(filters.models);
  }, [filters.models]);

  // Get available avatars from user's stored avatars
  const availableAvatars = useMemo(() => {
    return [
      { value: 'all', label: 'All avatars' },
      ...storedAvatars.map(avatar => ({ value: avatar.id, label: avatar.name }))
    ];
  }, [storedAvatars]);

  // Get available products from user's stored products
  const availableProducts = useMemo(() => {
    return [
      { value: 'all', label: 'All products' },
      ...storedProducts.map(product => ({ value: product.id, label: product.name }))
    ];
  }, [storedProducts]);

  // Get available folders (stub - would come from folders state)
  const availableFolders = useMemo(() => {
    return [
      { value: 'all', label: 'All folders' },
      // Add actual folders here when folder management is implemented
    ];
  }, []);

  const handleToggleLiked = () => {
    setFilters({ liked: !filters.liked });
  };

  const handleTogglePublic = () => {
    setFilters({ public: !filters.public });
  };

  const handleClearFilters = () => {
    clearFilters();
  };

  return (
    <div className="mb-4 space-y-3">
      {/* Filters Panel */}
      <div className={`p-3 ${glass.promptDark} rounded-2xl`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-theme-text" />
            <h3 className="text-sm font-raleway text-theme-white">Filters</h3>
          </div>
          <button
            onClick={handleClearFilters}
            className="px-2.5 py-1 text-xs transition-colors duration-200 font-raleway text-theme-white hover:text-theme-text"
          >
            Clear
          </button>
        </div>

        {/* Status / Modality filters */}
        <div className="mb-3">
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={handleToggleLiked}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors duration-200 ${glass.promptDark} font-raleway text-xs ${filters.liked
                ? "text-theme-text border-theme-mid bg-theme-white/10"
                : "text-theme-white border-theme-dark hover:border-theme-mid hover:text-theme-text"
                }`}
            >
              <Heart className={`w-3.5 h-3.5 ${filters.liked ? "fill-red-500 text-red-500" : "text-current fill-none"}`} />
              <span>Liked</span>
            </button>
            <button
              onClick={handleTogglePublic}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors duration-200 ${glass.promptDark} font-raleway text-xs ${filters.public
                ? "text-theme-text border-theme-mid bg-theme-white/10"
                : "text-theme-white border-theme-dark hover:border-theme-mid hover:text-theme-text"
                }`}
            >
              <Globe className={`w-3.5 h-3.5 ${filters.public ? "text-theme-text" : "text-current"}`} />
              <span>Public</span>
            </button>

            {/* Separator */}
            <div className="w-px h-6 bg-theme-white/10 mx-1 self-center" />

            <button
              onClick={() => {
                const newTypes = filters.types.includes('image')
                  ? filters.types.filter(t => t !== 'image')
                  : [...filters.types, 'image'];
                setFilters({ types: newTypes, models: [] });
              }}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors duration-200 ${glass.promptDark} font-raleway text-xs ${filters.types.includes('image')
                ? "text-theme-text border-theme-mid bg-theme-white/10"
                : "text-theme-white border-theme-dark hover:border-theme-mid hover:text-theme-text"
                }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Image</span>
            </button>
            <button
              onClick={() => {
                const newTypes = filters.types.includes('video')
                  ? filters.types.filter(t => t !== 'video')
                  : [...filters.types, 'video'];
                setFilters({ types: newTypes, models: [] });
              }}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors duration-200 ${glass.promptDark} font-raleway text-xs ${filters.types.includes('video')
                ? "text-theme-text border-theme-mid bg-theme-white/10"
                : "text-theme-white border-theme-dark hover:border-theme-mid hover:text-theme-text"
                }`}
            >
              <VideoIcon className="w-3.5 h-3.5" />
              <span>Video</span>
            </button>
          </div>
        </div>

        {/* Advanced filters grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-1">

          {/* Model Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-theme-white/70 font-raleway">Model</label>
            <CustomMultiSelect
              values={filters.models}
              onChange={models => setFilters({ models })}
              options={availableModels}
              placeholder="All models"
              disabled={availableModels.length === 0}
            />
            {/* Selected Model Tags */}
            {filters.models.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {filters.models.map(modelId => {
                  const model = AI_MODELS.find(m => m.id === modelId);
                  return (
                    <div
                      key={modelId}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-text/20 text-theme-white rounded-full text-xs font-raleway border border-theme-text/30"
                    >
                      <span>{model?.name || modelId}</span>
                      <button
                        type="button"
                        onClick={() => setFilters({ models: filters.models.filter(m => m !== modelId) })}
                        className="transition-colors duration-200 hover:text-theme-text"
                        aria-label={`Remove ${model?.name || modelId}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Avatar Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-theme-white/70 font-raleway">Avatar</label>
            <CustomDropdown
              value={filters.avatar}
              onChange={value => setFilters({ avatar: value })}
              options={availableAvatars}
              disabled={availableAvatars.length <= 1}
              placeholder={availableAvatars.length <= 1 ? "No avatars" : "All avatars"}
            />
            {/* Selected Avatar Tag */}
            {filters.avatar !== "all" && filters.avatar !== "" && (
              <div className="flex flex-wrap gap-2 mt-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-text/20 text-theme-white rounded-full text-xs font-raleway border border-theme-text/30">
                  <span>{availableAvatars.find(a => a.value === filters.avatar)?.label || filters.avatar}</span>
                  <button
                    type="button"
                    onClick={() => setFilters({ avatar: "all" })}
                    className="transition-colors duration-200 hover:text-theme-text"
                    aria-label="Remove avatar filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Product Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-theme-white/70 font-raleway">Product</label>
            <CustomDropdown
              value={filters.product}
              onChange={value => setFilters({ product: value })}
              options={availableProducts}
              disabled={availableProducts.length <= 1}
              placeholder={availableProducts.length <= 1 ? "No products" : "All products"}
            />
            {/* Selected Product Tag */}
            {filters.product !== "all" && filters.product !== "" && (
              <div className="flex flex-wrap gap-2 mt-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-text/20 text-theme-white rounded-full text-xs font-raleway border border-theme-text/30">
                  <span>{availableProducts.find(p => p.value === filters.product)?.label || filters.product}</span>
                  <button
                    type="button"
                    onClick={() => setFilters({ product: "all" })}
                    className="transition-colors duration-200 hover:text-theme-text"
                    aria-label="Remove product filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Aspect Ratio Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-theme-white/70 font-raleway">Aspect Ratio</label>
            <CustomMultiSelect
              values={filters.aspectRatios}
              onChange={aspectRatios => setFilters({ aspectRatios })}
              options={availableAspectRatios.map(ar => ({ value: ar.value, label: ar.label }))}
              placeholder="All ratios"
              disabled={availableAspectRatios.length === 0}
            />
            {/* Selected Aspect Ratio Tags */}
            {filters.aspectRatios.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {filters.aspectRatios.map(arValue => {
                  const arOption = availableAspectRatios.find(ar => ar.value === arValue);
                  return (
                    <div
                      key={arValue}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-text/20 text-theme-white rounded-full text-xs font-raleway border border-theme-text/30"
                    >
                      <span>{arOption?.label || arValue}</span>
                      <button
                        type="button"
                        onClick={() => setFilters({ aspectRatios: filters.aspectRatios.filter(ar => ar !== arValue) })}
                        className="transition-colors duration-200 hover:text-theme-text"
                        aria-label={`Remove ${arOption?.label || arValue}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Folder Filter - Full width below */}
        {availableFolders.length > 1 && (
          <div className="flex flex-col gap-1.5 mt-3">
            <label className="text-xs text-theme-white/70 font-raleway">Folder</label>
            <CustomDropdown
              value={filters.folder}
              onChange={value => setFilters({ folder: value })}
              options={availableFolders}
              placeholder="All folders"
            />
          </div>
        )}

        {/* Active Filter Tags - Only for filters without inline tags */}
        {(filters.liked || filters.public) && (
          <div className="mt-3 pt-3 border-t border-theme-dark/50">
            <div className="flex flex-wrap items-center gap-2">
              {filters.liked && (
                <button
                  onClick={() => setFilters({ liked: false })}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-theme-mid/30 text-theme-white text-xs font-raleway transition-colors duration-200 bg-theme-white/10 hover:bg-theme-white/20"
                >
                  <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                  <span>Liked</span>
                  <X className="w-3 h-3" />
                </button>
              )}

              {filters.public && (
                <button
                  onClick={() => setFilters({ public: false })}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-theme-mid/30 text-theme-white text-xs font-raleway transition-colors duration-200 bg-theme-white/10 hover:bg-theme-white/20"
                >
                  <Globe className="w-3 h-3" />
                  <span>Public</span>
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

GalleryFilters.displayName = 'GalleryFilters';

export default GalleryFilters;
