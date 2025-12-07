import { memo, useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Wand2, Package, Film, VideoIcon, Shapes } from 'lucide-react';
import { getToolLogo, hasToolLogo } from '../../utils/toolLogos';
import { useGeneration } from './contexts/GenerationContext';
import { useParallaxHover } from '../../hooks/useParallaxHover';
import { useDropdownScrollLock } from '../../hooks/useDropdownScrollLock';
import { glass, tooltips } from '../../styles/designSystem';
import { debugLog } from '../../utils/debug';
import { ToolInfoHover } from '../ToolInfoHover';
import { isVideoModelId, REFERENCE_SUPPORTED_MODELS } from './constants';

// AI Model data with icons and descriptions (matching V1 exactly)
// Exported as single source of truth for all model lists in the app
// eslint-disable-next-line react-refresh/only-export-components
export const AI_MODELS = [
  { name: "Gemini 3 Pro (Nano Banana)", desc: "Best image generation.", Icon: Sparkles, id: "gemini-3.0-pro-image" },
  { name: "FLUX.2", desc: "High-quality text-to-image generation and editing.", Icon: Wand2, id: "flux-2" },
  { name: "Reve", desc: "Great text-to-image and image editing.", Icon: Sparkles, id: "reve-image" },
  { name: "Ideogram 3.0", desc: "Advanced image generation, editing, and enhancement.", Icon: Package, id: "ideogram" },
  { name: "Recraft", desc: "Great for text, icons and mockups.", Icon: Shapes, id: "recraft" },
  { name: "Grok", desc: "Great aesthetics. Fast generations.", Icon: Sparkles, id: "grok-2-image" },
  { name: "Qwen", desc: "Great image editing.", Icon: Wand2, id: "qwen-image" },
  { name: "Runway Gen-4", desc: "Great image model. Great control & editing features", Icon: Film, id: "runway-gen4" },
  { name: "Runway Gen-4 (Video)", desc: "Text → Video using Gen-4 Turbo", Icon: VideoIcon, id: "runway-video-gen4" },
  { name: "Sora 2", desc: "OpenAI video generation with Sora 2.", Icon: VideoIcon, id: "sora-2" },
  { name: "Wan 2.2 Video", desc: "Alibaba's Wan 2.2 text-to-video model.", Icon: VideoIcon, id: "wan-video-2.2" },
  { name: "Hailuo 02", desc: "MiniMax video with start & end frame control.", Icon: VideoIcon, id: "hailuo-02" },
  { name: "Kling", desc: "ByteDance's cinematic video model.", Icon: VideoIcon, id: "kling-video" },
  { name: "ChatGPT", desc: "Popular image model.", Icon: Sparkles, id: "chatgpt-image" },
  { name: "Veo 3.1", desc: "Google's advanced video generation model.", Icon: Film, id: "veo-3" },
  { name: "Seedance 1.0 Pro (Video)", desc: "Great quality text-to-image.", Icon: Film, id: "seedance-1.0-pro" },
  { name: "Luma Photon", desc: "High-quality image generation with Photon.", Icon: Sparkles, id: "luma-photon-1" },
  { name: "Luma Ray 2", desc: "High-quality video generation with Ray 2.", Icon: VideoIcon, id: "luma-ray-2" },
];

type GenerationMode = 'image' | 'video';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  isGenerating: boolean;
  activeCategory?: GenerationMode; // defaults to inferring from selectedModel
  hasReferences?: boolean;
  readOnly?: boolean;
  allowedModels?: string[];
  disabledModels?: string[]; // Models to show as disabled (visible but not selectable)
  customDescriptions?: Record<string, string>; // Custom descriptions keyed by model ID
  customTooltips?: Record<string, string>; // Custom tooltip text keyed by model ID
}

