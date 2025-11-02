import React, {
  useState,
  useRef,
  useMemo,
  useEffect,
  useCallback,
  useLayoutEffect,
  Suspense,
} from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  layout,
  text,
  glass,
  buttons,
  headings,
} from "../styles/designSystem";
import {
  ArrowUpRight,
  BookmarkCheck,
  BookmarkPlus,
  Check,
  Clock,
  Compass,
  Copy,
  Download,
  FolderPlus,
  Heart,
  MoreHorizontal,
  Palette,
  Share2,
  Sparkles,
  User,
  Settings,
  ChevronDown,
  Edit,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
  RefreshCw,
  Crown,
} from "lucide-react";
import { getPersistedValue, setPersistedValue } from "../lib/clientStorage";
import { debugError, debugLog, debugWarn } from "../utils/debug";
import { useDropdownScrollLock } from "../hooks/useDropdownScrollLock";
import { useAuth } from "../auth/useAuth";
import { VerticalGalleryNav } from "./shared/VerticalGalleryNav";
import { AI_MODELS } from './create/ModelSelector';
import type {
  Folder,
  GalleryImageLike,
  SerializedFolder,
  StoredGalleryImage,
} from "./create/types";
import { hydrateStoredGallery, serializeGallery } from "../utils/galleryStorage";
import { normalizeModelId } from '../utils/modelUtils';
import ModelBadge from './ModelBadge';


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
  mediaType?: "image" | "video";
  isPublic?: boolean;
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
    mediaType: "image",
    isPublic: true,
  },
  {
    id: "desert-dream",
    creator: {
      name: "Rafael Sol",
      handle: "@rafael.sol",
      avatarColor: "from-theme-white/70 via-slate-300/70 to-stone-400/70",
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
    mediaType: "image",
    isPublic: true,
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
    mediaType: "image",
    isPublic: true,
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
    mediaType: "image",
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
    mediaType: "image",
  },
  {
    id: "fjord-lullaby",
    creator: {
      name: "Soren Beck",
      handle: "@sorenbeck",
      avatarColor: "from-blue-400/70 via-sky-300/70 to-cyan-400/70",
      location: "Oslo, NO",
    },
    modelId: "gemini-2.5-flash-image",
    modelLabel: "Gemini Advanced",
    timeAgo: "1d ago",
    likes: 278,
    prompt:
      "Panoramic matte painting of aurora over Nordic fjord village, reflective water, painterly brushstrokes, cinematic contrast.",
    tags: ["landscape", "gemini", "aurora"],
    imageUrl:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
    orientation: "landscape",
    mediaType: "image",
  },
];

type AvatarGalleryItem = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  likes: number;
  publishedAgo: string;
  tags: string[];
  modelId: string;
  modelLabel?: string;
  shareUrl: string;
  accentGradient: string;
  creator: GalleryItem["creator"];
};

const avatarGallery: AvatarGalleryItem[] = [
  {
    id: "aurora-warden",
    name: "Aurora Warden",
    description:
      "Futuristic synth DJ persona with luminous braids, holographic makeup, and prism reflections that glow under club lighting.",
    imageUrl:
      "https://images.unsplash.com/photo-1521579770037-4d856ce018f9?auto=format&fit=crop&w=900&q=80",
    likes: 982,
    publishedAgo: "3h ago",
    tags: ["futuristic", "music", "neon"],
    modelId: "flux-1.1",
    modelLabel: "Flux Portrait",
    shareUrl: "https://www.daygen.ai/avatars/aurora-warden",
    accentGradient: "from-fuchsia-500/70 via-violet-500/60 to-sky-400/70",
    creator: {
      name: "Leah Wave",
      handle: "@leah.wave",
      avatarColor: "from-fuchsia-500/70 via-purple-400/70 to-sky-500/70",
      location: "Los Angeles, US",
    },
  },
  {
    id: "helix-protocol",
    name: "Helix Protocol",
    description:
      "Cinematic AI guide avatar crafted for startup pitch decks with confident gaze, sharp tailoring, and volumetric rim light.",
    imageUrl:
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
    likes: 861,
    publishedAgo: "6h ago",
    tags: ["professional", "corporate", "minimal"],
    modelId: "runway-gen4",
    modelLabel: "Runway Portrait",
    shareUrl: "https://www.daygen.ai/avatars/helix-protocol",
    accentGradient: "from-slate-300/70 via-blue-400/60 to-violet-500/70",
    creator: {
      name: "Tomas Meyer",
      handle: "@tmeyerstudio",
      avatarColor: "from-blue-400/70 via-sky-300/70 to-cyan-400/70",
      location: "Amsterdam, NL",
    },
  },
  {
    id: "ember-warden",
    name: "Ember Warden",
    description:
      "Mythic warrior avatar designed for RPG stream overlays, featuring ember-lit armor, freckles, and cinematic depth of field.",
    imageUrl:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=900&q=80",
    likes: 792,
    publishedAgo: "1d ago",
    tags: ["fantasy", "gaming", "hero"],
    modelId: "ideogram",
    modelLabel: "Ideogram Render",
    shareUrl: "https://www.daygen.ai/avatars/ember-warden",
    accentGradient: "from-amber-400/70 via-rose-500/60 to-purple-600/70",
    creator: {
      name: "Nia Frost",
      handle: "@niafrost",
      avatarColor: "from-rose-400/70 via-orange-300/70 to-amber-300/70",
      location: "Reykjavík, IS",
    },
  },
  {
    id: "solstice-echo",
    name: "Solstice Echo",
    description:
      "Slow-tv storyteller avatar with cinematic freckles, warm daylight palette, and gentle eye contact that works across languages.",
    imageUrl:
      "https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=900&q=80",
    likes: 744,
    publishedAgo: "2d ago",
    tags: ["lifestyle", "storyteller", "warm"],
    modelId: "gemini-2.5-flash-image",
    modelLabel: "Gemini Portrait",
    shareUrl: "https://www.daygen.ai/avatars/solstice-echo",
    accentGradient: "from-amber-300/70 via-emerald-300/60 to-sky-300/70",
    creator: {
      name: "Marin Cho",
      handle: "@marin.cho",
      avatarColor: "from-emerald-400/70 via-teal-400/70 to-lime-400/70",
      location: "Seoul, KR",
    },
  },
  {
    id: "noir-catalyst",
    name: "Noir Catalyst",
    description:
      "High-fashion editorial avatar tuned for campaign rollouts with moody lighting, crystal accessories, and sharp posing.",
    imageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80",
    likes: 701,
    publishedAgo: "3d ago",
    tags: ["fashion", "editorial", "dramatic"],
    modelId: "recraft",
    modelLabel: "Recraft Studio",
    shareUrl: "https://www.daygen.ai/avatars/noir-catalyst",
    accentGradient: "from-slate-900/70 via-purple-500/50 to-rose-500/60",
    creator: {
      name: "Isla Knox",
      handle: "@isla.knox",
      avatarColor: "from-indigo-500/70 via-purple-400/70 to-slate-500/70",
      location: "London, UK",
    },
  },
  {
    id: "cobalt-runner",
    name: "Cobalt Runner",
    description:
      "Esports shoutcaster avatar with kinetic hair lighting, vivid cyan accents, and headset-ready framing for stream overlays.",
    imageUrl:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
    likes: 668,
    publishedAgo: "5d ago",
    tags: ["gaming", "esports", "dynamic"],
    modelId: "flux-pro-1.1",
    modelLabel: "FLUX Pro 1.1",
    shareUrl: "https://www.daygen.ai/avatars/cobalt-runner",
    accentGradient: "from-cyan-500/70 via-blue-500/60 to-indigo-500/70",
    creator: {
      name: "Elliot Park",
      handle: "@elliot.park",
      avatarColor: "from-blue-400/70 via-sky-300/70 to-cyan-400/70",
      location: "Toronto, CA",
    },
  },
  {
    id: "lumen-anchor",
    name: "Lumen Anchor",
    description:
      "Newsroom-ready avatar built for daily briefing videos with softbox lighting, precise expression control, and neutral styling.",
    imageUrl:
      "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=900&q=80",
    likes: 642,
    publishedAgo: "1w ago",
    tags: ["broadcast", "news", "studio"],
    modelId: "runway-gen4",
    modelLabel: "Runway Broadcast",
    shareUrl: "https://www.daygen.ai/avatars/lumen-anchor",
    accentGradient: "from-sky-200/70 via-emerald-300/50 to-lime-300/60",
    creator: {
      name: "Priya Sen",
      handle: "@priyasync",
      avatarColor: "from-rose-400/70 via-orange-300/70 to-amber-300/70",
      location: "Singapore, SG",
    },
  },
];

