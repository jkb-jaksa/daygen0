import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Settings, Download, Copy, Heart, History, Trash2, FolderPlus } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import ModelBadge from './ModelBadge';
import { ShareButton } from './ShareButton';
import { getPersistedValue, setPersistedValue } from "../lib/clientStorage";
import { glass } from "../styles/designSystem";

// Types
type GalleryImageLike = {
  url: string;
  prompt: string;
  model?: string;
  timestamp: string;
  ownerId?: string;
  jobId?: string;
  references?: string[];
};

type Folder = {
  id: string;
  name: string;
  createdAt: Date;
  imageIds: string[];
};

type HistoryFilters = {
  liked: boolean;
  model: string;
  type: 'all' | 'image' | 'video';
  folder: string;
};

// AI Model data
const AI_MODELS = [
  { name: "Gemini 2.5 Flash Image", id: "gemini-2.5-flash-image-preview" },
  { name: "FLUX Pro 1.1", id: "flux-pro-1.1" },
  { name: "FLUX Pro 1.1 Ultra", id: "flux-pro-1.1-ultra" },
  { name: "FLUX Kontext Pro", id: "flux-kontext-pro" },
  { name: "FLUX Kontext Max", id: "flux-kontext-max" },
  { name: "Reve", id: "reve-image" },
  { name: "Ideogram 3.0", id: "ideogram" },
  { name: "Qwen Image", id: "qwen-image" },
  { name: "Runway Gen-4", id: "runway-gen4" },
];

