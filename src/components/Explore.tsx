import React, {
  useState,
  useRef,
  useMemo,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  layout,
  text,
  glass,
  buttons,
} from "../styles/designSystem";
import {
  ArrowUpRight,
  Clock,
  Copy,
  Download,
  Heart,
  MoreHorizontal,
  Palette,
  Share2,
  Sparkles,
  Users,
  Settings,
  ChevronDown,
  Edit,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
} from "lucide-react";
import { getToolLogo, hasToolLogo } from "../utils/toolLogos";
import { getPersistedValue, setPersistedValue } from "../lib/clientStorage";
import { debugError } from "../utils/debug";
import XIcon from "./XIcon";
import InstagramIcon from "./InstagramIcon";


const styleFilters = [
  "Neon noir",
  "Analog film",
  "Dreamscape",
  "Studio lighting",
  "Minimalism",
  "3D render",
  "Illustrative",
  "Cinematic",
];

// AI Model data for filtering
const AI_MODELS = [
  { name: "Gemini 2.5 Flash Image", id: "gemini-2.5-flash-image-preview" },
  { name: "Flux 1.1", id: "flux-1.1" },
  { name: "Ideogram 3.0", id: "ideogram" },
  { name: "Recraft", id: "recraft" },
  { name: "Qwen Image", id: "qwen-image" },
  { name: "Runway Gen-4", id: "runway-gen4" },
  { name: "Runway Gen-4 (Video)", id: "runway-video-gen4" },
  { name: "Wan 2.2 Video", id: "wan-video-2.2" },
  { name: "Hailuo 02", id: "hailuo-02" },
  { name: "Kling", id: "kling-video" },
  { name: "Seedream 3.0", id: "seedream-3.0" },
  { name: "ChatGPT Image", id: "chatgpt-image" },
  { name: "Veo 3", id: "veo-3" },
  { name: "Seedance 1.0 Pro (Video)", id: "seedance-1.0-pro" },
  { name: "Luma Photon 1", id: "luma-photon-1" },
  { name: "Luma Photon Flash 1", id: "luma-photon-flash-1" },
  { name: "Luma Ray 2", id: "luma-ray-2" },
];

type GalleryItem = {
  id: string;
  creator: {
    name: string;
    handle: string;
    avatarColor: string;
    location: string;
  };
  modelId: string;
  modelLabel?: string;
  timeAgo: string;
  likes: number;
  prompt: string;
  tags: string[];
  imageUrl: string;
  orientation: "portrait" | "landscape" | "square";
};

const galleryItems: GalleryItem[] = [
  {
    id: "luminous-neon",
    creator: {
      name: "Mina Ito",
      handle: "@mina_ito",
      avatarColor: "from-fuchsia-500/70 via-cyan-400/70 to-sky-500/70",
      location: "Tokyo, JP",
    },
    modelId: "flux-1.1",
    modelLabel: "Flux Pro",
    timeAgo: "2h ago",
    likes: 248,
    prompt:
      "Hyper-detailed cyberpunk portrait of a violinist bathed in neon reflections, chrome accessories, volumetric light rays, twilight city skyline in the background.",
    tags: ["portrait", "flux", "neon"],
    imageUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
    orientation: "portrait",
  },
  {
    id: "desert-dream",
    creator: {
      name: "Rafael Sol",
      handle: "@rafael.sol",
      avatarColor: "from-orange-500/70 via-rose-400/70 to-amber-500/70",
      location: "Lisbon, PT",
    },
    modelId: "luma-photon-1",
    modelLabel: "Luma Dream Machine",
    timeAgo: "4h ago",
    likes: 192,
    prompt:
      "Retro-futuristic desert resort with mirrored surfaces, palm shadows, soft morning haze, architectural photography style, medium format.",
    tags: ["architecture", "luma", "sunrise"],
    imageUrl:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80&sat=-20",
    orientation: "landscape",
  },
  {
    id: "velvet-astral",
    creator: {
      name: "Daria Bloom",
      handle: "@daria.codes",
      avatarColor: "from-emerald-400/70 via-teal-400/70 to-lime-400/70",
      location: "Berlin, DE",
    },
    modelId: "ideogram",
    modelLabel: "Ideogram Studio",
    timeAgo: "1d ago",
    likes: 321,
    prompt:
      "Illustrated terrarium floating in zero gravity, bioluminescent plants, soft ink shading, glowing dust particles, cosmic backdrop.",
    tags: ["illustration", "ideogram", "botanical"],
    imageUrl:
      "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=900&q=80&sat=30",
    orientation: "square",
  },
  {
    id: "sonic-waves",
    creator: {
      name: "Jules Ried",
      handle: "@jules.fm",
      avatarColor: "from-indigo-500/70 via-purple-400/70 to-slate-500/70",
      location: "Montreal, CA",
    },
    modelId: "recraft",
    modelLabel: "Recraft Vision",
    timeAgo: "3h ago",
    likes: 164,
    prompt:
      "Dynamic motion still of synthwave DJ booth, translucent sound ribbons, lens bloom, analog noise texture, captured with a 35mm prime.",
    tags: ["motion", "recraft", "music"],
    imageUrl:
      "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1200&q=80",
    orientation: "landscape",
  },
  {
    id: "ceramic-dream",
    creator: {
      name: "Anjali Rao",
      handle: "@anjali.designs",
      avatarColor: "from-rose-400/70 via-orange-300/70 to-amber-300/70",
      location: "Bengaluru, IN",
    },
    modelId: "runway-gen4",
    modelLabel: "Runway Gen-4",
    timeAgo: "6h ago",
    likes: 205,
    prompt:
      "Macro photograph of a ceramic sculpture with liquid metal glaze, shallow depth of field, studio lighting, 85mm lens emulation.",
    tags: ["product", "runway", "macro"],
    imageUrl:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=900&q=80",
    orientation: "portrait",
  },
  {
    id: "fjord-lullaby",
    creator: {
      name: "Soren Beck",
      handle: "@sorenbeck",
      avatarColor: "from-blue-400/70 via-sky-300/70 to-cyan-400/70",
      location: "Oslo, NO",
    },
    modelId: "gemini-2.5-flash-image-preview",
    modelLabel: "Gemini Advanced",
    timeAgo: "1d ago",
    likes: 278,
    prompt:
      "Panoramic matte painting of aurora over Nordic fjord village, reflective water, painterly brushstrokes, cinematic contrast.",
    tags: ["landscape", "gemini", "aurora"],
    imageUrl:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
    orientation: "landscape",
  },
];