const AVATAR_TAGS = Array.from(
  new Set(avatarGallery.flatMap(item => item.tags)),
).sort((a, b) => a.localeCompare(b));



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

const buildCreatorProfileUrl = (creator: GalleryItem["creator"]) =>
  `https://www.daygen.ai/explore?creator=${encodeURIComponent(creator.handle.replace(/^@/, ""))}`;

// ImageActionMenuPortal component (exact copy from Create.tsx)
const ImageActionMenuPortal: React.FC<{
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  isRecreateMenu?: boolean;
}> = ({ anchorEl, open, onClose, children, isRecreateMenu = false }) => {
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
    if (!open || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const width = Math.max(200, rect.width);
    const horizontalMargin = 8;
    const verticalOffset = 2;

    const availableLeft = Math.max(
      horizontalMargin,
      (typeof window !== "undefined"
        ? window.innerWidth - width - horizontalMargin
        : rect.left)
    );
    const left = Math.min(Math.max(horizontalMargin, rect.left), availableLeft);

    setPos({
      top: rect.bottom + verticalOffset,
      left,
      width,
    });
  }, [open, anchorEl]);

  useLayoutEffect(() => {
    if (!open || !anchorEl || !menuRef.current) return;
    if (typeof window === "undefined") return;

    const updatePosition = () => {
      if (!menuRef.current) return;
      if (typeof window === "undefined") return;
      const anchorRect = anchorEl.getBoundingClientRect();
      const menuRect = menuRef.current.getBoundingClientRect();
      const width = Math.max(200, anchorRect.width);
      const horizontalMargin = 8;
      const verticalOffset = 2;

      let top;
      if (isRecreateMenu) {
        // For recreate menu, always position above the button
        // Use actual menu height if available, otherwise use a more accurate estimate
        // The recreate menu has 3 items, each ~44px high (py-2 = 8px top + 8px bottom + text height)
        const actualHeight = menuRect.height > 0 ? menuRect.height : 140; // 3 * 44px + padding
        // Reduce margin to bring dropdown closer to button (no whitespace)
        top = Math.max(2, anchorRect.top - actualHeight - 2);
      } else {
        // Position below the button for other menus (full-size view)
        // Reduce margin to bring dropdown closer to button
        top = anchorRect.bottom + verticalOffset;
      }

      const availableLeft = Math.max(horizontalMargin, window.innerWidth - menuRect.width - horizontalMargin);
      const left = Math.min(
        Math.max(horizontalMargin, anchorRect.left),
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
      ref={(node) => {
        menuRef.current = node;
        setScrollableRef(node);
      }}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 1100,
      }}
      className={`image-gallery-actions-menu ${glass.promptDark} rounded-lg py-2`}
    >
      {children}
    </div>,
    document.body
  );
};

const getModelDisplayName = (modelId: string, label?: string) => {
  if (label) return label;
  const normalizedId = normalizeModelId(modelId);
  const model = AI_MODELS.find(m => m.id === normalizedId);
  return model?.name || normalizedId;
};

type AvatarCardVariant = "feature" | "spotlight" | "grid";

