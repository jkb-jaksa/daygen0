import { memo, useMemo } from 'react';
import { Settings, Heart, Globe, X, Grid3X3 } from 'lucide-react';
import { glass, buttons } from '../../styles/designSystem';
import { useGallery } from './contexts/GalleryContext';
import { CustomDropdown } from './shared/CustomDropdown';
import { CustomMultiSelect } from './shared/CustomMultiSelect';

// AI Models list for filtering
const AI_MODELS = [
  { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash' },
  { id: 'flux-pro', name: 'Flux Pro' },
  { id: 'flux-1.1-pro', name: 'Flux 1.1 Pro' },
  { id: 'flux-dev', name: 'Flux Dev' },
  { id: 'flux-schnell', name: 'Flux Schnell' },
  { id: 'reve', name: 'Reve' },
  { id: 'ideogram', name: 'Ideogram' },
  { id: 'qwen', name: 'Qwen' },
  { id: 'runway-gen4', name: 'Runway Gen-4' },
  { id: 'chatgpt', name: 'ChatGPT / DALL·E' },
  { id: 'luma', name: 'Luma' },
  { id: 'veo-3', name: 'Veo 3' },
  { id: 'runway-video-gen4', name: 'Runway Gen-4 Video' },
  { id: 'wan-video-2.2', name: 'Wan 2.2' },
  { id: 'hailuo-02', name: 'Hailuo 02' },
  { id: 'kling-video', name: 'Kling' },
  { id: 'seedance-1.0-pro', name: 'Seedance 1.0 Pro' },
  { id: 'luma-ray-2', name: 'Luma Ray 2' },
] as const;

const GalleryFilters = memo(() => {
  const { state, setFilters, clearFilters, setBulkMode } = useGallery();
  const { filters, isBulkMode, selectedItems, images, videos } = state;

  // Get available models from gallery items
  const availableModels = useMemo(() => {
    const modelSet = new Set<string>();
    [...images, ...videos].forEach(item => {
      if (item.model) {
        modelSet.add(item.model);
      }
    });
    return Array.from(modelSet)
      .map(modelId => {
        const model = AI_MODELS.find(m => m.id === modelId);
        return { value: modelId, label: model?.name || modelId };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [images, videos]);

  // Get available avatars (stub - would come from user's avatars)
  const availableAvatars = useMemo(() => {
    const avatarSet = new Set<string>();
    [...images, ...videos].forEach(item => {
      if (item.avatarId) {
        avatarSet.add(item.avatarId);
      }
    });
    return [
      { value: 'all', label: 'All avatars' },
      ...Array.from(avatarSet).map(id => ({ value: id, label: `Avatar ${id.substring(0, 8)}` }))
    ];
  }, [images, videos]);

  // Get available products (stub - would come from user's products)
  const availableProducts = useMemo(() => {
    const productSet = new Set<string>();
    [...images, ...videos].forEach(item => {
      if (item.productId) {
        productSet.add(item.productId);
      }
    });
    return [
      { value: 'all', label: 'All products' },
      ...Array.from(productSet).map(id => ({ value: id, label: `Product ${id.substring(0, 8)}` }))
    ];
  }, [images, videos]);

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

  const handleToggleBulkMode = () => {
    setBulkMode(!isBulkMode);
  };

  return (
    <div className="mb-4 space-y-3">
      {/* Bulk Mode Banner */}
      {isBulkMode && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-theme-accent/10 border border-theme-accent/20">
          <div className="flex items-center gap-3">
            <Grid3X3 className="w-4 h-4 text-theme-accent" />
            <span className="text-sm text-theme-accent font-medium">
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <button
            onClick={handleToggleBulkMode}
            className={`${buttons.ghost} text-sm`}
          >
            Exit Bulk Mode
          </button>
        </div>
      )}

      {/* Filters Panel */}
      <div className={`p-3 ${glass.promptDark} rounded-2xl`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-theme-text" />
            <h3 className="text-sm font-raleway text-theme-white">Filters</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleBulkMode}
              className={`px-2.5 py-1 text-xs transition-colors duration-200 font-raleway ${
                isBulkMode 
                  ? "text-theme-accent bg-theme-accent/10 rounded border border-theme-accent/20"
                  : "text-theme-white hover:text-theme-text"
              }`}
            >
              {isBulkMode ? 'Bulk Mode' : 'Select'}
            </button>
            <button
              onClick={handleClearFilters}
              className="px-2.5 py-1 text-xs transition-colors duration-200 font-raleway text-theme-white hover:text-theme-text"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Liked/Public filters */}
        <div className="mb-3">
          <label className="text-xs text-theme-white/70 font-raleway mb-1.5 block">Quick Filters</label>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleToggleLiked}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors duration-200 ${glass.promptDark} font-raleway text-sm ${
                filters.liked
                  ? "text-theme-text border-theme-mid bg-theme-white/10"
                  : "text-theme-white border-theme-dark hover:border-theme-mid hover:text-theme-text"
              }`}
            >
              <Heart className={`w-4 h-4 ${filters.liked ? "fill-red-500 text-red-500" : "text-current fill-none"}`} />
              <span>Liked</span>
            </button>
            <button
              onClick={handleTogglePublic}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors duration-200 ${glass.promptDark} font-raleway text-sm ${
                filters.public
                  ? "text-theme-text border-theme-mid bg-theme-white/10"
                  : "text-theme-white border-theme-dark hover:border-theme-mid hover:text-theme-text"
              }`}
            >
              <Globe className={`w-4 h-4 ${filters.public ? "text-theme-text" : "text-current"}`} />
              <span>Public</span>
            </button>
          </div>
        </div>

        {/* Advanced filters grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Modality Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-theme-white/70 font-raleway">Modality</label>
            <CustomMultiSelect
              values={filters.types}
              onChange={types => setFilters({ types, models: [] })}
              options={[
                { value: "image", label: "Image" },
                { value: "video", label: "Video" },
              ]}
              placeholder="All modalities"
            />
            {/* Selected Modality Tags */}
            {filters.types.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {filters.types.map(type => (
                  <div
                    key={type}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-theme-text/20 text-theme-white rounded-full text-xs font-raleway border border-theme-text/30"
                  >
                    <span>{type === "image" ? "Image" : "Video"}</span>
                    <button
                      type="button"
                      onClick={() => setFilters({ types: filters.types.filter(t => t !== type), models: [] })}
                      className="transition-colors duration-200 hover:text-theme-text"
                      aria-label={`Remove ${type === "image" ? "Image" : "Video"}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
              <div className="flex flex-wrap gap-1.5 mt-1">
                {filters.models.map(modelId => {
                  const model = AI_MODELS.find(m => m.id === modelId);
                  return (
                    <div
                      key={modelId}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-theme-text/20 text-theme-white rounded-full text-xs font-raleway border border-theme-text/30"
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
              <div className="flex flex-wrap gap-1.5 mt-1">
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-theme-text/20 text-theme-white rounded-full text-xs font-raleway border border-theme-text/30">
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
              <div className="flex flex-wrap gap-1.5 mt-1">
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-theme-text/20 text-theme-white rounded-full text-xs font-raleway border border-theme-text/30">
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
      </div>
    </div>
  );
});

GalleryFilters.displayName = 'GalleryFilters';

export default GalleryFilters;