const recentActivity = [
  {
    creator: "@pixelfable",
    action: "joined the gallery",
    timeAgo: "7 min",
  },
  {
    creator: "@flux.studio",
    action: "shared \"Chromatic Bloom\"",
    timeAgo: "18 min",
  },
  {
    creator: "@moiraglow",
    action: "curated the Analog Futures collection",
    timeAgo: "26 min",
  },
];

// Normalise gallery card aspect so overlays always fit while respecting orientation intent.
const orientationStyles: Record<GalleryItem["orientation"], string> = {
  portrait: "aspect-square",
  landscape: "aspect-square",
  square: "aspect-square",
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

// ImageActionMenuPortal component (exact copy from Create.tsx)
const ImageActionMenuPortal: React.FC<{
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  isRecreateMenu?: boolean;
}> = ({ anchorEl, open, onClose, children, isRecreateMenu = false }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const originalBodyOverflow = useRef<string | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const lockBodyScroll = () => {
    if (typeof document === "undefined") return;
    if (originalBodyOverflow.current === null) {
      originalBodyOverflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
  };

  const unlockBodyScroll = () => {
    if (typeof document === "undefined") return;
    if (originalBodyOverflow.current !== null) {
      document.body.style.overflow = originalBodyOverflow.current;
      originalBodyOverflow.current = null;
    }
  };

  useEffect(() => {
    if (!open || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const width = Math.max(200, rect.width);
    setPos({
      top: rect.top,
      left: rect.left,
      width,
    });
  }, [open, anchorEl]);

  useEffect(() => {
    return () => {
      unlockBodyScroll();
    };
  }, []);

  useLayoutEffect(() => {
    if (!open || !anchorEl || !menuRef.current) return;
    if (typeof window === "undefined") return;

    const updatePosition = () => {
      if (!menuRef.current) return;
      if (typeof window === "undefined") return;
      const anchorRect = anchorEl.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const width = Math.max(200, anchorRect.width);
      const margin = 8;
      
      let top;
      if (isRecreateMenu) {
        // For recreate menu, always position above the button
        // Use actual menu height if available, otherwise use a more accurate estimate
        // The recreate menu has 3 items, each ~44px high (py-2 = 8px top + 8px bottom + text height)
        const actualHeight = menuRect.height > 0 ? menuRect.height : 140; // 3 * 44px + padding
        // Reduce margin to bring dropdown closer to button (no whitespace)
        top = Math.max(2, anchorRect.top - actualHeight - 2);
      } else {
        // Position below the button for other menus
        top = anchorRect.bottom + window.scrollY + margin;
      }
      
      const availableLeft = Math.max(margin, window.innerWidth - menuRect.width - margin);
      const left = Math.min(
        Math.max(margin, anchorRect.left),
        availableLeft
      );

      setPos({ top, left, width });
    };

    // Initial positioning using requestAnimationFrame to ensure menu is rendered
    const rafId = requestAnimationFrame(() => {
      updatePosition();
      // Double-check position after another frame to ensure accurate height
      requestAnimationFrame(() => {
        updatePosition();
      });
    });

    // Only update position on scroll and resize, not on every hover
    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open, anchorEl, isRecreateMenu]);

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
      ref={menuRef}
      onMouseEnter={lockBodyScroll}
      onMouseLeave={unlockBodyScroll}
      onTouchStart={lockBodyScroll}
      onTouchEnd={unlockBodyScroll}
      onTouchCancel={unlockBodyScroll}
      onWheel={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 1100,
      }}
      className={`${glass.promptDark} rounded-lg py-2`}
    >
      {children}
    </div>,
    document.body
  );
};

const getModelDisplayName = (modelId: string, label?: string) => {
  if (label) return label;
  const model = AI_MODELS.find(m => m.id === modelId);
  return model?.name || modelId;
};

// Custom dropdown component for Gallery filters
const CustomDropdown: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
}> = ({ value, onChange, options, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
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
            ref={dropdownRef}
            className={`fixed rounded-lg shadow-lg z-[9999] max-h-48 overflow-y-auto ${glass.promptDark}`}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
            }}
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