export default function History() {
  const { user } = useAuth();
  const [gallery, setGallery] = useState<GalleryImageLike[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [folders, setFolders] = useState<Folder[]>([]);
  const [historyFilters, setHistoryFilters] = useState<HistoryFilters>({
    liked: false,
    model: 'all',
    type: 'all',
    folder: 'all'
  });
  const [selectedFullImage, setSelectedFullImage] = useState<GalleryImageLike | null>(null);
  const [isFullSizeOpen, setIsFullSizeOpen] = useState(false);
  const [copyNotification, setCopyNotification] = useState<string | null>(null);

  // Load data from storage
  useEffect(() => {
    if (!user) return;

    const userKey = user.id || user.email || "anon";
    const storagePrefix = `daygen_${userKey}_`;

    // Load gallery
    const storedGallery = getPersistedValue<GalleryImageLike[]>(`${storagePrefix}gallery`, []);
    setGallery(storedGallery);

    // Load favorites
    const storedFavorites = getPersistedValue<string[]>(`${storagePrefix}favorites`, []);
    setFavorites(new Set(storedFavorites));

    // Load folders
    const storedFolders = getPersistedValue<SerializedFolder[]>(`${storagePrefix}folders`, []);
    const hydratedFolders = storedFolders.map(f => ({
      ...f,
      createdAt: new Date(f.createdAt)
    }));
    setFolders(hydratedFolders);
  }, [user]);

  // Helper functions for filters
  const getAvailableModels = () => {
    if (historyFilters.type === 'video') {
      return [];
    } else if (historyFilters.type === 'image') {
      return AI_MODELS.map(model => model.id).sort();
    } else {
      return AI_MODELS.map(model => model.id).sort();
    }
  };

  const getAvailableFolders = () => {
    return folders.map(f => f.id);
  };

  // Filter function for history
  const filterGalleryItems = (items: typeof gallery) => {
    return items.filter(item => {
      // Liked filter
      if (historyFilters.liked && !favorites.has(item.url)) {
        return false;
      }
      
      // Model filter
      if (historyFilters.model !== 'all' && item.model !== historyFilters.model) {
        return false;
      }
      
      // Folder filter
      if (historyFilters.folder !== 'all') {
        const selectedFolder = folders.find(f => f.id === historyFilters.folder);
        if (!selectedFolder || !selectedFolder.imageIds.includes(item.url)) {
          return false;
        }
      }
      
      // Type filter (for now, we'll assume all items are images)
      if (historyFilters.type !== 'all' && historyFilters.type !== 'image') {
        return false;
      }
      
      return true;
    });
  };

  // Utility functions
  const copyPromptToClipboard = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyNotification('Prompt copied!');
      setTimeout(() => setCopyNotification(null), 2000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  const toggleFavorite = (url: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(url)) {
      newFavorites.delete(url);
    } else {
      newFavorites.add(url);
    }
    setFavorites(newFavorites);
    
    if (user) {
      const userKey = user.id || user.email || "anon";
      const storagePrefix = `daygen_${userKey}_`;
      setPersistedValue(`${storagePrefix}favorites`, Array.from(newFavorites));
    }
  };

  const confirmDeleteImage = (url: string) => {
    if (window.confirm('Are you sure you want to delete this image?')) {
      setGallery(prev => prev.filter(img => img.url !== url));
      
      if (user) {
        const userKey = user.id || user.email || "anon";
        const storagePrefix = `daygen_${userKey}_`;
        const updatedGallery = gallery.filter(img => img.url !== url);
        setPersistedValue(`${storagePrefix}gallery`, updatedGallery);
      }
    }
  };

  const handleAddToFolder = (url: string) => {
    // This would open a folder selection dialog
    // For now, just show an alert
    alert('Add to folder functionality would be implemented here');
  };

  const showHoverTooltip = (element: HTMLElement, tooltipId: string) => {
    const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`) as HTMLElement;
    if (tooltip) {
      tooltip.style.opacity = '1';
    }
  };

  const hideHoverTooltip = (tooltipId: string) => {
    const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`) as HTMLElement;
    if (tooltip) {
      tooltip.style.opacity = '0';
    }
  };

  // Render hover primary actions
  const renderHoverPrimaryActions = (id: string, img: GalleryImageLike) => {
    return (
      <div className="flex items-center gap-0.5">
        <button 
          type="button" 
          onClick={() => {
            setSelectedFullImage(img);
            setIsFullSizeOpen(true);
          }}
          className="image-action-btn" 
          title="View full size" 
          aria-label="View full size"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-raleway text-d-white/60 mb-2">Please log in to view your history</h2>
          <p className="text-base font-raleway text-d-white/40">Your generation history will appear here once you're logged in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="pt-20 pb-16">
        <div className="mx-auto max-w-[85rem] px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-raleway text-d-white mb-2">History</h1>
            <p className="text-base font-raleway text-d-white/60">View and manage your generated images</p>
          </div>

          {/* Filters Section */}
          <div className="mb-6 p-4 rounded-lg border border-d-dark bg-d-black/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-d-orange-1" />
                <h3 className="text-sm font-cabin text-d-white">Filters</h3>
              </div>
              <button
                onClick={() => setHistoryFilters({
                  liked: false,
                  model: 'all',
                  type: 'all',
                  folder: 'all'
                })}
                className="px-2.5 py-1 text-xs text-d-white hover:text-d-orange-1 transition-colors duration-200 font-raleway"
              >
                Clear
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Liked Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-d-white/70 font-raleway">Liked</label>
                <button
                  onClick={() => setHistoryFilters(prev => ({ ...prev, liked: !prev.liked }))}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors duration-200 ${glass.base} font-raleway text-sm ${
                    historyFilters.liked 
                      ? 'text-d-orange-1 border-d-orange-1' 
                      : 'text-d-white border-d-dark hover:border-d-orange-1'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${historyFilters.liked ? 'fill-red-500 text-red-500' : 'text-current fill-none'}`} />
                  <span>{historyFilters.liked ? 'Liked only' : 'All images'}</span>
                </button>
              </div>
              
              {/* Type Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-d-white/70 font-raleway">Type</label>
                <select
                  value={historyFilters.type}
                  onChange={(e) => {
                    const newType = e.target.value as 'all' | 'image' | 'video';
                    setHistoryFilters(prev => ({ 
                      ...prev, 
                      type: newType,
                      model: 'all' // Reset model filter when type changes
                    }));
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-d-dark bg-d-black text-d-white font-raleway text-sm focus:outline-none focus:border-d-orange-1 transition-colors duration-200"
                >
                  <option value="all">All types</option>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </div>
              
              {/* Model Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-d-white/70 font-raleway">Model</label>
                <select
                  value={historyFilters.model}
                  onChange={(e) => setHistoryFilters(prev => ({ ...prev, model: e.target.value }))}
                  className="px-2.5 py-1.5 rounded-lg border border-d-dark bg-d-black text-d-white font-raleway text-sm focus:outline-none focus:border-d-orange-1 transition-colors duration-200"
                  disabled={getAvailableModels().length === 0}
                >
                  <option value="all">All models</option>
                  {getAvailableModels().map(modelId => {
                    const model = AI_MODELS.find(m => m.id === modelId);
                    return (
                      <option key={modelId} value={modelId}>{model?.name || modelId}</option>
                    );
                  })}
                  {getAvailableModels().length === 0 && (
                    <option value="none" disabled>No models available</option>
                  )}
                </select>
              </div>
              
              {/* Folder Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-d-white/70 font-raleway">Folder</label>
                <select
                  value={historyFilters.folder}
                  onChange={(e) => setHistoryFilters(prev => ({ ...prev, folder: e.target.value }))}
                  className="px-2.5 py-1.5 rounded-lg border border-d-dark bg-d-black text-d-white font-raleway text-sm focus:outline-none focus:border-d-orange-1 transition-colors duration-200"
                  disabled={getAvailableFolders().length === 0}
                >
                  <option value="all">All folders</option>
                  {getAvailableFolders().map(folderId => {
                    const folder = folders.find(f => f.id === folderId);
                    return (
                      <option key={folderId} value={folderId}>{folder?.name || folderId}</option>
                    );
                  })}
                  {getAvailableFolders().length === 0 && (
                    <option value="none" disabled>No folders available</option>
                  )}
                </select>
              </div>
            </div>
          </div>
          
          {/* Gallery Grid */}
          <div className="grid grid-cols-3 gap-3 w-full">
            {filterGalleryItems(gallery).map((img, idx) => (
              <div key={`hist-${img.url}-${idx}`} className="group relative rounded-[24px] overflow-hidden border border-d-black bg-d-black hover:bg-d-dark hover:border-d-mid transition-colors duration-100 parallax-large">
                <img src={img.url} alt={img.prompt || `Generated ${idx+1}`} className="w-full aspect-square object-cover" onClick={() => { setSelectedFullImage(img); setIsFullSizeOpen(true); }} />
                
                {/* Hover prompt overlay */}
                {img.prompt && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-100 ease-in-out pointer-events-auto flex items-end z-10"
                    style={{
                      background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.65) 20%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.3) 80%, rgba(0,0,0,0.15) 95%, transparent 100%)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      height: 'fit-content'
                    }}
                  >
                    <div className="w-full p-4">
                      <div className="mb-2">
                        <div className="relative">
                          <p className="text-d-text text-base font-raleway leading-relaxed line-clamp-3 pl-1">
                            {img.prompt}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyPromptToClipboard(img.prompt);
                              }}
                              className="ml-3 inline cursor-pointer text-d-white/70 transition-colors duration-200 hover:text-d-orange-1 relative z-20"
                              onMouseEnter={(e) => {
                                showHoverTooltip(e.currentTarget, `hist-${img.url}-${idx}`);
                              }}
                              onMouseLeave={() => {
                                hideHoverTooltip(`hist-${img.url}-${idx}`);
                              }}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </p>
                        </div>
                      </div>
                      {img.references && img.references.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-1">
                            {img.references.map((ref, refIdx) => (
                              <div key={refIdx} className="relative">
                                <img 
                                  src={ref} 
                                  alt={`Reference ${refIdx + 1}`} 
                                  className="w-6 h-6 rounded object-cover border border-d-mid cursor-pointer hover:border-d-orange-1 transition-colors duration-200"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedFullImage({ ...img, url: ref });
                                    setIsFullSizeOpen(true);
                                  }}
                                />
                                <div className="absolute -top-1 -right-1 bg-d-orange-1 text-d-text text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold font-cabin">
                                  {refIdx + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const link = document.createElement('a');
                              link.href = img.references![0];
                              link.target = '_blank';
                              link.click();
                            }}
                            className="text-xs font-raleway text-d-white/70 transition-colors duration-200 hover:text-d-orange-1"
                          >
                            View reference{img.references.length > 1 ? 's' : ''} ({img.references.length})
                          </button>
                        </div>
                      )}
                      {/* Model Badge */}
                      <div className="flex justify-start mt-2">
                        <ModelBadge model={img.model} size="md" />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Tooltip positioned outside the hover overlay container */}
                <div 
                  data-tooltip-for={`hist-${img.url}-${idx}`}
                  className="absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-d-black border border-d-mid px-2 py-1 text-[11px] text-d-white opacity-0 shadow-lg z-[70] pointer-events-none"
                  style={{ 
                    left: '50%', 
                    transform: 'translateX(-50%) translateY(-100%)',
                    top: '-8px'
                  }}
                >
                  Copy prompt
                </div>
                
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
                  {renderHoverPrimaryActions(`history-actions-${idx}-${img.url}`, img)}
                  <div className="flex items-center gap-0.5">
                    <button 
                      type="button" 
                      onClick={() => confirmDeleteImage(img.url)} 
                      className="image-action-btn" 
                      title="Delete image" 
                      aria-label="Delete image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => toggleFavorite(img.url)} 
                      className="image-action-btn favorite-toggle" 
                      title={favorites.has(img.url) ? "Remove from liked" : "Add to liked"} 
                      aria-label={favorites.has(img.url) ? "Remove from liked" : "Add to liked"}
                    >
                      <Heart 
                        className={`heart-icon w-3.5 h-3.5 transition-colors duration-200 ${
                          favorites.has(img.url) ? 'fill-red-500 text-red-500' : 'text-current fill-none'
                        }`} 
                      />
                    </button>
                    <ShareButton 
                      prompt={img.prompt || ""} 
                      size="sm"
                      className="image-action-btn !px-2 !py-1 !text-xs"
                      onCopy={() => {
                        setCopyNotification('Link copied!');
                        setTimeout(() => setCopyNotification(null), 2000);
                      }}
                    />
                    <button 
                      type="button" 
                      onClick={() => handleAddToFolder(img.url)} 
                      className="image-action-btn" 
                      title="Add to folder" 
                      aria-label="Add to folder"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                    <a href={img.url} download className="image-action-btn" title="Download image" aria-label="Download image"><Download className="w-3.5 h-3.5" /></a>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Empty state for history */}
            {gallery.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <History className="w-16 h-16 text-d-white/30 mb-4" />
                <h3 className="text-2xl font-raleway text-d-white/60 mb-2">No history yet</h3>
                <p className="text-base font-raleway text-d-white/40 max-w-md">
                  Your generation history will appear here once you start creating images.
                </p>
              </div>
            )}
            
            {/* Empty state for filtered results */}
            {gallery.length > 0 && filterGalleryItems(gallery).length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <Settings className="w-16 h-16 text-d-white/30 mb-4" />
                <h3 className="text-2xl font-raleway text-d-white/60 mb-2">No results found</h3>
                <p className="text-base font-raleway text-d-white/40 max-w-md">
                  Try adjusting your filters to see more results.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Copy notification */}
      {copyNotification && (
        <div className="fixed top-20 right-6 bg-d-orange-1 text-d-text px-4 py-2 rounded-lg shadow-lg z-50">
          {copyNotification}
        </div>
      )}

      {/* Full size image modal */}
      {isFullSizeOpen && selectedFullImage && createPortal(
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <img 
              src={selectedFullImage.url} 
              alt={selectedFullImage.prompt || "Generated image"} 
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <button
              onClick={() => setIsFullSizeOpen(false)}
              className="absolute top-4 right-4 bg-d-black/50 text-d-white p-2 rounded-full hover:bg-d-black/70 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