const AvatarCard: React.FC<{
  item: AvatarGalleryItem;
  variant: AvatarCardVariant;
  rank: number;
  likeCount: number;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}> = ({ item, variant, rank, likeCount, isFavorite, onToggleFavorite }) => {
  const isFeature = variant === "feature";
  const isSpotlight = variant === "spotlight";
  const padding = isFeature ? "p-8 sm:p-10" : isSpotlight ? "p-6 sm:p-7" : "p-6";
  const radius = "rounded-2xl";
  const minHeight = isFeature ? "min-h-[420px]" : isSpotlight ? "min-h-[280px]" : "min-h-[260px]";

  return (
    <article
      className={`relative overflow-hidden border border-theme-dark/70 bg-theme-black/40 ${radius} ${minHeight}`}
    >
      <img
        src={item.imageUrl}
        alt={`${item.name} avatar preview`}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className={`absolute inset-0 bg-gradient-to-br ${item.accentGradient} opacity-80 mix-blend-multiply`}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 card-overlay-gradient"
        aria-hidden="true"
      />

      <div className={`relative flex h-full flex-col justify-end gap-5 ${padding}`}>
        <div className="flex items-center justify-between text-xs text-white/80">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 uppercase tracking-[0.3em] ${
              isFeature
                ? "border-white/30 bg-white/10"
                : "border-white/20 bg-black/40"
            }`}
          >
            {isFeature ? <Crown className="size-3.5" aria-hidden="true" /> : <Sparkles className="size-3.5" aria-hidden="true" />}
            <span className="tracking-[0.1em]">Top #{rank}</span>
          </span>
          <span className="text-white/60">{item.publishedAgo}</span>
        </div>

        <div className="space-y-3">
          <h3
            className={`${
              isFeature
                ? "text-3xl sm:text-4xl"
                : isSpotlight
                  ? "text-2xl"
                  : "text-xl"
            } font-raleway font-light text-white`}
          >
            {item.name}
          </h3>
          <p className="max-w-xl text-sm text-white/80">{item.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative size-10 overflow-hidden rounded-full border border-white/20">
              <div className={`absolute inset-0 bg-gradient-to-br ${item.creator.avatarColor}`} aria-hidden="true" />
              <span className="relative flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                {getInitials(item.creator.name)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{item.creator.name}</p>
              <a
                href={buildCreatorProfileUrl(item.creator)}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs text-white/70 transition-colors duration-200 hover:text-white"
              >
                {item.creator.handle}
              </a>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs text-white/70">
            {getModelDisplayName(item.modelId, item.modelLabel)}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-xs text-white/80">
            {item.tags.map(tag => (
              <span
                key={tag}
                className="rounded-full border border-white/20 bg-black/50 px-3 py-1"
              >
                #{tag}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={event => {
              event.preventDefault();
              event.stopPropagation();
              onToggleFavorite(item.id);
            }}
            className={`inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1 text-xs font-medium transition-colors duration-200 ${
              isFavorite ? "bg-white/20 text-white" : "bg-black/40 text-white/70 hover:text-white"
            }`}
            aria-pressed={isFavorite}
          >
            <Heart
              className="size-3.5"
              aria-hidden="true"
              fill={isFavorite ? "currentColor" : "none"}
              strokeWidth={1.5}
            />
            {likeCount.toLocaleString()} likes
          </button>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-white">
          <a
            href={item.shareUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 font-raleway transition-colors duration-200 hover:bg-white/20"
          >
            View avatar
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
          {isFeature && (
            <a
              href={buildCreatorProfileUrl(item.creator)}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/40 px-4 py-2 font-raleway text-white/80 transition-colors duration-200 hover:text-white"
            >
              Creator profile
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </article>
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
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
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

  const toggleOption = (optionValue: string) => {
    if (values.includes(optionValue)) {
      onChange(values.filter(v => v !== optionValue));
    } else {
      onChange([...values, optionValue]);
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
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""} flex-shrink-0`} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className={`fixed rounded-lg shadow-lg z-[9999] max-h-64 overflow-y-auto ${glass.promptDark}`}
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

const Explore: React.FC = () => {
  // Filter state
  const [galleryFilters, setGalleryFilters] = useState<{
    models: string[];
    types: string[];
    tags: string[];
  }>({
    models: [],
    types: [],
    tags: [],
  });

  // Filter function for gallery
  const filterGalleryItems = useCallback((items: typeof galleryItems) => {
    return items.filter(item => {
      // Model filter
      if (galleryFilters.models.length > 0 && !galleryFilters.models.includes(item.modelId)) {
        return false;
      }
      
      // Type filter
      if (galleryFilters.types.length > 0) {
        const inferredVideo = item.modelId.includes('video') ||
          item.modelId === 'veo-3' ||
          item.modelId === 'runway-video-gen4' ||
          item.modelId === 'wan-video-2.2' ||
          item.modelId === 'hailuo-02' ||
          item.modelId === 'kling-video' ||
          item.modelId === 'seedance-1.0-pro' ||
          item.modelId === 'luma-ray-2';

        const itemType = item.mediaType ?? (inferredVideo ? 'video' : 'image');

        if (!galleryFilters.types.includes(itemType)) {
          return false;
        }
      }
      
      // Tag filter
      if (galleryFilters.tags.length > 0) {
        const hasMatchingTag = galleryFilters.tags.some(selectedTag => 
          item.tags.includes(selectedTag)
        );
        if (!hasMatchingTag) {
          return false;
        }
      }
      
      return true;
    });
  }, [galleryFilters]);

  const filteredGallery = useMemo(() => filterGalleryItems(galleryItems), [filterGalleryItems]);

  const navigate = useNavigate();
  const { storagePrefix } = useAuth();
  const [savedInspirations, setSavedInspirations] = useState<GalleryImageLike[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [savePrompt, setSavePrompt] = useState<{
    open: boolean;
    item: GalleryItem | null;
    imageUrl: string | null;
    alreadySaved: boolean;
  }>({ open: false, item: null, imageUrl: null, alreadySaved: false });
  
  const [unsaveConfirm, setUnsaveConfirm] = useState<{
    open: boolean;
    item: GalleryItem | null;
  }>({ open: false, item: null });
  const [newFolderName, setNewFolderName] = useState("");

  const savedImageUrls = useMemo(() => new Set(savedInspirations.map(item => item.url)), [savedInspirations]);

  // Copy notification state
  const [copyNotification, setCopyNotification] = useState<string | null>(null);

  // Favorites state
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [avatarFavorites, setAvatarFavorites] = useState<Set<string>>(new Set());
  const [activeGalleryView, setActiveGalleryView] = useState<"creations" | "avatars">("creations");
  const [avatarTagFilter, setAvatarTagFilter] = useState<string[]>([]);

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

  useEffect(() => {
    const loadAvatarFavorites = async () => {
      try {
        const stored = await getPersistedValue<string[]>('explore-', 'avatar-favorites');
        if (stored) {
          setAvatarFavorites(new Set(stored));
        }
      } catch (error) {
        debugError('Failed to load avatar favorites:', error);
      }
    };

    void loadAvatarFavorites();
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

  const persistAvatarFavorites = useCallback(async (next: Set<string>) => {
    try {
      await setPersistedValue('explore-', 'avatar-favorites', Array.from(next));
    } catch (error) {
      debugError('Failed to persist avatar favorites:', error);
    }
  }, []);

  const toggleAvatarFavorite = useCallback(
    (avatarId: string) => {
      setAvatarFavorites(prev => {
        const next = new Set(prev);
        if (next.has(avatarId)) {
          next.delete(avatarId);
        } else {
          next.add(avatarId);
        }
        void persistAvatarFavorites(next);
        return next;
      });
    },
    [persistAvatarFavorites],
  );

  const handleNavigateToAvatars = useCallback(() => {
    navigate('/create/avatars');
  }, [navigate]);

  const persistInspirations = useCallback(
    async (next: GalleryImageLike[]) => {
      try {
        await setPersistedValue(storagePrefix, 'inspirations', serializeGallery(next));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('daygen:gallery-updated'));
        }
      } catch (error) {
        debugError('Failed to persist gallery from explore:', error);
      }
    },
    [storagePrefix],
  );

  const persistFolders = useCallback(
    async (next: Folder[]) => {
      const serialised: SerializedFolder[] = next.map(folder => ({
        id: folder.id,
        name: folder.name,
        createdAt: folder.createdAt.toISOString(),
        imageIds: folder.imageIds,
        videoIds: folder.videoIds || [],
        customThumbnail: folder.customThumbnail,
      }));

      try {
        await setPersistedValue(storagePrefix, 'folders', serialised);
      } catch (error) {
        debugError('Failed to persist folders from explore:', error);
      }
    },
    [storagePrefix],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [storedGallery, storedFolders, storedInspirations] = await Promise.all([
          getPersistedValue<StoredGalleryImage[]>(storagePrefix, 'gallery'),
          getPersistedValue<SerializedFolder[]>(storagePrefix, 'folders'),
          getPersistedValue<StoredGalleryImage[]>(storagePrefix, 'inspirations'),
        ]);

        if (cancelled) return;

        let migratedInspirations: GalleryImageLike[] = [];
        if (Array.isArray(storedGallery)) {
          const hydrated = hydrateStoredGallery(storedGallery);
          migratedInspirations = hydrated.filter(item => item.savedFrom);
          if (migratedInspirations.length > 0) {
            const ownWorks = hydrated.filter(item => !item.savedFrom);
            void setPersistedValue(storagePrefix, 'gallery', serializeGallery(ownWorks));
          }
        }

        let restoredInspirations: GalleryImageLike[] = [];
        if (Array.isArray(storedInspirations)) {
          restoredInspirations = hydrateStoredGallery(storedInspirations);
        }

        const combinedInspirations = (() => {
          if (restoredInspirations.length === 0 && migratedInspirations.length === 0) {
            return [] as GalleryImageLike[];
          }
          const inspirationMap = new Map<string, GalleryImageLike>();
          [...restoredInspirations, ...migratedInspirations].forEach(item => {
            inspirationMap.set(item.url, item);
          });
          return Array.from(inspirationMap.values());
        })();

        if (combinedInspirations.length > 0) {
          setSavedInspirations(combinedInspirations);
          void setPersistedValue(storagePrefix, 'inspirations', serializeGallery(combinedInspirations));
        } else {
          setSavedInspirations([]);
        }

        if (Array.isArray(storedFolders)) {
          const restored = storedFolders.map(folder => ({
            ...folder,
            createdAt: new Date(folder.createdAt),
            videoIds: folder.videoIds || [],
          }));
          setFolders(prev => (prev.length > 0 ? prev : restored));
        } else {
          // Create default "inspirations" folder if no folders exist
          const defaultFolder: Folder = {
            id: 'inspirations-folder',
            name: 'Inspirations',
            createdAt: new Date(),
            imageIds: [],
            videoIds: [],
          };
          setFolders([defaultFolder]);
        }
      } catch (error) {
        debugError('Failed to load gallery from storage:', error);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [storagePrefix]);

  const assignedFolderIds = useMemo(() => {
    if (!savePrompt.imageUrl) return new Set<string>();
    return new Set(
      folders
        .filter(folder => folder.imageIds.includes(savePrompt.imageUrl!))
        .map(folder => folder.id),
    );
  }, [folders, savePrompt.imageUrl]);

  const getAvatarLikes = useCallback(
    (item: AvatarGalleryItem) => item.likes + (avatarFavorites.has(item.id) ? 1 : 0),
    [avatarFavorites],
  );

  const avatarLeaderboard = useMemo(
    () =>
      avatarGallery
        .slice()
        .sort((a, b) => getAvatarLikes(b) - getAvatarLikes(a)),
    [getAvatarLikes],
  );

  const filteredAvatars = useMemo(
    () =>
      avatarLeaderboard.filter(item =>
        avatarTagFilter.length === 0 || avatarTagFilter.some(tag => item.tags.includes(tag)),
      ),
    [avatarLeaderboard, avatarTagFilter],
  );

  const topAvatars = useMemo(
    () => filteredAvatars.slice(0, 3),
    [filteredAvatars],
  );

  const remainingAvatars = useMemo(
    () => filteredAvatars.slice(3),
    [filteredAvatars],
  );

  const closeSavePrompt = useCallback(() => {
    setSavePrompt({ open: false, item: null, imageUrl: null, alreadySaved: false });
    setNewFolderName("");
  }, []);

  const closeUnsaveConfirm = useCallback(() => {
    setUnsaveConfirm({ open: false, item: null });
  }, []);

  const handleUnsaveFromGallery = useCallback(
    (item: GalleryItem) => {
      setSavedInspirations(prev => {
        const next = prev.filter(img => img.url !== item.imageUrl);
        void persistInspirations(next);
        return next;
      });

      // Also remove from folders
      setFolders(prev => {
        const next = prev.map(folder => ({
          ...folder,
          imageIds: folder.imageIds.filter(url => url !== item.imageUrl),
        }));
        void persistFolders(next);
        return next;
      });

      closeUnsaveConfirm();
    },
    [persistInspirations, persistFolders, closeUnsaveConfirm],
  );

  const handleSaveToGallery = useCallback(
    (item: GalleryItem) => {
      const savedImage: GalleryImageLike = {
        url: item.imageUrl,
        prompt: item.prompt,
        model: item.modelId,
        timestamp: new Date().toISOString(),
        isPublic: true,
        savedFrom: {
          name: item.creator.name,
          handle: item.creator.handle,
          avatarColor: item.creator.avatarColor,
          profileUrl: buildCreatorProfileUrl(item.creator),
        },
      };

      let alreadySaved = false;
      setSavedInspirations(prev => {
        const exists = prev.some(img => img.url === savedImage.url);
        alreadySaved = exists;
        const next = exists
          ? prev.map(img =>
              img.url === savedImage.url
                ? {
                    ...img,
                    prompt: savedImage.prompt,
                    model: savedImage.model,
                    isPublic: savedImage.isPublic,
                    savedFrom: savedImage.savedFrom,
                  }
                : img,
            )
          : [savedImage, ...prev];

        void persistInspirations(next);
        return next;
      });

      setSavePrompt({ open: true, item, imageUrl: savedImage.url, alreadySaved });
      setNewFolderName("");
      
      // Automatically assign to "inspirations" folder if it exists
      const inspirationsFolder = folders.find(f => f.id === 'inspirations-folder');
      if (inspirationsFolder && !inspirationsFolder.imageIds.includes(savedImage.url)) {
        setFolders(prev => {
          const next = prev.map(folder => {
            if (folder.id === 'inspirations-folder') {
              return { ...folder, imageIds: [...folder.imageIds, savedImage.url] };
            }
            return folder;
          });
          void persistFolders(next);
          return next;
        });
      }
    },
    [persistInspirations, persistFolders, folders],
  );

  const toggleImageFolderAssignment = useCallback(
    (folderId: string) => {
      if (!savePrompt.imageUrl) return;
      
      // Prevent unchecking the "inspirations" folder
      if (folderId === 'inspirations-folder') return;
      
      setFolders(prev => {
        const next = prev.map(folder => {
          if (folder.id !== folderId) return folder;
          const hasImage = folder.imageIds.includes(savePrompt.imageUrl!);
          const imageIds = hasImage
            ? folder.imageIds.filter(url => url !== savePrompt.imageUrl)
            : [...folder.imageIds, savePrompt.imageUrl!];
          return { ...folder, imageIds };
        });
        void persistFolders(next);
        return next;
      });
    },
    [persistFolders, savePrompt.imageUrl],
  );

  const handleCreateFolderFromDialog = useCallback(() => {
    if (!savePrompt.imageUrl) return;
    const trimmed = newFolderName.trim();
    if (!trimmed) return;

    const duplicate = folders.some(folder => folder.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) return;

    const newFolder: Folder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmed,
      createdAt: new Date(),
      imageIds: [savePrompt.imageUrl],
      videoIds: [],
    };

    setFolders(prev => {
      const next = [...prev, newFolder];
      void persistFolders(next);
      return next;
    });

    setNewFolderName("");
  }, [folders, newFolderName, persistFolders, savePrompt.imageUrl]);

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
  const [galleryNavWidth, setGalleryNavWidth] = useState(0);
  const [fullSizePadding, setFullSizePadding] = useState<{ left: number; right: number }>(() => ({
    left: 24,
    right: 24,
  }));

  const updateFullSizePadding = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const computedStyles = getComputedStyle(document.documentElement);
    const rawPadding = computedStyles.getPropertyValue("--container-inline-padding").trim();
    const parsedPadding = Number.parseFloat(rawPadding);
    const basePadding = Number.isFinite(parsedPadding) ? parsedPadding : 24;
    const sideGap = 24;
    const baseGap = basePadding + sideGap;
    const leftSidebarElement =
      document.querySelector<HTMLElement>('[data-create-sidebar="true"]') ??
      document.querySelector<HTMLElement>('[aria-label="Create navigation"]');
    const leftSidebarRect = leftSidebarElement?.getBoundingClientRect();
    const hasVisibleLeftSidebar = Boolean(leftSidebarRect && leftSidebarRect.width > 0);
    const navWidth = galleryNavWidth > 0 ? galleryNavWidth : 0;

    const nextLeft = hasVisibleLeftSidebar && leftSidebarRect
      ? Math.max(baseGap, leftSidebarRect.right + sideGap)
      : baseGap;
    const nextRight = baseGap + navWidth;

    setFullSizePadding(prev =>
      prev.left !== nextLeft || prev.right !== nextRight ? { left: nextLeft, right: nextRight } : prev,
    );
  }, [galleryNavWidth]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!isFullSizeOpen) {
      return;
    }

    updateFullSizePadding();

    const handleResize = () => {
      updateFullSizePadding();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isFullSizeOpen, updateFullSizePadding]);

  const handleGalleryNavWidthChange = useCallback((width: number) => {
    const normalizedWidth = Math.round(width);
    setGalleryNavWidth(prev => (prev !== normalizedWidth ? normalizedWidth : prev));
  }, []);

  // Copy prompt function
  const copyPromptToClipboard = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyNotification('Link copied!');
      setTimeout(() => setCopyNotification(null), 2000);
    } catch (err) {
      debugError('Failed to copy prompt:', err);
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
    
    debugLog('Creating tooltip for ID:', tooltipId);
    
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
    
    debugLog('Tooltip created and positioned at:', {
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
  const navigateFullSizeImage = useCallback((direction: 'prev' | 'next') => {
    const totalImages = filteredGallery.length;
    if (totalImages === 0) return;
    
    const newIndex = direction === 'prev' 
      ? (currentImageIndex > 0 ? currentImageIndex - 1 : totalImages - 1)
      : (currentImageIndex < totalImages - 1 ? currentImageIndex + 1 : 0);
    
    setCurrentImageIndex(newIndex);
    setSelectedFullImage(filteredGallery[newIndex]);
  }, [filteredGallery, currentImageIndex, setCurrentImageIndex, setSelectedFullImage]);

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
      debugError('Failed to copy link:', error);
      setCopyNotification('Failed to copy link');
      setTimeout(() => setCopyNotification(null), 2000);
    }
  };

  const downloadImage = async (item: GalleryItem) => {
    try {
      // Try to fetch the image first
      let blob: Blob;
      try {
        const response = await fetch(item.imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        blob = await response.blob();
      } catch (fetchError) {
        debugWarn('Fetch failed, trying direct download:', fetchError);
        // Fallback: create a direct download link
        const a = document.createElement('a');
        a.href = item.imageUrl;
        a.download = `daygen-${item.id}-${Date.now()}.jpg`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        closeMoreActionMenu();
        return;
      }
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `daygen-${item.id}-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      closeMoreActionMenu();
    } catch (error) {
      debugError('Failed to download image:', error);
      setCopyNotification('Failed to download image');
      setTimeout(() => setCopyNotification(null), 2000);
    }
  };

  // Helper functions for filters
  const getAllUniqueTags = () => {
    const allTags = galleryItems.flatMap(item => item.tags);
    const uniqueTags = Array.from(new Set(allTags)).sort();
    return uniqueTags;
  };

  const getAvailableModels = () => {
    if (galleryFilters.types.length === 0) {
      // No type filter - show all models
      return AI_MODELS.map(model => model.id).sort();
    }
    
    const includesImage = galleryFilters.types.includes('image');
    const includesVideo = galleryFilters.types.includes('video');
    
    if (includesImage && includesVideo) {
      // Both selected - show all models
      return AI_MODELS.map(model => model.id).sort();
    } else if (includesVideo) {
      // Return video models only
      return AI_MODELS.filter(model => 
        model.id === 'veo-3' || 
        model.id === 'runway-video-gen4' ||
        model.id === 'wan-video-2.2' ||
        model.id === 'hailuo-02' ||
        model.id === 'kling-video' ||
        model.id === 'seedance-1.0-pro' ||
        model.id === 'luma-ray-2'
      ).map(model => model.id).sort();
    } else if (includesImage) {
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
    }
    
    return AI_MODELS.map(model => model.id).sort();
  };


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
  }, [isFullSizeOpen, currentImageIndex, filteredGallery, navigateFullSizeImage]);

  return (
    <div className={`${layout.page} explore-page`}>
      {/* Copy notification */}
      {copyNotification && (
        <div className={`fixed top-1/2 left-1/2 z-[100] -translate-x-1/2 -translate-y-1/2 transform px-4 py-2 text-sm text-theme-white font-raleway transition-all duration-100 ${glass.promptDark} rounded-[20px]`}>
          {copyNotification}
        </div>
      )}
      
      <div className="relative isolate">
        <div className={`${layout.backdrop}`} aria-hidden />

        <section className="relative pb-12 pt-[calc(var(--nav-h,4rem)+16px)]">
          <div className={`${layout.container} space-y-1`}>
            <header className="mb-6">
              <div className={headings.tripleHeading.container}>
                <p className={headings.tripleHeading.eyebrow}>
                  <Compass className="h-4 w-4" />
                  Community
                </p>
                <h1 className={`${text.sectionHeading} ${headings.tripleHeading.mainHeading} text-theme-text`}>
                  Explore creations from our community.
                </h1>
                <p className={headings.tripleHeading.description}>
                  Get inspired by featured works from our community members, save your favorites, and recreate stand-out prompts across the best AI models.
                </p>
              </div>
            </header>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.28em] text-theme-white/60">View</span>
                <div className="inline-flex rounded-full border border-theme-dark/70 bg-theme-black/40 p-1">
                  <button
                    type="button"
                    aria-pressed={activeGalleryView === 'creations'}
                    onClick={() => setActiveGalleryView('creations')}
                    className={`px-4 py-1.5 text-xs font-semibold font-raleway rounded-full transition-colors duration-200 ${
                      activeGalleryView === 'creations'
                        ? 'bg-theme-white text-theme-black shadow-lg shadow-theme-white/20'
                        : 'text-theme-white/70 hover:text-theme-text'
                    }`}
                  >
                    Creations
                  </button>
                  <button
                    type="button"
                    aria-pressed={activeGalleryView === 'avatars'}
                    onClick={() => setActiveGalleryView('avatars')}
                    className={`px-4 py-1.5 text-xs font-semibold font-raleway rounded-full transition-colors duration-200 ${
                      activeGalleryView === 'avatars'
                        ? 'bg-theme-white text-theme-black shadow-lg shadow-theme-white/20'
                        : 'text-theme-white/70 hover:text-theme-text'
                    }`}
                  >
                    Avatars
                  </button>
                </div>
              </div>
              {activeGalleryView === 'avatars' && (
                <button
                  type="button"
                  onClick={handleNavigateToAvatars}
                  className={buttons.glassPromptCompact}
                >
                  Launch avatar studio
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>

            {activeGalleryView === 'creations' ? (
              <>
                {/* Tag Filter Bar */}
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2">
                    {getAllUniqueTags().map((tag) => {
                      const isSelected = galleryFilters.tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setGalleryFilters(prev => ({
                                ...prev,
                                tags: prev.tags.filter(t => t !== tag)
                              }));
                            } else {
                              setGalleryFilters(prev => ({
                                ...prev,
                                tags: [...prev.tags, tag]
                              }));
                            }
                          }}
                          className={`px-4 py-2 rounded-full text-sm font-raleway transition-all duration-100 ${
                            isSelected
                              ? 'bg-theme-white text-theme-black border border-theme-white shadow-lg shadow-theme-white/20'
                              : 'bg-theme-black/40 text-theme-white border border-theme-dark hover:border-theme-mid hover:text-theme-text'
                          }`}
                        >
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Filters Section */}
                <div className={`mb-0 p-3 ${glass.promptDark} rounded-[20px]`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-theme-text" />
                      <h3 className="text-sm font-raleway text-theme-white">Filters</h3>
                    </div>
                    <button
                      onClick={() =>
                        setGalleryFilters({
                        models: [],
                        types: [],
                        tags: [],
                      })
                      }
                      className="px-2.5 py-1 text-xs text-theme-white hover:text-theme-text transition-colors duration-200 font-raleway"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Main filter grid: Modality and Model */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Modality Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-theme-white/70 font-raleway">Modality</label>
                      <CustomMultiSelect
                        values={galleryFilters.types}
                        onChange={types => {
                          setGalleryFilters(prev => ({
                            ...prev,
                            types,
                            models: [],
                          }));
                        }}
                        options={[
                          { value: "image", label: "Image" },
                          { value: "video", label: "Video" },
                        ]}
                        placeholder="All modalities"
                      />
                      {/* Selected Modality Tags - appears right below the dropdown */}
                      {galleryFilters.types.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {galleryFilters.types.map(type => {
                            return (
                              <div
                                key={type}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-text/20 text-theme-white rounded-full text-xs font-raleway border border-theme-text/30"
                              >
                                <span>{type === 'image' ? 'Image' : 'Video'}</span>
                                <button
                                  type="button"
                                  onClick={() => setGalleryFilters(prev => ({
                                    ...prev,
                                    types: prev.types.filter(t => t !== type),
                                    models: []
                                  }))}
                                  className="hover:text-theme-text transition-colors duration-200"
                                  aria-label={`Remove ${type === 'image' ? 'Image' : 'Video'}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Model Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-theme-white/70 font-raleway">Model</label>
                      <CustomMultiSelect
                        values={galleryFilters.models}
                        onChange={models => setGalleryFilters(prev => ({ ...prev, models }))}
                        options={getAvailableModels().map(modelId => {
                          const model = AI_MODELS.find(m => m.id === modelId);
                          return { value: modelId, label: model?.name || modelId };
                        })}
                        placeholder="All models"
                      />
                      {/* Selected Model Tags - appears right below the dropdown */}
                      {galleryFilters.models.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {galleryFilters.models.map(modelId => {
                            const model = AI_MODELS.find(m => m.id === modelId);
                            return (
                              <div
                                key={modelId}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-text/20 text-theme-white rounded-full text-xs font-raleway border border-theme-text/30"
                              >
                                <span>{model?.name || modelId}</span>
                                <button
                                  type="button"
                                  onClick={() => setGalleryFilters(prev => ({
                                    ...prev,
                                    models: prev.models.filter(m => m !== modelId)
                                  }))}
                                  className="hover:text-theme-text transition-colors duration-200"
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
                  </div>
                </div>
              </>
            ) : (
              <>
                <p className={`${text.body} max-w-3xl text-theme-white mt-6`}>
                  Spotlight community-made avatars that have been shared publicly. Filter by vibe, save the ones you love, and discover new creators to collaborate with.
                </p>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-raleway text-theme-text">Filters</h4>
                    <button
                      type="button"
                      onClick={() => setAvatarTagFilter([])}
                      className="text-xs text-theme-white/70 hover:text-theme-text transition-colors duration-200 font-raleway"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Avatar Tags Filter */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-theme-white/70 font-raleway">Tags</label>
                      <CustomMultiSelect
                        values={avatarTagFilter}
                        onChange={tags => setAvatarTagFilter(tags)}
                        options={AVATAR_TAGS.map(tag => ({
                          value: tag,
                          label: `#${tag}`,
                        }))}
                        placeholder="All tags"
                      />
                      {/* Selected Avatar Tags - appears right below the dropdown */}
                      {avatarTagFilter.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {avatarTagFilter.map(tag => (
                            <div
                              key={tag}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-theme-text/20 text-theme-white rounded-full text-xs font-raleway border border-theme-text/30"
                            >
                              <span>#{tag}</span>
                              <button
                                type="button"
                                onClick={() => setAvatarTagFilter(prev => prev.filter(t => t !== tag))}
                                className="hover:text-theme-text transition-colors duration-200"
                                aria-label={`Remove ${tag} tag`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          </section>

        {activeGalleryView === 'creations' ? (
          <section className="relative pb-12 -mt-6">
          <div className={`${layout.container}`}>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {visibleGallery.map((item) => {
                const isMenuActive = moreActionMenu?.id === item.id;
                const isSaved = savedImageUrls.has(item.imageUrl);
                return (
                  <article
                    key={item.id}
                    className="group relative overflow-hidden rounded-2xl border border-theme-dark hover:border-theme-mid transition-colors duration-200 bg-theme-black/40 shadow-[0_24px_70px_rgba(0,0,0,0.45)] parallax-small cursor-pointer"
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

                    <div className="image-gallery-actions absolute left-4 top-4 flex items-center gap-2 transition-opacity duration-100 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto">
                      <div className="relative">
                        <button
                          type="button"
                          className={`image-action-btn image-action-btn--labelled parallax-large transition-opacity duration-100 ${
                            recreateActionMenu?.id === item.id
                              ? 'opacity-100 pointer-events-auto'
                              : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
                          }`}
                          aria-haspopup="menu"
                          aria-expanded={recreateActionMenu?.id === item.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleRecreateActionMenu(item.id, event.currentTarget, item);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                          <span className="text-sm font-medium">Recreate</span>
                        </button>
                        <ImageActionMenuPortal
                          anchorEl={recreateActionMenu?.id === item.id ? recreateActionMenu?.anchor ?? null : null}
                          open={recreateActionMenu?.id === item.id && !isFullSizeOpen}
                          onClose={closeRecreateActionMenu}
                          isRecreateMenu={false}
                        >
                          <button
                            type="button"
                            className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
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
                            className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
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
                            className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
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

                    <div
                      className={`image-gallery-actions absolute right-4 top-4 flex items-center gap-1 transition-opacity duration-100 ${
                        isMenuActive
                          ? 'opacity-100 pointer-events-auto'
                          : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (isSaved) {
                            setUnsaveConfirm({ open: true, item });
                          } else {
                            handleSaveToGallery(item);
                          }
                        }}
                        className={`image-action-btn image-action-btn--labelled parallax-large ${
                          isSaved ? 'border-theme-white/50 bg-theme-white/10 text-theme-text' : ''
                        }`}
                        aria-pressed={isSaved}
                        aria-label={isSaved ? 'Remove from your gallery' : 'Save to your gallery'}
                      >
                        {isSaved ? (
                          <BookmarkCheck className="size-3.5" aria-hidden="true" />
                        ) : (
                          <BookmarkPlus className="size-3.5" aria-hidden="true" />
                        )}
                        {isSaved ? 'Saved' : 'Save'}
                      </button>
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
                            className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                            onClick={async (event) => {
                              event.stopPropagation();
                              await copyImageLink(item);
                            }}
                          >
                            <Share2 className="h-4 w-4" />
                            Copy link
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                            onClick={async (event) => {
                              event.stopPropagation();
                              await downloadImage(item);
                            }}
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </button>
                        </ImageActionMenuPortal>
                      </div>
                    </div>

                    <div
                      className={`PromptDescriptionBar absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out pointer-events-auto hidden lg:flex items-end z-10 ${
                        isMenuActive
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <div className="w-full p-4">
                        <div className="mb-2">
                          <div className="relative">
                            <p className="text-theme-text text-xs font-raleway leading-relaxed line-clamp-3 pl-1">
                              {item.prompt}
                              <button
                                data-copy-button="true"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  void copyPromptToClipboard(item.prompt);
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                className="ml-2 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle pointer-events-auto"
                                onMouseEnter={(e) => {
                                  showHoverTooltip(e.currentTarget, `copy-${item.id}`);
                                }}
                                onMouseLeave={() => {
                                  hideHoverTooltip(`copy-${item.id}`);
                                }}
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <Suspense fallback={null}>
                            <ModelBadge model={item.modelId ?? 'unknown'} size="md" />
                          </Suspense>
                        </div>
                      </div>
                    </div>
                  </div>
                  </article>
                );
              })}
              <div ref={loadMoreRef} aria-hidden />
            </div>
            {visibleGallery.length < filteredGallery.length && (
              <div className="flex justify-center py-4 text-xs font-raleway text-theme-white/60" aria-live="polite">
                Loading more inspiration…
              </div>
            )}
          </div>
        </section>
        ) : (
        <section className="relative pb-12 -mt-6">
          <div className={`${layout.container} space-y-8`}>
            {filteredAvatars.length === 0 ? (
              <div className={`rounded-2xl border border-theme-dark/70 bg-theme-black/40 p-10 text-center text-theme-white/80 ${glass.promptDark}`}>
                <p className="text-lg font-raleway text-theme-white">No public avatars match this vibe yet.</p>
                <p className="mt-2 text-sm text-theme-white/70">
                  Publish one from the avatars studio or adjust your filters to explore more community styles.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAvatarTagFilter([])}
                    className={buttons.glassPrompt}
                  >
                    Reset filters
                    <RefreshCw className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNavigateToAvatars}
                    className={buttons.glassPrompt}
                  >
                    Create an avatar
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                {topAvatars.length > 0 && (
                  <div className="grid gap-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                    <AvatarCard
                      key={topAvatars[0].id}
                      item={topAvatars[0]}
                      variant="feature"
                      rank={1}
                      likeCount={getAvatarLikes(topAvatars[0])}
                      isFavorite={avatarFavorites.has(topAvatars[0].id)}
                      onToggleFavorite={toggleAvatarFavorite}
                    />
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                      {topAvatars.slice(1).map((avatar, index) => (
                        <AvatarCard
                          key={avatar.id}
                          item={avatar}
                          variant="spotlight"
                          rank={index + 2}
                          likeCount={getAvatarLikes(avatar)}
                          isFavorite={avatarFavorites.has(avatar.id)}
                          onToggleFavorite={toggleAvatarFavorite}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {remainingAvatars.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {remainingAvatars.map((avatar, index) => (
                      <AvatarCard
                        key={avatar.id}
                        item={avatar}
                        variant="grid"
                        rank={index + 1 + topAvatars.length}
                        likeCount={getAvatarLikes(avatar)}
                        isFavorite={avatarFavorites.has(avatar.id)}
                        onToggleFavorite={toggleAvatarFavorite}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
        )}



        <section className="relative pb-20">
          <div className={`${layout.container}`}>
            <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-6">
                <p className={`${text.eyebrow} text-theme-white/70`}>Community</p>
                <div className="space-y-4">
                  <h2 className="text-balance font-raleway text-4xl font-light text-theme-white sm:text-5xl md:text-6xl">
                    Discover the daygen community gallery
                  </h2>
                  <p className="max-w-xl font-raleway text-lg text-theme-white/75">
                    Browse the newest drops from creators mastering the latest AI tooling. Filter by style, model, and mood to follow your next creative spark.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <button type="button" className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors duration-200 ${glass.promptDark} font-raleway text-xs text-theme-white border-theme-dark hover:border-theme-text hover:text-theme-text`}>
                    Share your creation
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-colors duration-200 ${glass.promptDark} font-raleway text-xs text-theme-white border-theme-dark hover:border-theme-text hover:text-theme-text`}>
                    View submission guide
                  </button>
                </div>
              </div>

              <div className="grid gap-4 text-left text-sm font-raleway text-theme-white/80 sm:grid-cols-2">
                <div className={`${glass.surface} border border-theme-dark/70 bg-theme-black/40 p-5`}> 
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-theme-white/60">
                    <Sparkles className="size-4" aria-hidden="true" />
                    Trending
                  </div>
                  <p className="mt-3 text-3xl font-light text-theme-white">3.2K+</p>
                  <p className="text-xs text-theme-white/60">new images shared this week</p>
                </div>
                <div className={`${glass.surface} border border-theme-dark/70 bg-theme-black/40 p-5`}>
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-theme-white/60">
                    <User className="size-4" aria-hidden="true" />
                    Creators
                  </div>
                  <p className="mt-3 text-3xl font-light text-theme-white">870</p>
                  <p className="text-xs text-theme-white/60">featured artists this month</p>
                </div>
                <div className={`${glass.surface} border border-theme-dark/70 bg-theme-black/40 p-5`}> 
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-theme-white/60">
                    <Clock className="size-4" aria-hidden="true" />
                    Live feed
                  </div>
                  <ul className="mt-4 space-y-3 text-xs text-theme-white/70">
                    {recentActivity.map((item) => (
                      <li
                        key={`${item.creator}-${item.timeAgo}`}
                        className="flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-medium text-theme-white">{item.creator}</p>
                          <p className="text-theme-white/60">{item.action}</p>
                        </div>
                        <span className="whitespace-nowrap text-theme-white/50">{item.timeAgo}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`${glass.surface} border border-theme-dark/70 bg-theme-black/40 p-5`}> 
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-theme-white/60">
                    <Palette className="size-4" aria-hidden="true" />
                    Styles
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-theme-white/70">
                    {styleFilters.slice(0, 5).map((filter) => (
                      <span
                        key={filter}
                        className="rounded-full border border-theme-dark/70 px-3 py-1 text-theme-white/70"
                      >
                        {filter}
                      </span>
                    ))}
                    <span className="rounded-full border border-theme-dark/70 px-3 py-1 text-theme-white/60">
                      +{styleFilters.length - 5}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {savePrompt.open && savePrompt.item && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-theme-black/80 px-4 py-8"
            onClick={closeSavePrompt}
            >
              <div
                className={`${glass.promptDark} relative w-full max-w-3xl rounded-2xl border border-theme-dark/70 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.55)]`}
                onClick={event => event.stopPropagation()}
              >
              <button
                type="button"
                onClick={closeSavePrompt}
                className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full border border-theme-dark/60 text-theme-white/70 transition-colors duration-200 hover:text-theme-text"
                aria-label="Close save dialog"
              >
                <X className="size-4" />
              </button>

              <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-[24px] border border-theme-dark/70 w-1/2">
                    <img
                      src={savePrompt.item.imageUrl}
                      alt={`Saved inspiration ${savePrompt.item.id}`}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  </div>
                  <div className="space-y-3 rounded-[20px] border border-theme-dark/70 bg-theme-black/40 p-4">
                    <span className="inline-flex items-center gap-2 rounded-full border border-theme-dark/70 px-3 py-1 text-[11px] font-raleway uppercase tracking-[0.24em] text-theme-white/60">
                      Save inspiration
                      {savePrompt.alreadySaved && <span className="rounded-full bg-theme-white/10 px-2 py-0.5 text-[10px] font-semibold text-theme-text">updated</span>}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="relative size-8 overflow-hidden rounded-full">
                        <div className={`absolute inset-0 bg-gradient-to-br ${savePrompt.item.creator.avatarColor}`} aria-hidden="true" />
                        <span className="relative flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                          {getInitials(savePrompt.item.creator.name)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-raleway text-theme-white">{savePrompt.item.creator.name}</p>
                        <p className="truncate text-xs text-theme-white/60">{savePrompt.item.creator.handle}</p>
                      </div>
                      <a
                        href={buildCreatorProfileUrl(savePrompt.item.creator)}
                        target="_blank"
                        rel="noreferrer noopener"
                        className={`ml-auto ${buttons.glassPromptCompact}`}
                      >
                        View profile
                        <ArrowUpRight className="size-3.5" />
                      </a>
                    </div>
                    <p className="text-sm font-raleway leading-relaxed text-theme-white">{savePrompt.item.prompt}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="space-y-3">
                    <h3 className="text-xl font-raleway font-light text-theme-text">Add to a folder</h3>
                    <p className="text-sm text-theme-white">
                      Choose folders to keep this inspiration close. You can manage folders anytime from your gallery.
                    </p>
                    <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                      {folders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 rounded-[20px] border border-theme-dark/70 bg-theme-black/30 py-8 text-center text-theme-white/70">
                          <FolderPlus className="size-8 text-theme-white/50" />
                          <p className="max-w-xs text-sm font-raleway text-theme-white/70">
                            You don’t have any folders yet. Create one to organise your saved inspirations.
                          </p>
                        </div>
                      ) : (
                        folders.map(folder => {
                          const isAssigned = assignedFolderIds.has(folder.id);
                          const isInspirationsFolder = folder.id === 'inspirations-folder';
                          return (
                            <button
                              key={folder.id}
                              type="button"
                              onClick={() => !isInspirationsFolder && toggleImageFolderAssignment(folder.id)}
                              disabled={isInspirationsFolder}
                              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors duration-200 ${
                                isInspirationsFolder
                                  ? 'border-theme-white/70 bg-theme-white/10 text-theme-text shadow-lg shadow-theme-white/10 cursor-default'
                                  : isAssigned
                                    ? 'border-theme-white/70 bg-theme-white/10 text-theme-text shadow-lg shadow-theme-white/10'
                                    : 'border-theme-dark bg-theme-black/30 text-theme-white/80 hover:border-theme-mid hover:text-theme-text'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="flex-shrink-0">
                                  {folder.customThumbnail ? (
                                    <div className="w-8 h-8 rounded-lg overflow-hidden">
                                      <img
                                        src={folder.customThumbnail}
                                        alt={`${folder.name} thumbnail`}
                                        loading="lazy"
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-theme-dark/50 flex items-center justify-center">
                                      <FolderPlus className="w-4 h-4 text-theme-white/50" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-raleway">{folder.name}</p>
                                  <p className="text-xs text-theme-white/60">{folder.imageIds.length} saved</p>
                                </div>
                              </div>
                              <span
                                className={`ml-3 inline-flex h-6 w-6 items-center justify-center rounded-full border ${
                                  (isAssigned || isInspirationsFolder) ? 'border-theme-text bg-theme-text text-b-black' : 'border-theme-mid text-theme-white/50'
                                }`}
                              >
                                {(isAssigned || isInspirationsFolder) && <Check className="h-3.5 w-3.5" />}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <button
                      onClick={() => {
                        setNewFolderName("");
                        // This will trigger the folder creation flow
                        const trimmed = prompt("Enter folder name:");
                        if (trimmed) {
                          setNewFolderName(trimmed);
                          handleCreateFolderFromDialog();
                        }
                      }}
                      className={`${buttons.ghostCompact} cursor-pointer text-sm`}
                      title="Create new folder"
                      aria-label="Create new folder"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New folder
                    </button>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeSavePrompt}
                      className={buttons.primary}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full-size image modal */}
        {isFullSizeOpen && selectedFullImage && (
          <div
            className="fixed inset-0 z-[60] bg-theme-black/80 flex items-start justify-center py-4"
            style={{
              paddingLeft: `${fullSizePadding.left}px`,
              paddingRight: `${fullSizePadding.right}px`,
            }}
            onClick={closeFullSizeView}
          >
            <div className="relative max-w-[95vw] max-h-[90vh] group flex items-start justify-center mt-14" style={{ transform: 'translateX(-50px)' }} onClick={(e) => e.stopPropagation()}>
              {/* Navigation arrows for full-size modal */}
              {filteredGallery.length > 1 && (
                <>
                  <button
                    onClick={() => navigateFullSizeImage('prev')}
                    className={`${glass.promptDark} absolute left-4 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-theme-text`}
                    title="Previous image (←)"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5 text-current transition-colors duration-100" />
                  </button>
                  <button
                    onClick={() => navigateFullSizeImage('next')}
                    className={`${glass.promptDark} absolute right-4 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-theme-text`}
                    title="Next image (→)"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
              
              <img
                src={selectedFullImage.imageUrl}
                alt={`Image by ${selectedFullImage.creator.name}`}
                loading="lazy"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                style={{ objectPosition: 'top' }}
              />
              
              {/* Action buttons */}
              <div className="image-gallery-actions absolute inset-x-0 top-0 flex items-start justify-between gap-2 px-4 pt-4 pointer-events-none">
                {/* Left side - Recreate button */}
                <div className="relative">
                  <button
                    type="button"
                    className={`image-action-btn image-action-btn--labelled parallax-large transition-opacity duration-100 ${
                      recreateActionMenu?.id === selectedFullImage.id
                        ? 'opacity-100 pointer-events-auto'
                        : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
                    }`}
                    aria-haspopup="menu"
                    aria-expanded={recreateActionMenu?.id === selectedFullImage.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleRecreateActionMenu(selectedFullImage.id, event.currentTarget, selectedFullImage);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                    <span className="text-sm font-medium">Recreate</span>
                  </button>
                  <ImageActionMenuPortal
                    anchorEl={recreateActionMenu?.id === selectedFullImage.id ? recreateActionMenu?.anchor ?? null : null}
                    open={recreateActionMenu?.id === selectedFullImage.id}
                    onClose={closeRecreateActionMenu}
                    isRecreateMenu={false}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleRecreateEdit(selectedFullImage);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                      Edit image
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleRecreateUseAsReference(selectedFullImage);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                      Use as reference
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleRecreateRunPrompt(selectedFullImage);
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Run the same prompt
                    </button>
                  </ImageActionMenuPortal>
                </div>

                {/* Right side - Heart, More, and Close buttons */}
                <div className="flex items-center gap-2">
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
                        if (selectedFullImage) {
                          toggleFavorite(selectedFullImage.imageUrl);
                        }
                      }}
                      className="image-action-btn image-action-btn--labelled parallax-large favorite-toggle pointer-events-auto"
                      aria-label={selectedFullImage && favorites.has(selectedFullImage.imageUrl) ? "Remove from liked" : "Add to liked"}
                    >
                      <Heart
                        className={`w-3 h-3 transition-colors duration-100 ${
                          selectedFullImage && favorites.has(selectedFullImage.imageUrl) ? 'fill-red-500 text-red-500' : 'text-current fill-none'
                        }`}
                        aria-hidden="true"
                      />
                      {selectedFullImage ? getDisplayLikes(selectedFullImage) : 0}
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleMoreActionMenu(selectedFullImage.id, event.currentTarget, selectedFullImage);
                        }}
                        className="image-action-btn image-action-btn--fullsize parallax-large pointer-events-auto"
                        aria-label="More options"
                      >
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                      </button>
                      <ImageActionMenuPortal
                        anchorEl={moreActionMenu?.id === selectedFullImage?.id ? moreActionMenu?.anchor ?? null : null}
                        open={moreActionMenu?.id === selectedFullImage?.id}
                        onClose={closeMoreActionMenu}
                        isRecreateMenu={false}
                      >
                        <button
                          type="button"
                          className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                          onClick={async (event) => {
                            event.stopPropagation();
                            await copyImageLink(selectedFullImage);
                          }}
                        >
                          <Share2 className="h-4 w-4" />
                          Copy link
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                          onClick={async (event) => {
                            event.stopPropagation();
                            await downloadImage(selectedFullImage);
                          }}
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </button>
                      </ImageActionMenuPortal>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeFullSizeView}
                    className="image-action-btn image-action-btn--fullsize parallax-large pointer-events-auto"
                    aria-label="Close"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Image info overlay */}
              <div
                className={`PromptDescriptionBar absolute bottom-4 left-4 right-4 rounded-2xl p-4 text-theme-text transition-opacity duration-100 ${
                  recreateActionMenu?.id === selectedFullImage.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                }`}
              >
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-sm font-raleway leading-relaxed">
                      {selectedFullImage.prompt}
                      <button
                        data-copy-button="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          void copyPromptToClipboard(selectedFullImage.prompt);
                        }}
                        className="ml-2 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-20 align-middle pointer-events-auto"
                        title="Copy prompt"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="mt-2 flex justify-center items-center gap-2">
                      <Suspense fallback={null}>
                        <ModelBadge model={selectedFullImage.modelId ?? 'unknown'} size="md" />
                      </Suspense>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Vertical Gallery Navigation */}
            <VerticalGalleryNav
              images={filteredGallery.map(item => ({ url: item.imageUrl, id: item.id }))}
              currentIndex={currentImageIndex}
              onNavigate={(index) => {
                if (index >= 0 && index < filteredGallery.length) {
                  setSelectedFullImage(filteredGallery[index]);
                  setCurrentImageIndex(index);
                }
              }}
              onWidthChange={handleGalleryNavWidthChange}
            />
          </div>
        )}

        {/* Unsave confirmation modal */}
        {unsaveConfirm.open && unsaveConfirm.item && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-theme-black/80 py-12"
            onClick={closeUnsaveConfirm}
          >
            <div
              className={`${glass.promptDark} rounded-[20px] w-full max-w-sm min-w-[28rem] py-12 px-6 transition-colors duration-200`}
              onClick={event => event.stopPropagation()}
            >
              <div className="text-center space-y-4">
                <div className="space-y-3">
                  <Trash2 className="default-orange-icon mx-auto" />
                  <h3 className="text-xl font-raleway font-light text-theme-text">Remove from gallery?</h3>
                  <p className="text-base font-raleway font-light text-theme-white">
                    This will remove the image from your saved gallery and any folders it's in.
                  </p>
                </div>
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={closeUnsaveConfirm}
                    className={buttons.ghost}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnsaveFromGallery(unsaveConfirm.item!)}
                    className={buttons.primary}
                  >
                    Remove
                  </button>
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