// Custom multi-select dropdown component for Gallery model filters
const CustomMultiSelect: React.FC<{
  values: string[];
  onChange: (values: string[]) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
}> = ({ values, onChange, options, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
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

  const toggleOption = (optionValue: string) => {
    if (values.includes(optionValue)) {
      onChange(values.filter(v => v !== optionValue));
    } else {
      onChange([...values, optionValue]);
    }
  };

  const removeOption = (optionValue: string) => {
    onChange(values.filter(v => v !== optionValue));
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full min-h-[38px] px-2.5 py-1.5 rounded-lg text-d-white font-raleway text-sm focus:outline-none focus:border-d-white transition-colors duration-200 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed ${glass.promptDark}`}
      >
        <div className="flex flex-wrap gap-1.5 flex-1">
          {values.length === 0 ? (
            <span className="text-d-white/50">{placeholder || "Select..."}</span>
          ) : (
            values.map(value => {
              const option = options.find(opt => opt.value === value);
              return (
                <div key={value} className="flex items-center gap-1 px-2 py-1 bg-d-orange-1/20 text-d-white rounded-md text-xs">
                  <span>{option?.label || value}</span>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      removeOption(value);
                    }}
                    className="hover:text-d-text transition-colors duration-200 ml-1 text-base font-bold"
                  >
                    ×
                  </button>
                </div>
              );
            })
          )}
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} flex-shrink-0`} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className={`fixed rounded-lg shadow-lg z-[9999] max-h-48 overflow-y-auto ${glass.promptDark}`}
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
            }}
          >
            {options.map(option => {
              const isSelected = values.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleOption(option.value)}
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

const Explore: React.FC = () => {
  // Filter state
  const [galleryFilters, setGalleryFilters] = useState<{
    models: string[];
    type: 'all' | 'image' | 'video';
  }>({
    models: [],
    type: 'all',
  });

  const navigate = useNavigate();

  // Copy notification state
  const [copyNotification, setCopyNotification] = useState<string | null>(null);

  // Favorites state
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Load favorites from storage
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const storedFavorites = await getPersistedValue<string[]>('explore-', 'favorites');
        if (storedFavorites) {
          setFavorites(new Set(storedFavorites));
        }
      } catch (error) {
        debugError('Failed to load favorites:', error);
      }
    };
    void loadFavorites();
  }, []);

  // Persist favorites to storage
  const persistFavorites = async (newFavorites: Set<string>) => {
    setFavorites(newFavorites);
    try {
      await setPersistedValue('explore-', 'favorites', Array.from(newFavorites));
    } catch (error) {
      debugError('Failed to persist favorites:', error);
    }
  };

  // Toggle favorite function
  const toggleFavorite = (imageUrl: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(imageUrl)) {
      newFavorites.delete(imageUrl);
    } else {
      newFavorites.add(imageUrl);
    }
    void persistFavorites(newFavorites);
  };

  const getDisplayLikes = useCallback(
    (item: GalleryItem) => item.likes + (favorites.has(item.imageUrl) ? 1 : 0),
    [favorites],
  );

  // More button dropdown state
  const [moreActionMenu, setMoreActionMenu] = useState<{
    id: string;
    anchor: HTMLElement;
    item: GalleryItem;
  } | null>(null);

  const [recreateActionMenu, setRecreateActionMenu] = useState<{
    id: string;
    anchor: HTMLElement;
    item: GalleryItem;
  } | null>(null);

  // Full-size view state
  const [isFullSizeOpen, setIsFullSizeOpen] = useState(false);
  const [selectedFullImage, setSelectedFullImage] = useState<GalleryItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Copy prompt function
  const copyPromptToClipboard = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyNotification('Prompt copied!');
      setTimeout(() => setCopyNotification(null), 2000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  // Tooltip functions
  const showHoverTooltip = (target: HTMLElement, tooltipId: string) => {
    if (typeof document === 'undefined') return;
    
    // Remove any existing tooltip first
    const existingTooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`);
    if (existingTooltip) {
      existingTooltip.remove();
    }
    
    console.log('Creating tooltip for ID:', tooltipId);
    
    // Create tooltip element dynamically
    const tooltip = document.createElement('div');
    tooltip.setAttribute('data-tooltip-for', tooltipId);
    tooltip.className = 'tooltip';
    tooltip.textContent = 'Copy prompt';
    
    // Position tooltip just above the button
    const triggerRect = target.getBoundingClientRect();
    tooltip.style.top = `${triggerRect.top - 32}px`;
    tooltip.style.left = `${triggerRect.left + triggerRect.width / 2}px`;
    tooltip.style.transform = 'translateX(-50%)';
    
    // Append to body
    document.body.appendChild(tooltip);
    
    console.log('Tooltip created and positioned at:', {
      top: tooltip.style.top,
      left: tooltip.style.left,
      transform: tooltip.style.transform
    });
  };

  const hideHoverTooltip = (tooltipId: string) => {
    if (typeof document === 'undefined') return;
    const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`) as HTMLElement | null;
    if (!tooltip) return;
    tooltip.remove();
  };

  // More button dropdown handlers
  const toggleMoreActionMenu = (itemId: string, anchor: HTMLElement, item: GalleryItem) => {
    setMoreActionMenu(prev =>
      prev?.id === itemId ? null : { id: itemId, anchor, item }
    );
  };

  const closeMoreActionMenu = () => {
    setMoreActionMenu(null);
  };

  const toggleRecreateActionMenu = (itemId: string, anchor: HTMLElement, item: GalleryItem) => {
    setMoreActionMenu(null);
    setRecreateActionMenu(prev =>
      prev?.id === itemId ? null : { id: itemId, anchor, item }
    );
  };

  const closeRecreateActionMenu = () => {
    setRecreateActionMenu(null);
  };

  const handleRecreateEdit = (item: GalleryItem) => {
    closeRecreateActionMenu();
    navigate("/edit", {
      state: {
        imageToEdit: {
          url: item.imageUrl,
          prompt: item.prompt,
          model: item.modelId,
          timestamp: new Date().toISOString(),
          isPublic: true,
        },
      },
    });
  };

  const handleRecreateUseAsReference = (item: GalleryItem) => {
    closeRecreateActionMenu();
    navigate("/create/image", {
      state: {
        referenceImageUrl: item.imageUrl,
        selectedModel: item.modelId,
        focusPromptBar: true,
      },
    });
  };

  const handleRecreateRunPrompt = (item: GalleryItem) => {
    closeRecreateActionMenu();
    navigate("/create/image", {
      state: {
        promptToPrefill: item.prompt,
        selectedModel: item.modelId,
        focusPromptBar: true,
      },
    });
  };

  // Navigation functions for full-size view
  const navigateFullSizeImage = (direction: 'prev' | 'next') => {
    const totalImages = filteredGallery.length;
    if (totalImages === 0) return;
    
    const newIndex = direction === 'prev' 
      ? (currentImageIndex > 0 ? currentImageIndex - 1 : totalImages - 1)
      : (currentImageIndex < totalImages - 1 ? currentImageIndex + 1 : 0);
    
    setCurrentImageIndex(newIndex);
    setSelectedFullImage(filteredGallery[newIndex]);
  };

  // Open full-size view
  const openFullSizeView = (item: GalleryItem) => {
    const index = filteredGallery.findIndex(galleryItem => galleryItem.id === item.id);
    setCurrentImageIndex(index);
    setSelectedFullImage(item);
    setIsFullSizeOpen(true);
  };

  // Close full-size view
  const closeFullSizeView = () => {
    setIsFullSizeOpen(false);
    setSelectedFullImage(null);
  };

  const copyImageLink = async (item: GalleryItem) => {
    try {
      // Import the share utilities (same as Create section)
      const { makeRemixUrl, withUtm, copyLink } = await import("../lib/shareUtils");
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const remixUrl = makeRemixUrl(baseUrl, item.prompt || "");
      const trackedUrl = withUtm(remixUrl, "copy");
      await copyLink(trackedUrl);
      setCopyNotification('Link copied!');
      setTimeout(() => setCopyNotification(null), 2000);
      closeMoreActionMenu();
    } catch (error) {
      console.error('Failed to copy link:', error);
      setCopyNotification('Failed to copy link');
      setTimeout(() => setCopyNotification(null), 2000);
    }
  };

  // Helper functions for filters
  const getAvailableModels = () => {
    if (galleryFilters.type === 'video') {
      // Return video models
      return AI_MODELS.filter(model => 
        model.id === 'veo-3' || 
        model.id === 'runway-video-gen4' ||
        model.id === 'wan-video-2.2' ||
        model.id === 'hailuo-02' ||
        model.id === 'kling-video' ||
        model.id === 'seedance-1.0-pro' ||
        model.id === 'luma-ray-2'
      ).map(model => model.id).sort();
    } else if (galleryFilters.type === 'image') {
      // Return image models (exclude video models and Photon Flash variant)
      return AI_MODELS.filter(model => 
        model.id !== 'veo-3' && 
        model.id !== 'runway-video-gen4' &&
        model.id !== 'wan-video-2.2' &&
        model.id !== 'hailuo-02' &&
        model.id !== 'kling-video' &&
        model.id !== 'seedance-1.0-pro' &&
        model.id !== 'luma-ray-2' &&
        model.id !== 'luma-photon-flash-1'
      ).map(model => model.id).sort();
    } else {
      // Return all models
      return AI_MODELS.map(model => model.id).sort();
    }
  };

  // Filter function for gallery
  const filterGalleryItems = (items: typeof galleryItems) => {
    return items.filter(item => {
      // Model filter
      if (galleryFilters.models.length > 0 && !galleryFilters.models.includes(item.modelId)) {
        return false;
      }
      
      // Type filter
      if (galleryFilters.type !== 'all') {
        const isVideo = item.modelId.includes('video') || 
                       item.modelId === 'veo-3' || 
                       item.modelId === 'runway-video-gen4' ||
                       item.modelId === 'wan-video-2.2' ||
                       item.modelId === 'hailuo-02' ||
                       item.modelId === 'kling-video' ||
                       item.modelId === 'seedance-1.0-pro' ||
                       item.modelId === 'luma-ray-2';
        
        if (galleryFilters.type === 'image' && isVideo) {
          return false;
        }
        if (galleryFilters.type === 'video' && !isVideo) {
          return false;
        }
      }
      
      return true;
    });
  };

  const filteredGallery = useMemo(() => filterGalleryItems(galleryItems), [galleryFilters]);

  const initialBatchSize = useMemo(() => 9, []);
  const [visibleCount, setVisibleCount] = useState(initialBatchSize);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(Math.min(initialBatchSize, filteredGallery.length || initialBatchSize));
  }, [galleryFilters, filteredGallery.length, initialBatchSize]);

  const visibleGallery = useMemo(
    () => filteredGallery.slice(0, visibleCount),
    [filteredGallery, visibleCount],
  );

  useEffect(() => {
    if (visibleCount > filteredGallery.length) {
      setVisibleCount(filteredGallery.length);
    }
  }, [filteredGallery.length, visibleCount]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;
    if (visibleGallery.length >= filteredGallery.length) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry?.isIntersecting) {
        setVisibleCount((prev) =>
          Math.min(prev + initialBatchSize, filteredGallery.length),
        );
      }
    }, { rootMargin: "0px 0px 200px 0px" });

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [filteredGallery.length, initialBatchSize, visibleGallery.length, isFullSizeOpen]);

  // Keyboard navigation for full-size view
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isFullSizeOpen) return;
      
      if (event.key === 'Escape') {
        closeFullSizeView();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateFullSizeImage('prev');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateFullSizeImage('next');
      }
    };

    if (isFullSizeOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullSizeOpen, currentImageIndex, filteredGallery]);

  return (
    <div className={`${layout.page} explore-page`}>
      {/* Copy notification */}
      {copyNotification && (
        <div className={`fixed top-1/2 left-1/2 z-[100] -translate-x-1/2 -translate-y-1/2 transform px-4 py-2 text-sm text-d-white font-raleway transition-all duration-100 ${glass.promptDark} rounded-[20px]`}>
          {copyNotification}
        </div>
      )}
      
      <div className="relative isolate">
        <div className={`${layout.backdrop}`} aria-hidden />

        <section className="relative pb-12 pt-[calc(var(--nav-h,4rem)+1rem)]">
          <div className={`${layout.container} space-y-1`}>
            {/* Filters Section */}
            <div className={`mb-0 p-3 ${glass.promptDark} rounded-[20px]`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-d-text" />
                  <h3 className="text-sm font-raleway text-d-white">Filters</h3>
                </div>
                <button
                  onClick={() =>
                    setGalleryFilters({
                      models: [],
                      type: "all",
                    })
                  }
                  className="px-2.5 py-1 text-xs text-d-white hover:text-d-text transition-colors duration-200 font-raleway"
                >
                  Clear
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Modality Filter */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs text-d-white/70 font-raleway">Modality</label>
                  <CustomDropdown
                    value={galleryFilters.type}
                    onChange={value => {
                      const newType = value as "all" | "image" | "video";
                      setGalleryFilters(prev => ({
                        ...prev,
                        type: newType,
                        models: [],
                      }));
                    }}
                    options={[
                      { value: "image", label: "Image" },
                      { value: "video", label: "Video" },
                    ]}
                    placeholder="All modalities"
                  />
                </div>

                {/* Model Filter */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs text-d-white/70 font-raleway">Model</label>
                  <CustomMultiSelect
                    values={galleryFilters.models}
                    onChange={models => setGalleryFilters(prev => ({ ...prev, models }))}
                    options={getAvailableModels().map(modelId => {
                      const model = AI_MODELS.find(m => m.id === modelId);
                      return { value: modelId, label: model?.name || modelId };
                    })}
                    placeholder="All models"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative pb-12 -mt-6">
          <div className={`${layout.container}`}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleGallery.map((item) => {
                const isMenuActive = moreActionMenu?.id === item.id;
                const isRecreateMenuOpen = recreateActionMenu?.id === item.id;
                return (
                  <article
                    key={item.id}
                    className="group relative overflow-hidden rounded-[28px] border border-d-dark hover:border-d-mid transition-colors duration-200 bg-d-black/40 shadow-[0_24px_70px_rgba(0,0,0,0.45)] parallax-small cursor-pointer"
                    onClick={(event) => {
                      // Check if the click came from a copy button
                      const target = event.target as HTMLElement;
                      if (target && (target.hasAttribute('data-copy-button') || target.closest('[data-copy-button="true"]'))) {
                        return;
                      }
                      openFullSizeView(item);
                    }}
                  >
                  <div className={`relative ${orientationStyles[item.orientation]} min-h-[240px] sm:min-h-[280px] xl:min-h-[320px]`}>
                    <img
                      src={item.imageUrl}
                      alt={`Image by ${item.creator.name}`}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/70" aria-hidden="true" />

                    <div className="absolute left-4 top-4 flex flex-wrap gap-2 transition-opacity duration-100 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                      {item.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={`rounded-full border border-d-dark px-3 py-1 text-xs font-medium text-d-white backdrop-blur transition-colors duration-200 hover:text-d-text pointer-events-auto ${glass.promptDark}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>


                    <div
                      className={`absolute right-4 top-4 flex items-center gap-1 transition-opacity duration-100 ${
                        isMenuActive
                          ? 'opacity-100 pointer-events-auto'
                          : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleFavorite(item.imageUrl);
                        }}
                        className="image-action-btn image-action-btn--labelled parallax-large favorite-toggle"
                        aria-label={favorites.has(item.imageUrl) ? "Remove from liked" : "Add to liked"}
                      >
                        <Heart
                          className={`size-3.5 transition-colors duration-100 ${
                            favorites.has(item.imageUrl) ? 'fill-red-500 text-red-500' : 'text-current fill-none'
                          }`}
                          aria-hidden="true"
                        />
                        {getDisplayLikes(item)}
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleMoreActionMenu(item.id, event.currentTarget, item);
                          }}
                          className="image-action-btn parallax-large"
                          aria-label="More options"
                        >
                          <MoreHorizontal className="size-4" aria-hidden="true" />
                        </button>
                        <ImageActionMenuPortal
                          anchorEl={moreActionMenu?.id === item.id ? moreActionMenu?.anchor ?? null : null}
                          open={moreActionMenu?.id === item.id}
                          onClose={closeMoreActionMenu}
                          isRecreateMenu={false}
                        >
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
                            onClick={async (event) => {
                              event.stopPropagation();
                              await copyImageLink(item);
                            }}
                          >
                            <Share2 className="h-4 w-4" />
                            Copy link
                          </button>
                          <a
                            href={item.imageUrl}
                            download
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
                            onClick={(event) => {
                              event.stopPropagation();
                              closeMoreActionMenu();
                            }}
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </a>
                        </ImageActionMenuPortal>
                      </div>
                    </div>

                    <div
                      className={`absolute inset-x-4 bottom-4 flex flex-col gap-4 transition-opacity duration-100 ${
                        isMenuActive
                          ? 'opacity-100 pointer-events-auto'
                          : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
                      }`}
                    >
                      <div className="glassprompt2">
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="relative size-10 overflow-hidden rounded-full">
                            <div className={`absolute inset-0 bg-gradient-to-br ${item.creator.avatarColor}`} aria-hidden="true" />
                            <span className="relative flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                              {getInitials(item.creator.name)}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-raleway text-sm text-d-text">{item.creator.name}</p>
                              <div className="flex items-center gap-1.5 text-d-white/70">
                                <a
                                  href="https://x.com"
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="transition-colors duration-200 hover:text-d-text"
                                  onClick={(event) => event.stopPropagation()}
                                  aria-label="View on X"
                                >
                                  <XIcon className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href="https://instagram.com"
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="transition-colors duration-200 hover:text-d-text"
                                  onClick={(event) => event.stopPropagation()}
                                  aria-label="View on Instagram"
                                >
                                  <InstagramIcon className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                            <p className="truncate text-xs text-d-white">
                              {item.creator.handle}
                            </p>
                          </div>
                          <button
                            type="button"
                            data-copy-button="true"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              copyPromptToClipboard(item.prompt);
                            }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            className="ml-2 inline cursor-pointer text-d-white transition-colors duration-200 hover:text-d-text relative z-30 align-middle pointer-events-auto"
                            onMouseEnter={(e) => {
                              showHoverTooltip(e.currentTarget, `copy-${item.id}`);
                            }}
                            onMouseLeave={() => {
                              hideHoverTooltip(`copy-${item.id}`);
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        
                        <p
                          className="mt-3 text-sm font-raleway leading-relaxed text-d-white"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {item.prompt}
                        </p>
                        <div className="mt-3 mb-1 flex items-center justify-between text-xs text-d-light">
                          <div className="flex items-center gap-4">
                            <span>{item.creator.location}</span>
                            <span>{item.timeAgo}</span>
                          </div>
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-d-dark text-xs font-medium text-d-white backdrop-blur">
                            {hasToolLogo(item.modelId) && (
                              <img
                                src={getToolLogo(item.modelId)!}
                                alt={`${getModelDisplayName(item.modelId, item.modelLabel)} logo`}
                                className="w-4 h-4 rounded-sm object-cover"
                              />
                            )}
                            {getModelDisplayName(item.modelId, item.modelLabel)}
                          </span>
                        </div>
                      </div>

                      <div className="relative">
                        <button
                          type="button"
                          className={`${buttons.glassPromptDark} w-full justify-center py-3 ${glass.promptDark}`}
                          aria-haspopup="menu"
                          aria-expanded={isRecreateMenuOpen}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleRecreateActionMenu(item.id, event.currentTarget, item);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                          <span>Recreate</span>
                        </button>
                        <ImageActionMenuPortal
                          anchorEl={isRecreateMenuOpen ? recreateActionMenu?.anchor ?? null : null}
                          open={isRecreateMenuOpen}
                          onClose={closeRecreateActionMenu}
                          isRecreateMenu={true}
                        >
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleRecreateEdit(item);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                            Edit image
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleRecreateUseAsReference(item);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                            Use as reference
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleRecreateRunPrompt(item);
                            }}
                          >
                            <RefreshCw className="h-4 w-4" />
                            Run the same prompt
                          </button>
                        </ImageActionMenuPortal>
                      </div>
                    </div>
                  </div>
                  </article>
                );
              })}
              <div ref={loadMoreRef} aria-hidden />
            </div>
            {visibleGallery.length < filteredGallery.length && (
              <div className="flex justify-center py-4 text-xs font-raleway text-d-white/60" aria-live="polite">
                Loading more inspiration…
              </div>
            )}
          </div>
        </section>



        <section className="relative pb-20">
          <div className={`${layout.container}`}>
            <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-6">
                <p className={`${text.eyebrow} text-d-white/70`}>Community</p>
                <div className="space-y-4">
                  <h2 className="text-balance font-raleway text-4xl font-light text-d-white sm:text-5xl md:text-6xl">
                    Discover the daygen community gallery
                  </h2>
                  <p className="max-w-xl font-raleway text-lg text-d-white/75">
                    Browse the newest drops from creators mastering the latest AI tooling. Filter by style, model, and mood to follow your next creative spark.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <button type="button" className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors duration-200 ${glass.promptDark} font-raleway text-xs text-d-white border-d-dark hover:border-d-text hover:text-d-text`}>
                    Share your creation
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors duration-200 ${glass.promptDark} font-raleway text-xs text-d-white border-d-dark hover:border-d-text hover:text-d-text`}>
                    View submission guide
                  </button>
                </div>
              </div>

              <div className="grid gap-4 text-left text-sm font-raleway text-d-white/80 sm:grid-cols-2">
                <div className={`${glass.surface} border border-d-dark/70 bg-d-black/40 p-5`}> 
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-d-white/60">
                    <Sparkles className="size-4" aria-hidden="true" />
                    Trending
                  </div>
                  <p className="mt-3 text-3xl font-light text-d-white">3.2K+</p>
                  <p className="text-xs text-d-white/60">new images shared this week</p>
                </div>
                <div className={`${glass.surface} border border-d-dark/70 bg-d-black/40 p-5`}>
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-d-white/60">
                    <Users className="size-4" aria-hidden="true" />
                    Creators
                  </div>
                  <p className="mt-3 text-3xl font-light text-d-white">870</p>
                  <p className="text-xs text-d-white/60">featured artists this month</p>
                </div>
                <div className={`${glass.surface} border border-d-dark/70 bg-d-black/40 p-5`}> 
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-d-white/60">
                    <Clock className="size-4" aria-hidden="true" />
                    Live feed
                  </div>
                  <ul className="mt-4 space-y-3 text-xs text-d-white/70">
                    {recentActivity.map((item) => (
                      <li
                        key={`${item.creator}-${item.timeAgo}`}
                        className="flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-medium text-d-white">{item.creator}</p>
                          <p className="text-d-white/60">{item.action}</p>
                        </div>
                        <span className="whitespace-nowrap text-d-white/50">{item.timeAgo}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`${glass.surface} border border-d-dark/70 bg-d-black/40 p-5`}> 
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-d-white/60">
                    <Palette className="size-4" aria-hidden="true" />
                    Styles
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-d-white/70">
                    {styleFilters.slice(0, 5).map((filter) => (
                      <span
                        key={filter}
                        className="rounded-full border border-d-dark/70 px-3 py-1 text-d-white/70"
                      >
                        {filter}
                      </span>
                    ))}
                    <span className="rounded-full border border-d-dark/70 px-3 py-1 text-d-white/60">
                      +{styleFilters.length - 5}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Full-size image modal */}
        {isFullSizeOpen && selectedFullImage && (
          <div
            className="fixed inset-0 z-[60] bg-d-black/80 flex items-start justify-center p-4"
            onClick={closeFullSizeView}
          >
            <div className="relative max-w-[95vw] max-h-[90vh] group flex items-start justify-center mt-14" onClick={(e) => e.stopPropagation()}>
              {/* Navigation arrows for full-size modal */}
              {filteredGallery.length > 1 && (
                <>
                  <button
                    onClick={() => navigateFullSizeImage('prev')}
                    className={`nav-arrow-btn absolute left-4 top-1/2 -translate-y-1/2 z-20 transition-all duration-100 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:scale-105`}
                    title="Previous image (←)"
                    aria-label="Previous image"
                    style={{ width: "3rem", height: "3rem" }}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => navigateFullSizeImage('next')}
                    className={`nav-arrow-btn absolute right-4 top-1/2 -translate-y-1/2 z-20 transition-all duration-100 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:scale-105`}
                    title="Next image (→)"
                    aria-label="Next image"
                    style={{ width: "3rem", height: "3rem" }}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
              
              <img 
                src={selectedFullImage.imageUrl} 
                alt={`Image by ${selectedFullImage.creator.name}`} 
                className="max-w-full max-h-[90vh] object-contain rounded-lg" 
                style={{ objectPosition: 'top' }}
              />
              
              {/* Action buttons */}
              <div className="absolute inset-x-0 top-0 flex items-start justify-end gap-2 px-4 pt-4 pointer-events-none">
                <div
                  className={`flex items-center gap-1 transition-opacity duration-100 ${
                    moreActionMenu?.id === selectedFullImage.id
                      ? 'opacity-100 pointer-events-auto'
                      : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
                  }`}
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleFavorite(selectedFullImage.imageUrl);
                    }}
                    className="image-action-btn image-action-btn--labelled parallax-large favorite-toggle"
                    aria-label={favorites.has(selectedFullImage.imageUrl) ? "Remove from liked" : "Add to liked"}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 transition-colors duration-100 ${
                        favorites.has(selectedFullImage.imageUrl) ? 'fill-red-500 text-red-500' : 'text-current fill-none'
                      }`}
                      aria-hidden="true"
                    />
                    {getDisplayLikes(selectedFullImage)}
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleMoreActionMenu(selectedFullImage.id, event.currentTarget, selectedFullImage);
                      }}
                      className="image-action-btn parallax-large"
                      aria-label="More options"
                    >
                      <MoreHorizontal className="size-4" aria-hidden="true" />
                    </button>
                    <ImageActionMenuPortal
                      anchorEl={moreActionMenu?.id === selectedFullImage.id ? moreActionMenu?.anchor ?? null : null}
                      open={moreActionMenu?.id === selectedFullImage.id}
                      onClose={closeMoreActionMenu}
                      isRecreateMenu={false}
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
                        onClick={async (event) => {
                          event.stopPropagation();
                          await copyImageLink(selectedFullImage);
                        }}
                      >
                        <Share2 className="h-4 w-4" />
                        Copy link
                      </button>
                      <a
                        href={selectedFullImage.imageUrl}
                        download
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm font-raleway text-d-white transition-colors duration-200 hover:text-d-text"
                        onClick={(event) => {
                          event.stopPropagation();
                          closeMoreActionMenu();
                        }}
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </a>
                    </ImageActionMenuPortal>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeFullSizeView}
                  className="image-action-btn parallax-large pointer-events-auto"
                  aria-label="Close"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>

              {/* Image info overlay */}
              <div
                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-100 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"
              >
                <div className="pointer-events-auto">
                  <div className="glassprompt2">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="relative size-10 overflow-hidden rounded-full">
                        <div className={`absolute inset-0 bg-gradient-to-br ${selectedFullImage.creator.avatarColor}`} aria-hidden="true" />
                        <span className="relative flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                          {getInitials(selectedFullImage.creator.name)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-raleway text-sm text-d-text">{selectedFullImage.creator.name}</p>
                          <div className="flex items-center gap-1.5 text-d-white/70">
                            <a
                              href="https://x.com"
                              target="_blank"
                              rel="noreferrer noopener"
                              className="transition-colors duration-200 hover:text-d-text"
                              onClick={(event) => event.stopPropagation()}
                              aria-label="View on X"
                            >
                              <XIcon className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href="https://instagram.com"
                              target="_blank"
                              rel="noreferrer noopener"
                              className="transition-colors duration-200 hover:text-d-text"
                              onClick={(event) => event.stopPropagation()}
                              aria-label="View on Instagram"
                            >
                              <InstagramIcon className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                        <p className="truncate text-xs text-d-white">
                          {selectedFullImage.creator.handle}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-d-dark text-xs font-medium text-d-white backdrop-blur">
                        {hasToolLogo(selectedFullImage.modelId) && (
                          <img
                            src={getToolLogo(selectedFullImage.modelId)!}
                            alt={`${getModelDisplayName(selectedFullImage.modelId, selectedFullImage.modelLabel)} logo`}
                            className="w-4 h-4 rounded-sm object-cover"
                          />
                        )}
                        {getModelDisplayName(selectedFullImage.modelId, selectedFullImage.modelLabel)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-start gap-2 text-sm text-d-white">
                      <p className="flex-1 font-raleway leading-relaxed">{selectedFullImage.prompt}</p>
                      <button
                        type="button"
                        data-copy-button="true"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          void copyPromptToClipboard(selectedFullImage.prompt);
                        }}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        className="text-d-white transition-colors duration-200 hover:text-d-text"
                        aria-label="Copy prompt"
                        onMouseEnter={(event) => {
                          showHoverTooltip(event.currentTarget, `fullsize-copy-${selectedFullImage.id}`);
                        }}
                        onMouseLeave={() => {
                          hideHoverTooltip(`fullsize-copy-${selectedFullImage.id}`);
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-3 mb-1 flex items-center justify-between text-xs text-d-light">
                      <div className="flex items-center gap-4">
                        <span>{selectedFullImage.creator.location}</span>
                        <span>{selectedFullImage.timeAgo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedFullImage.tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className="rounded-full border border-d-dark px-3 py-1 text-xs font-medium text-d-white backdrop-blur bg-black/40 transition-colors duration-200 hover:text-d-text"
                            onClick={(event) => event.stopPropagation()}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};


export default Explore;