const ModelSelector = memo<ModelSelectorProps>(({ selectedModel, onModelChange, isGenerating, activeCategory, hasReferences, readOnly, compact, allowedModels, disabledModels, customDescriptions, customTooltips }) => {
  const { setSelectedModel } = useGeneration();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, transform: 'translateY(0)' });

  const {
    setScrollableRef,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useDropdownScrollLock<HTMLDivElement>(isOpen);

  // Parallax hover effect
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLButtonElement>();

  // Infer activeCategory from selectedModel if not provided
  const inferredCategory = useMemo(() => {
    if (activeCategory) return activeCategory;
    return isVideoModelId(selectedModel) ? "video" : "image";
  }, [activeCategory, selectedModel]);

  // Get current model info
  const getCurrentModel = useCallback(() => {
    if (inferredCategory === "video") {
      if (selectedModel === "veo-3") {
        return { name: "Veo 3.1", Icon: Film, desc: "Best video model. Great cinematic quality with sound output.", id: "veo-3" };
      }
      if (selectedModel === "sora-2") {
        return { name: "Sora 2", Icon: VideoIcon, desc: "OpenAI’s Sora 2 with high-quality text-to-video.", id: "sora-2" };
      }
      if (selectedModel === "runway-video-gen4") {
        return { name: "Runway Gen-4 (Video)", Icon: VideoIcon, desc: "Good video model. Great editing with Runway Aleph.", id: "runway-video-gen4" };
      }
      if (selectedModel === "wan-video-2.2") {
        return { name: "Wan 2.2 Video", Icon: VideoIcon, desc: "Alibaba's Wan 2.2 text-to-video model.", id: "wan-video-2.2" };
      }
      if (selectedModel === "hailuo-02") {
        return { name: "Hailuo 02", Icon: VideoIcon, desc: "MiniMax video with start & end frame control.", id: "hailuo-02" };
      }
      if (selectedModel === "seedance-1.0-pro") {
        return { name: "Seedance 1.0 Pro (Video)", Icon: Film, desc: "Great quality text-to-image.", id: "seedance-1.0-pro" };
      }
      if (selectedModel === "kling-video") {
        return { name: "Kling", Icon: VideoIcon, desc: "ByteDance's Kling V2.1 Master with hyper-realistic motion and advanced physics.", id: "kling-video" };
      }
      if (selectedModel === "luma-ray-2") {
        return { name: "Luma Ray 2", Icon: VideoIcon, desc: "Cinematic 4K video with detailed camera control.", id: "luma-ray-2" };
      }
      return { name: "Veo 3.1", Icon: Film, desc: "Best video model. Great cinematic quality with sound output.", id: "veo-3" };
    }
    return AI_MODELS.find(model => model.id === selectedModel) || AI_MODELS[0];
  }, [selectedModel, inferredCategory]);

  // Handle model selection (matching V1's handleModelSelect signature)
  const handleModelSelect = useCallback((modelName: string) => {
    const model = AI_MODELS.find(m => m.name === modelName);
    if (!model) return;
    debugLog('[ModelSelector] Model selected:', model.id);
    setSelectedModel(model.id);
    onModelChange(model.id);
    setIsOpen(false);
  }, [setSelectedModel, onModelChange]);

  // Handle toggle
  const handleToggle = useCallback(() => {
    if (!isGenerating && !readOnly) {
      setIsOpen(prev => !prev);
    }
  }, [isGenerating, readOnly]);

  // Handle close
  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Return focus to trigger like V1
    if (buttonRef.current) {
      buttonRef.current.focus();
    }
  }, []);

  // Portal positioning logic (matching V1's ModelMenuPortal exactly)
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 384; // max-h-96 = 384px

      // Check if there's enough space above the trigger
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;

      // Position above if there's more space above, otherwise position below
      const shouldPositionAbove = spaceAbove > spaceBelow && spaceAbove > dropdownHeight;

      const verticalOffset = 2;

      setPos({
        top: shouldPositionAbove ? rect.top - verticalOffset : rect.bottom + verticalOffset,
        left: rect.left,
        width: Math.max(inferredCategory === "video" ? 360 : 384, rect.width), // Minimum width based on category
        transform: shouldPositionAbove ? 'translateY(-100%)' : 'translateY(0)' // Position above or below
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, inferredCategory]);

  // Handle click outside and escape key (matching V1)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)) {
        handleClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      // Focus the dropdown when it opens for better keyboard navigation
      if (menuRef.current) {
        menuRef.current.focus();
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  // Tooltip helper functions
  const showHoverTooltip = useCallback((target: HTMLElement, tooltipId: string) => {
    if (typeof document === 'undefined') return;
    const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`) as HTMLElement | null;
    if (!tooltip) return;

    const rect = target.getBoundingClientRect();
    tooltip.style.position = 'fixed';
    tooltip.style.top = `${rect.top - 4}px`;
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.transform = 'translateX(-50%) translateY(-100%)';
    tooltip.style.zIndex = '9999';

    tooltip.classList.remove('opacity-0');
    tooltip.classList.add('opacity-100');
  }, []);

  const hideHoverTooltip = useCallback((tooltipId: string) => {
    if (typeof document === 'undefined') return;
    const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`) as HTMLElement | null;
    if (!tooltip) return;
    tooltip.classList.remove('opacity-100');
    tooltip.classList.add('opacity-0');
  }, []);

  return (
    <div className="relative model-selector flex-shrink-0">
      {/* Model selector button - matches V1 exactly */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={isGenerating}
        className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text flex items-center justify-center h-8 px-2 lg:px-3 rounded-full transition-colors duration-100 group gap-2 parallax-small ${isGenerating || readOnly ? 'opacity-100 cursor-default' : ''
          } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
        onMouseEnter={(e) => {
          showHoverTooltip(e.currentTarget, 'model-selector-tooltip');
        }}
        onMouseLeave={() => {
          hideHoverTooltip('model-selector-tooltip');
        }}
        onPointerMove={onPointerMove}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        {(() => {
          const currentModel = getCurrentModel();
          if (hasToolLogo(currentModel.name)) {
            return (
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={getToolLogo(currentModel.name)!}
                  alt={`${currentModel.name} logo`}
                  loading="lazy"
                  className="w-4 h-4 object-contain rounded flex-shrink-0"
                />
                {!compact && (
                  <span className={`font-raleway text-sm whitespace-nowrap ${isGenerating ? 'text-n-text/50' : 'text-n-text'}`}>
                    {currentModel?.name || 'Select Model'}
                  </span>
                )}
              </div>
            );
          } else {
            const Icon = currentModel.Icon;
            return (
              <div className="flex items-center gap-2 min-w-0">
                <Icon className={`w-4 h-4 flex-shrink-0 ${isGenerating ? 'text-n-text/50' : 'text-n-text'}`} />
                {!compact && (
                  <span className={`font-raleway text-sm whitespace-nowrap ${isGenerating ? 'text-n-text/50' : 'text-n-text'}`}>
                    {currentModel?.name || 'Select Model'}
                  </span>
                )}
              </div>
            );
          }
        })()}
      </button>
      {createPortal(
        <div
          data-tooltip-for="model-selector-tooltip"
          className={`${tooltips.base} fixed z-[9999]`}
          style={{ pointerEvents: 'none' }}
        >
          Select model
        </div>,
        document.body
      )}

      {/* Model Dropdown Portal - matches V1's ModelMenuPortal exactly */}
      {isOpen && createPortal(
        <div
          ref={(node) => {
            menuRef.current = node;
            setScrollableRef(node);
          }}
          tabIndex={-1}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 9999,
            transform: pos.transform,
            maxHeight: '384px',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}
          className={`${glass.prompt} rounded-lg focus:outline-none shadow-lg max-h-96 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-n-mid/30 scrollbar-track-transparent hover:scrollbar-thumb-n-mid/50 ${inferredCategory === "video" ? "p-1" : "p-2"
            }`}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onFocus={() => {
            // Ensure the dropdown can receive focus for keyboard navigation
            if (menuRef.current) {
              menuRef.current.focus();
            }
          }}
        >
          {AI_MODELS.filter(model => {
            // Filter by allowedModels if provided
            if (allowedModels && allowedModels.length > 0) {
              if (!allowedModels.includes(model.id)) {
                return false;
              }
            }

            const isVideoModel = isVideoModelId(model.id);

            // Filter by references if enabled
            if (hasReferences && !REFERENCE_SUPPORTED_MODELS.includes(model.id)) {
              return false;
            }

            if (inferredCategory === "image") {
              return !isVideoModel;
            }
            if (inferredCategory === "video") {
              return isVideoModel;
            }
            return true;
          }).map((model) => {
            const isSelected = selectedModel === model.id;
            // Check if currently available (not coming soon)
            // Only coming soon is Flux 2, Gemini 3, Grok 2, ChatGPT, Ideogram, Qwen, Runway, Reve, Recraft, Luma, Wan, Hailuo, Kling, Sora
            // Actually logic in original file seemed to list what WAS available in a negative check.
            // Let's simplify: check if it's in a list of KNOWN available models, or inverted logic as before.
            // Original logic:
            // const isComingSoon = model.id !== "flux-2" && model.id !== "gemini-3.0-pro-image" && model.id !== "grok-2-image" && model.id !== "chatgpt-image" && model.id !== "ideogram" && model.id !== "qwen-image" && model.id !== "runway-gen4" && model.id !== "reve-image" && model.id !== "recraft" && model.id !== "luma-photon-1" && model.id !== "luma-ray-2" && model.id !== "wan-video-2.2" && model.id !== "hailuo-02" && model.id !== "kling-video" && model.id !== "sora-2" && model.id !== "veo-3" && model.id !== "seedance-1.0-pro" && model.id !== "runway-video-gen4";

            // We should probably include all the ones we see in AI_MODELS as available if they were available before.
            // Based on the hardcoded video list, Veo 3, Sora 2, Runway Video, Wan, Hailuo, Seedance, Kling, Luma Ray 2 were all rendered as active buttons.
            // So we should add them to the "not coming soon" list (or just remove the check if everything in AI_MODELS is actually implemented/intended to be shown).
            // For safety compatibility with existing code, let's keep the check but update it to include all video models we saw.

            const isAvailable = [
              "gemini-3.0-pro-image", "flux-2", "reve-image", "ideogram", "recraft", "grok-2-image", "qwen-image", "runway-gen4", "chatgpt-image", "luma-photon-1", // Images
              "veo-3", "sora-2", "runway-video-gen4", "wan-video-2.2", "hailuo-02", "seedance-1.0-pro", "kling-video", "luma-ray-2" // Videos
            ].includes(model.id);

            const isComingSoon = !isAvailable;
            const isDisabled = disabledModels?.includes(model.id) ?? false;

            return (
              <button
                key={model.name}
                onClick={() => {
                  if (isComingSoon || isDisabled) {
                    if (isDisabled) {
                      // Don't show alert for disabled models, just ignore click
                      return;
                    }
                    alert('This model is coming soon!');
                    return;
                  }
                  handleModelSelect(model.name);
                }}
                className={`w-full px-2 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${isSelected
                  ? 'bg-theme-text/10 border-theme-text/20 shadow-lg shadow-theme-text/5'
                  : isComingSoon || isDisabled
                    ? "bg-transparent border-theme-mid opacity-40 cursor-not-allowed"
                    : 'bg-transparent hover:bg-theme-text/20 border-0'
                  }`}
              >
                {hasToolLogo(model.name) ? (
                  <img
                    src={getToolLogo(model.name)!}
                    alt={`${model.name} logo`}
                    loading="lazy"
                    className="w-5 h-5 flex-shrink-0 object-contain rounded"
                  />
                ) : (
                  <model.Icon className={`w-5 h-5 flex-shrink-0 transition-colors duration-100 ${isSelected ? 'text-theme-text' : isComingSoon ? 'text-theme-light' : 'text-theme-text group-hover:text-theme-text'
                    }`} />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-raleway truncate transition-colors duration-100 flex items-center gap-2 ${isSelected ? 'text-theme-text' : isComingSoon ? 'text-theme-light' : 'text-theme-text group-hover:text-theme-text'
                    }`}>
                    {model.name}
                    <ToolInfoHover
                      toolName={model.name}
                      className="shrink-0"
                      iconClassName={isComingSoon ? undefined : 'group-hover:opacity-100'}
                      customTooltipText={customTooltips?.[model.id]}
                    />
                  </div>
                  <div className={`text-xs font-raleway truncate transition-colors duration-100 ${isSelected ? 'text-theme-text' : isComingSoon ? 'text-theme-light' : 'text-theme-white group-hover:text-theme-text'
                    }`}>
                    {isComingSoon ? 'Coming soon.' : (customDescriptions?.[model.id] ?? model.desc)}
                  </div>
                </div>
                {isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>
                )}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
});

ModelSelector.displayName = 'ModelSelector';

export default ModelSelector;
