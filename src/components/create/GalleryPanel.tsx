import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Download,
  FolderPlus,
  Globe,
  Grid3X3,
  Heart,
  HeartOff,
  Lock,
  MoreHorizontal,
  AlertTriangle,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import type {
  BulkActionsMenuState,
  Folder,
  GalleryFilters,
  GalleryImageLike,
} from "./types";
import { buttons, glass } from "../../styles/designSystem";
import { debugError } from "../../utils/debug";
import { useDropdownScrollLock } from "../../hooks/useDropdownScrollLock";

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ value, onChange, options, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const {
    setScrollableRef,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useDropdownScrollLock<HTMLDivElement>(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full min-h-[38px] px-2.5 py-1.5 rounded-lg text-theme-white font-raleway text-sm focus:outline-none focus:border-theme-white transition-colors duration-200 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed ${glass.promptDark}`}
      >
        <span className={selectedOption ? "text-theme-white" : "text-theme-white/50"}>
          {selectedOption?.label || placeholder || "Select..."}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={node => {
              dropdownRef.current = node;
              setScrollableRef(node);
            }}
            className={`fixed rounded-lg shadow-lg z-[9999] ${glass.promptDark}`}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: '384px',
              overflowY: 'auto',
            }}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 text-left text-sm font-raleway rounded-lg border transition-all duration-100 ${
                  option.value === value
                    ? "bg-white border-0 shadow-lg shadow-white/30 text-theme-black"
                    : "bg-transparent hover:bg-theme-text/20 border-0 text-theme-white hover:text-theme-text"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};

interface CustomMultiSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
}

const CustomMultiSelect: React.FC<CustomMultiSelectProps> = ({ values, onChange, options, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Lock body scroll when dropdown is open
  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  const toggleValue = (value: string) => {
    if (disabled) {
      return;
    }

    if (values.includes(value)) {
      onChange(values.filter(v => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full min-h-[38px] px-2.5 py-1.5 rounded-lg text-theme-white font-raleway text-sm focus:outline-none focus:border-theme-white transition-colors duration-200 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed ${glass.promptDark}`}
      >
        <span className={values.length > 0 ? "text-theme-white" : "text-theme-white/50"}>
          {values.length === 0 
            ? placeholder || "Select..." 
            : values.length === 1 
              ? options.find(o => o.value === values[0])?.label || `${values.length} selected`
              : `${values.length} selected`}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className={`fixed rounded-lg shadow-lg z-[9999] ${glass.promptDark}`}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: '384px',
              overflowY: 'auto',
            }}
          >
            {options.map(option => {
              const isSelected = values.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleValue(option.value)}
                  className={`w-full px-2.5 py-1.5 text-left text-sm font-raleway rounded-lg border transition-all duration-100 ${
                    isSelected
                      ? "bg-[color:var(--theme-text)] border-0 shadow-lg shadow-[color:var(--theme-text)]/30 text-[color:var(--theme-black)]"
                      : "bg-transparent hover:bg-theme-text/20 border-0 text-theme-white hover:text-theme-text"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
};

interface BulkActionsMenuPortalProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const BulkActionsMenuPortal: React.FC<BulkActionsMenuPortalProps> = ({ anchorEl, open, onClose, children }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const {
    setScrollableRef,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useDropdownScrollLock<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (!anchorEl) return;
      const rect = anchorEl.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(200, rect.width),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, anchorEl]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        open &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !(anchorEl && anchorEl.contains(event.target as Node))
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, anchorEl, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={node => {
        menuRef.current = node;
        setScrollableRef(node);
      }}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 1100,
      }}
      className={`${glass.promptDark} rounded-lg py-2`}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {children}
    </div>,
    document.body,
  );
};

export interface GalleryPanelProps {
  galleryFilters: GalleryFilters;
  setGalleryFilters: React.Dispatch<React.SetStateAction<GalleryFilters>>;
  getAvailableModels: () => string[];
  aiModels: ReadonlyArray<{ id: string; name: string }>;
  getAvailableFolders: () => string[];
  folders: Folder[];
  getAvailableAvatars: () => Array<{ id: string; name: string }>;
  getAvailableProducts: () => Array<{ id: string; name: string }>;
  toggleSelectMode: () => void;
  toggleSelectAllVisible: () => void;
  filteredGallery: GalleryImageLike[];
  gallery: GalleryImageLike[];
  allVisibleSelected: boolean;
  clearImageSelection: () => void;
  hasSelection: boolean;
  isSelectMode: boolean;
  selectedImages: Set<string>;
  visibleSelectedCount: number;
  toggleBulkActionsMenu: (anchor: HTMLElement) => void;
  bulkActionsMenu: BulkActionsMenuState;
  closeBulkActionsMenu: () => void;
  handleBulkLike: () => void;
  handleBulkUnlike: () => void;
  handleBulkPublish: () => void;
  handleBulkUnpublish: () => void;
  handleBulkAddToFolder: () => void;
  handleBulkDownload: () => void;
  handleBulkDelete: () => void;
  renderGalleryItem: (img: GalleryImageLike, idx: number) => React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => Promise<void>;
}

export function GalleryPanel({
  galleryFilters,
  setGalleryFilters,
  getAvailableModels,
  aiModels,
  getAvailableFolders,
  folders,
  getAvailableAvatars,
  getAvailableProducts,
  toggleSelectMode,
  toggleSelectAllVisible,
  filteredGallery,
  gallery,
  allVisibleSelected,
  clearImageSelection,
  hasSelection,
  isSelectMode,
  selectedImages,
  visibleSelectedCount,
  toggleBulkActionsMenu,
  bulkActionsMenu,
  closeBulkActionsMenu,
  handleBulkLike,
  handleBulkUnlike,
  handleBulkPublish,
  handleBulkUnpublish,
  handleBulkAddToFolder,
  handleBulkDownload,
  handleBulkDelete,
  renderGalleryItem,
  isLoading = false,
  error = null,
  onRefresh,
}: GalleryPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const modelOptions = getAvailableModels().map(modelId => {
    const model = aiModels.find(m => m.id === modelId);
    return { value: modelId, label: model?.name || modelId };
  });

  const avatarOptions = getAvailableAvatars().map(avatar => ({
    value: avatar.id,
    label: avatar.name,
  }));

  const productOptions = getAvailableProducts().map(product => ({
    value: product.id,
    label: product.name,
  }));

  const folderOptions = getAvailableFolders().map(folderId => {
    const folder = folders.find(f => f.id === folderId);
    return { value: folderId, label: folder?.name || folderId };
  });

  const filtersDisabled = isLoading || isRefreshing;
  const handleRefresh = async () => {
    if (!onRefresh) {
      return;
    }

    try {
      setIsRefreshing(true);
      await onRefresh();
    } catch (refreshError) {
      debugError('Failed to refresh gallery filters', refreshError);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="w-full">
      {(isLoading || isRefreshing) && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-theme-accent/30 bg-theme-accent/10 px-3 py-2 text-sm text-theme-accent">
          <span className="inline-flex h-4 w-4 items-center justify-center">
            <span className="h-3 w-3 rounded-full border-2 border-theme-accent/30 border-t-theme-accent animate-spin" />
          </span>
          Syncing your gallery…
        </div>
      )}

      {error && !isLoading && !isRefreshing && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-theme-red/30 bg-theme-red/10 px-3 py-2 text-sm text-theme-red">
          <div className="inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Unable to load gallery filters right now.</span>
          </div>
          {onRefresh && (
            <button
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              className={`${buttons.ghost} px-3 py-1 text-sm`}
            >
              {isRefreshing ? 'Retrying…' : 'Retry'}
            </button>
          )}
        </div>
      )}

      <div className={`mb-4 p-3 ${glass.promptDark} rounded-2xl`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-theme-text" />
            <h3 className="text-sm font-raleway text-theme-white">Filters</h3>
          </div>
          <button
            onClick={() => setGalleryFilters({ liked: false, public: false, models: [], types: [], folder: "all", avatar: "all", product: "all" })}
            disabled={filtersDisabled}
            className={`px-2.5 py-1 text-xs transition-colors duration-200 font-raleway ${
              filtersDisabled
                ? "text-theme-white/50 cursor-not-allowed"
                : "text-theme-white hover:text-theme-text"
            }`}
          >
            Clear
          </button>
        </div>

        {/* Liked/Public filters */}
        <div className="mb-3">
          <label className="text-xs text-theme-white/70 font-raleway mb-1.5 block">Liked/Public</label>
          <div className="flex gap-1 flex-wrap">
            <button
              disabled={filtersDisabled}
              onClick={() => setGalleryFilters(prev => ({ ...prev, liked: !prev.liked }))}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors duration-200 ${glass.promptDark} font-raleway text-xs ${
                galleryFilters.liked
                  ? "text-theme-text border-theme-mid bg-theme-white/10"
                  : "text-theme-white border-theme-dark hover:border-theme-mid hover:text-theme-text"
              } ${
                filtersDisabled ? "cursor-not-allowed opacity-50 hover:text-theme-white hover:border-theme-dark" : ""
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${galleryFilters.liked ? "fill-red-500 text-red-500" : "text-current fill-none"}`} />
              <span>Liked</span>
            </button>
            <button
              disabled={filtersDisabled}
              onClick={() => setGalleryFilters(prev => ({ ...prev, public: !prev.public }))}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors duration-200 ${glass.promptDark} font-raleway text-xs ${
                galleryFilters.public
                  ? "text-theme-text border-theme-mid bg-theme-white/10"
                  : "text-theme-white border-theme-dark hover:border-theme-mid hover:text-theme-text"
              } ${
                filtersDisabled ? "cursor-not-allowed opacity-50 hover:text-theme-white hover:border-theme-dark" : ""
              }`}
            >
              <Globe className={`w-3.5 h-3.5 ${galleryFilters.public ? "text-theme-text" : "text-current"}`} />
              <span>Public</span>
            </button>
          </div>
        </div>

        {/* Main filter grid: Modality, Model, Avatar, Product, Folder */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-theme-white/70 font-raleway">Modality</label>
            <CustomMultiSelect
              values={galleryFilters.types}
              onChange={types => {
                setGalleryFilters(prev => ({ ...prev, types, models: [] }));
              }}
              options={[
                { value: "image", label: "Image" },
                { value: "video", label: "Video" },
              ]}
              placeholder="All modalities"
              disabled={filtersDisabled}
            />
            {/* Selected Modality Tags */}
            {galleryFilters.types.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {galleryFilters.types.map(type => (
                  <div
                    key={type}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-text/20 text-theme-white rounded-full text-xs font-raleway border border-theme-text/30"
                  >
                    <span>{type === "image" ? "Image" : "Video"}</span>
                    <button
                      type="button"
                      disabled={filtersDisabled}
                      onClick={() => setGalleryFilters(prev => ({ ...prev, types: prev.types.filter(t => t !== type), models: [] }))}
                      className={`transition-colors duration-200 ${filtersDisabled ? "cursor-not-allowed opacity-50" : "hover:text-theme-text"}`}
                      aria-label={`Remove ${type === "image" ? "Image" : "Video"}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-theme-white/70 font-raleway">Model</label>
            <CustomMultiSelect
              values={galleryFilters.models}
              onChange={models => setGalleryFilters(prev => ({ ...prev, models }))}
              options={modelOptions}
              placeholder="All models"
              disabled={filtersDisabled}
            />
            {/* Selected Model Tags */}
            {galleryFilters.models.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {galleryFilters.models.map(modelId => {
                  const model = aiModels.find(m => m.id === modelId);
                  return (
                    <div
                      key={modelId}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-text/20 text-theme-white rounded-full text-xs font-raleway border border-theme-text/30"
                    >
                      <span>{model?.name || modelId}</span>
                      <button
                        type="button"
                        disabled={filtersDisabled}
                        onClick={() => setGalleryFilters(prev => ({ ...prev, models: prev.models.filter(m => m !== modelId) }))}
                        className={`transition-colors duration-200 ${filtersDisabled ? "cursor-not-allowed opacity-50" : "hover:text-theme-text"}`}
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

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-theme-white/70 font-raleway">Avatar</label>
            <CustomDropdown
              value={galleryFilters.avatar}
              onChange={value => setGalleryFilters(prev => ({ ...prev, avatar: value }))}
              options={avatarOptions}
              disabled={filtersDisabled || avatarOptions.length === 0}
              placeholder={avatarOptions.length === 0 ? "No avatars available" : "All avatars"}
            />
            {/* Selected Avatar Tag */}
            {galleryFilters.avatar !== "all" && (
              <div className="flex flex-wrap gap-2 mt-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-text/20 text-theme-white rounded-full text-xs font-raleway border border-theme-text/30">
                  <span>{getAvailableAvatars().find(a => a.id === galleryFilters.avatar)?.name || galleryFilters.avatar}</span>
                  <button
                    type="button"
                    disabled={filtersDisabled}
                    onClick={() => setGalleryFilters(prev => ({ ...prev, avatar: "all" }))}
                    className={`transition-colors duration-200 ${filtersDisabled ? "cursor-not-allowed opacity-50" : "hover:text-theme-text"}`}
                    aria-label="Remove avatar filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-theme-white/70 font-raleway">Product</label>
            <CustomDropdown
              value={galleryFilters.product}
              onChange={value => setGalleryFilters(prev => ({ ...prev, product: value }))}
              options={productOptions}
              disabled={filtersDisabled || productOptions.length === 0}
              placeholder={productOptions.length === 0 ? "No products available" : "All products"}
            />
            {galleryFilters.product !== "all" && (
              <div className="flex flex-wrap gap-2 mt-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-text/20 text-theme-white rounded-full text-xs font-raleway border border-theme-text/30">
                  <span>{getAvailableProducts().find(p => p.id === galleryFilters.product)?.name || galleryFilters.product}</span>
                  <button
                    type="button"
                    disabled={filtersDisabled}
                    onClick={() => setGalleryFilters(prev => ({ ...prev, product: "all" }))}
                    className={`transition-colors duration-200 ${filtersDisabled ? "cursor-not-allowed opacity-50" : "hover:text-theme-text"}`}
                    aria-label="Remove product filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-theme-white/70 font-raleway">Folder</label>
            <CustomDropdown
              value={galleryFilters.folder}
              onChange={value => setGalleryFilters(prev => ({ ...prev, folder: value }))}
              options={folderOptions}
              disabled={filtersDisabled || folderOptions.length === 0}
              placeholder={folderOptions.length === 0 ? "No folders available" : undefined}
            />
            {/* Selected Folder Tag */}
            {galleryFilters.folder !== "all" && (
              <div className="flex flex-wrap gap-2 mt-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-text/20 text-theme-white rounded-full text-xs font-raleway border border-theme-text/30">
                  <span>{folders.find(f => f.id === galleryFilters.folder)?.name || galleryFilters.folder}</span>
                  <button
                    type="button"
                    disabled={filtersDisabled}
                    onClick={() => setGalleryFilters(prev => ({ ...prev, folder: "all" }))}
                    className={`transition-colors duration-200 ${filtersDisabled ? "cursor-not-allowed opacity-50" : "hover:text-theme-text"}`}
                    aria-label="Remove folder filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Filter Tags - Only for filters without inline tags */}
        {(galleryFilters.liked ||
          galleryFilters.public) && (
          <div className="mt-3 pt-3 border-t border-theme-dark/50">
            <div className="flex flex-wrap items-center gap-2">
              {galleryFilters.liked && (
                <button
                  disabled={filtersDisabled}
                  onClick={() => setGalleryFilters(prev => ({ ...prev, liked: false }))}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md border border-theme-mid/30 text-theme-white text-xs font-raleway transition-colors duration-200 ${
                    filtersDisabled ? "bg-theme-white/5 cursor-not-allowed opacity-60" : "bg-theme-white/10 hover:bg-theme-white/20"
                  }`}
                >
                  <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                  <span>Liked</span>
                  <X className="w-3 h-3" />
                </button>
              )}

              {galleryFilters.public && (
                <button
                  disabled={filtersDisabled}
                  onClick={() => setGalleryFilters(prev => ({ ...prev, public: false }))}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md border border-theme-mid/30 text-theme-white text-xs font-raleway transition-colors duration-200 ${
                    filtersDisabled ? "bg-theme-white/5 cursor-not-allowed opacity-60" : "bg-theme-white/10 hover:bg-theme-white/20"
                  }`}
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

      <div className={`${glass.promptDark} rounded-2xl mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-2`}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={filtersDisabled}
            onClick={toggleSelectMode}
            className={`${buttons.subtle} !h-8 !text-theme-white hover:!text-theme-text !font-normal ${
              isSelectMode ? "!bg-theme-mid/20 !text-theme-text !border-theme-mid/40" : ""
            }`}
          >
            {isSelectMode ? "Done" : "Select"}
          </button>
          <button
            type="button"
            onClick={toggleSelectAllVisible}
            disabled={filtersDisabled || filteredGallery.length === 0}
            className={`${buttons.subtle} !h-8 !text-theme-white hover:!text-theme-text !font-normal disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {allVisibleSelected ? "Unselect all" : "Select all"}
          </button>
          <button
            type="button"
            onClick={clearImageSelection}
            disabled={filtersDisabled || !hasSelection}
            className={`${buttons.subtle} !h-8 !text-theme-white hover:!text-theme-text !font-normal disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Clear selection
          </button>
        </div>
        {hasSelection && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 mr-2">
              <span className="text-sm font-raleway text-theme-white">{selectedImages.size}</span>
              <span className="text-xs font-raleway text-theme-white">
                {selectedImages.size === 1 ? "item selected" : "items selected"}
              </span>
              {selectedImages.size !== visibleSelectedCount && (
                <span className="text-xs font-raleway text-theme-white">({visibleSelectedCount} visible)</span>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={event => toggleBulkActionsMenu(event.currentTarget)}
                className={`${buttons.subtle} !h-8 gap-1.5 text-theme-white !font-normal`}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
                <span>Actions</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              <BulkActionsMenuPortal
                anchorEl={bulkActionsMenu?.anchor ?? null}
                open={Boolean(bulkActionsMenu)}
                onClose={closeBulkActionsMenu}
              >
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    handleBulkLike();
                    closeBulkActionsMenu();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-theme-white hover:bg-theme-text/10 hover:text-theme-text flex items-center gap-3"
                >
                  <Heart className="h-4 w-4" />
                  <span>Like</span>
                </button>
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    handleBulkUnlike();
                    closeBulkActionsMenu();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-theme-white hover:bg-theme-text/10 hover:text-theme-text flex items-center gap-3"
                >
                  <HeartOff className="h-4 w-4" />
                  <span>Unlike</span>
                </button>
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    handleBulkPublish();
                    closeBulkActionsMenu();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-theme-white hover:bg-theme-text/10 hover:text-theme-text flex items-center gap-3"
                >
                  <Globe className="h-4 w-4" />
                  <span>Publish</span>
                </button>
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    handleBulkUnpublish();
                    closeBulkActionsMenu();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-theme-white hover:bg-theme-text/10 hover:text-theme-text flex items-center gap-3"
                >
                  <Lock className="h-4 w-4" />
                  <span>Unpublish</span>
                </button>
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    handleBulkAddToFolder();
                    closeBulkActionsMenu();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-theme-white hover:bg-theme-text/10 hover:text-theme-text flex items-center gap-3"
                >
                  <FolderPlus className="h-4 w-4" />
                  <span>Manage folders</span>
                </button>
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    handleBulkDownload();
                    closeBulkActionsMenu();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-theme-white hover:bg-theme-text/10 hover:text-theme-text flex items-center gap-3"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    handleBulkDelete();
                    closeBulkActionsMenu();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-theme-white hover:bg-theme-text/10 hover:text-theme-text flex items-center gap-3"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              </BulkActionsMenuPortal>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1 w-full p-1">
        {filteredGallery.map((img, idx) => renderGalleryItem(img, idx))}

        {gallery.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <Grid3X3 className="default-orange-icon mb-4" />
            <h3 className="text-xl font-raleway text-theme-text mb-2">No gallery yet</h3>
            <p className="text-base font-raleway text-theme-white max-w-md">
              Your generation gallery will appear here once you start creating images.
            </p>
          </div>
        )}

        {gallery.length > 0 && filteredGallery.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <Settings className="default-orange-icon mb-4" />
            <h3 className="text-xl font-raleway text-theme-text mb-2">No results found</h3>
            <p className="text-base font-raleway text-theme-white max-w-md">Try adjusting your filters to see more results.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GalleryPanel;
