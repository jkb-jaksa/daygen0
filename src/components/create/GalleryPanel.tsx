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
  Settings,
  Trash2,
} from "lucide-react";
import type {
  BulkActionsMenuState,
  Folder,
  GalleryFilters,
  GalleryImageLike,
} from "./types";
import { buttons, glass } from "../../styles/designSystem";
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
  } = useDropdownScrollLock<HTMLDivElement>();

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
        className={`w-full min-h-[38px] px-2.5 py-1.5 rounded-lg text-d-white font-raleway text-sm focus:outline-none focus:border-d-white transition-colors duration-200 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed ${glass.promptDark}`}
      >
        <span className={selectedOption ? "text-d-white" : "text-d-white/50"}>
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
            className={`fixed rounded-lg shadow-lg z-[9999] max-h-48 overflow-y-auto ${glass.promptDark}`}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
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
                className={`w-full px-2.5 py-1.5 text-left text-sm font-raleway rounded-lg border transition-all duration-0 ${
                  option.value === value
                    ? "bg-white border-white/70 shadow-lg shadow-white/30 text-d-black"
                    : "bg-transparent hover:bg-d-text/20 border-0 text-d-white hover:text-d-text"
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
  const {
    setScrollableRef,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useDropdownScrollLock<HTMLDivElement>();

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

  const toggleValue = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter(v => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  const selectedLabels = options
    .filter(opt => values.includes(opt.value))
    .map(opt => opt.label)
    .join(", ");

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full min-h-[38px] px-2.5 py-1.5 rounded-lg text-d-white font-raleway text-sm focus:outline-none focus:border-d-white transition-colors duration-200 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed ${glass.promptDark}`}
      >
        <span className={values.length > 0 ? "text-d-white" : "text-d-white/50"}>
          {values.length > 0 ? selectedLabels : placeholder || "Select..."}
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
            className={`fixed rounded-lg shadow-lg z-[9999] max-h-48 overflow-y-auto ${glass.promptDark}`}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
            }}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {options.map(option => {
              const isSelected = values.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleValue(option.value)}
                  className={`w-full px-2.5 py-1.5 text-left text-sm font-raleway rounded-lg border transition-all duration-0 ${
                    isSelected
                      ? "bg-white border-white/70 shadow-lg shadow-white/30 text-d-black"
                      : "bg-transparent hover:bg-d-text/20 border-0 text-d-white hover:text-d-text"
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
  } = useDropdownScrollLock<HTMLDivElement>();

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
}

export function GalleryPanel({
  galleryFilters,
  setGalleryFilters,
  getAvailableModels,
  aiModels,
  getAvailableFolders,
  folders,
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
}: GalleryPanelProps) {
  const modelOptions = getAvailableModels().map(modelId => {
    const model = aiModels.find(m => m.id === modelId);
    return { value: modelId, label: model?.name || modelId };
  });

  const folderOptions = getAvailableFolders().map(folderId => {
    const folder = folders.find(f => f.id === folderId);
    return { value: folderId, label: folder?.name || folderId };
  });

  return (
    <div className="w-full">
      <div className={`mb-4 p-3 ${glass.promptDark} rounded-[20px]`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-d-text" />
            <h3 className="text-sm font-raleway text-d-white">Filters</h3>
          </div>
          <button
            onClick={() => setGalleryFilters({ liked: false, public: false, models: [], type: "all", folder: "all" })}
            className="px-2.5 py-1 text-xs text-d-white hover:text-d-text transition-colors duration-200 font-raleway"
          >
            Clear
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-d-white/70 font-raleway">Liked/Public</label>
            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setGalleryFilters(prev => ({ ...prev, liked: !prev.liked }))}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors duration-200 ${glass.promptDark} font-raleway text-xs ${
                  galleryFilters.liked
                    ? "text-d-text border-d-mid"
                    : "text-d-white border-d-dark hover:border-d-text hover:text-d-text"
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${galleryFilters.liked ? "fill-red-500 text-red-500" : "text-current fill-none"}`} />
                <span>Liked</span>
              </button>
              <button
                onClick={() => setGalleryFilters(prev => ({ ...prev, public: !prev.public }))}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors duration-200 ${glass.promptDark} font-raleway text-xs ${
                  galleryFilters.public
                    ? "text-d-text border-d-mid"
                    : "text-d-white border-d-dark hover:border-d-text hover:text-d-text"
                }`}
              >
                <Globe className={`w-3.5 h-3.5 ${galleryFilters.public ? "text-d-text" : "text-current"}`} />
                <span>Public</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-d-white/70 font-raleway">Modality</label>
            <CustomDropdown
              value={galleryFilters.type}
              onChange={value => {
                const newType = value as "all" | "image" | "video";
                setGalleryFilters(prev => ({ ...prev, type: newType, models: [] }));
              }}
              options={[
                { value: "image", label: "Image" },
                { value: "video", label: "Video" },
              ]}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-d-white/70 font-raleway">Model</label>
            <CustomMultiSelect
              values={galleryFilters.models}
              onChange={models => setGalleryFilters(prev => ({ ...prev, models }))}
              options={modelOptions}
              placeholder="All models"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-d-white/70 font-raleway">Folder</label>
            <CustomDropdown
              value={galleryFilters.folder}
              onChange={value => setGalleryFilters(prev => ({ ...prev, folder: value }))}
              options={folderOptions}
              disabled={folderOptions.length === 0}
              placeholder={folderOptions.length === 0 ? "No folders available" : undefined}
            />
          </div>
        </div>
      </div>

      <div className={`${glass.promptDark} rounded-[20px] mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-2`}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleSelectMode}
            className={`${buttons.subtle} !h-8 !text-d-white hover:!text-d-text !font-normal ${
              isSelectMode ? "!bg-d-mid/20 !text-d-text !border-d-mid/40" : ""
            }`}
          >
            {isSelectMode ? "Done" : "Select"}
          </button>
          <button
            type="button"
            onClick={toggleSelectAllVisible}
            disabled={filteredGallery.length === 0}
            className={`${buttons.subtle} !h-8 !text-d-white hover:!text-d-text !font-normal disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {allVisibleSelected ? "Unselect all" : "Select all"}
          </button>
          <button
            type="button"
            onClick={clearImageSelection}
            disabled={!hasSelection}
            className={`${buttons.subtle} !h-8 !text-d-white hover:!text-d-text !font-normal disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Clear selection
          </button>
        </div>
        {hasSelection && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 mr-2">
              <span className="text-sm font-raleway text-d-white">{selectedImages.size}</span>
              <span className="text-xs font-raleway text-d-white">
                {selectedImages.size === 1 ? "item selected" : "items selected"}
              </span>
              {selectedImages.size !== visibleSelectedCount && (
                <span className="text-xs font-raleway text-d-white">({visibleSelectedCount} visible)</span>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={event => toggleBulkActionsMenu(event.currentTarget)}
                className={`${buttons.subtle} !h-8 gap-1.5 text-d-white !font-normal`}
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
                  className="w-full px-4 py-2 text-left text-sm text-d-white hover:bg-d-text/10 hover:text-d-text flex items-center gap-3"
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
                  className="w-full px-4 py-2 text-left text-sm text-d-white hover:bg-d-text/10 hover:text-d-text flex items-center gap-3"
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
                  className="w-full px-4 py-2 text-left text-sm text-d-white hover:bg-d-text/10 hover:text-d-text flex items-center gap-3"
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
                  className="w-full px-4 py-2 text-left text-sm text-d-white hover:bg-d-text/10 hover:text-d-text flex items-center gap-3"
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
                  className="w-full px-4 py-2 text-left text-sm text-d-white hover:bg-d-text/10 hover:text-d-text flex items-center gap-3"
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
                  className="w-full px-4 py-2 text-left text-sm text-d-white hover:bg-d-text/10 hover:text-d-text flex items-center gap-3"
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
                  className="w-full px-4 py-2 text-left text-sm text-d-white hover:bg-d-text/10 hover:text-d-text flex items-center gap-3"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              </BulkActionsMenuPortal>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2 w-full p-1">
        {filteredGallery.map((img, idx) => renderGalleryItem(img, idx))}

        {gallery.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <Grid3X3 className="default-orange-icon mb-4" />
            <h3 className="text-xl font-raleway text-d-text mb-2">No gallery yet</h3>
            <p className="text-base font-raleway text-d-white max-w-md">
              Your generation gallery will appear here once you start creating images.
            </p>
          </div>
        )}

        {gallery.length > 0 && filteredGallery.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <Settings className="default-orange-icon mb-4" />
            <h3 className="text-xl font-raleway text-d-text mb-2">No results found</h3>
            <p className="text-base font-raleway text-d-white max-w-md">Try adjusting your filters to see more results.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GalleryPanel;
