import React, { memo, useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Wand2, Package, Film, VideoIcon, Shapes } from 'lucide-react';
import { getToolLogo, hasToolLogo } from '../../utils/toolLogos';
import { useGeneration } from './contexts/GenerationContext';
import { useParallaxHover } from '../../hooks/useParallaxHover';
import { useDropdownScrollLock } from '../../hooks/useDropdownScrollLock';
import { glass } from '../../styles/designSystem';
import { debugLog } from '../../utils/debug';
import { ToolInfoHover } from '../ToolInfoHover';
import { isVideoModelId } from './constants';

// AI Model data with icons and descriptions (matching V1 exactly)
// Exported as single source of truth for all model lists in the app
// eslint-disable-next-line react-refresh/only-export-components
export const AI_MODELS = [
  { name: "Gemini 2.5 Flash", desc: "Best image editing.", Icon: Sparkles, id: "gemini-2.5-flash-image" },
  { name: "Flux 1.1", desc: "High-quality text-to-image generation and editing.", Icon: Wand2, id: "flux-1.1" },
  { name: "Reve", desc: "Great text-to-image and image editing.", Icon: Sparkles, id: "reve-image" },
  { name: "Ideogram 3.0", desc: "Advanced image generation, editing, and enhancement.", Icon: Package, id: "ideogram" },
  { name: "Recraft", desc: "Great for text, icons and mockups.", Icon: Shapes, id: "recraft" },
  { name: "Grok Image", desc: "Great aesthetics. Fast generations.", Icon: Sparkles, id: "grok-2-image" },
  { name: "Qwen", desc: "Great image editing.", Icon: Wand2, id: "qwen-image" },
  { name: "Runway Gen-4", desc: "Great image model. Great control & editing features", Icon: Film, id: "runway-gen4" },
  { name: "Runway Gen-4 (Video)", desc: "Text → Video using Gen-4 Turbo", Icon: VideoIcon, id: "runway-video-gen4" },
  { name: "Wan 2.2 Video", desc: "Alibaba's Wan 2.2 text-to-video model.", Icon: VideoIcon, id: "wan-video-2.2" },
  { name: "Hailuo 02", desc: "MiniMax video with start & end frame control.", Icon: VideoIcon, id: "hailuo-02" },
  { name: "Kling", desc: "ByteDance's cinematic video model.", Icon: VideoIcon, id: "kling-video" },
  { name: "ChatGPT", desc: "Popular image model.", Icon: Sparkles, id: "chatgpt-image" },
  { name: "Veo 3", desc: "Google's advanced video generation model.", Icon: Film, id: "veo-3" },
  { name: "Seedance 1.0 Pro (Video)", desc: "Great quality text-to-image.", Icon: Film, id: "seedance-1.0-pro" },
  { name: "Luma Photon 1", desc: "High-quality image generation with Photon.", Icon: Sparkles, id: "luma-photon-1" },
  { name: "Luma Photon Flash 1", desc: "Fast image generation with Photon Flash.", Icon: Sparkles, id: "luma-photon-flash-1" },
  { name: "Luma Ray 2", desc: "High-quality video generation with Ray 2.", Icon: VideoIcon, id: "luma-ray-2" },
];

type GenerationMode = 'image' | 'video';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  isGenerating: boolean;
  activeCategory?: GenerationMode; // defaults to inferring from selectedModel
}

const ModelSelector = memo<ModelSelectorProps>(({ selectedModel, onModelChange, isGenerating, activeCategory }) => {
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
        return { name: "Veo 3", Icon: Film, desc: "Best video model. Great cinematic quality with sound output.", id: "veo-3" };
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
      return { name: "Veo 3", Icon: Film, desc: "Best video model. Great cinematic quality with sound output.", id: "veo-3" };
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
    if (!isGenerating) {
      setIsOpen(prev => !prev);
    }
  }, [isGenerating]);
  
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
  
  return (
    <div className="relative model-selector flex-shrink-0">
      {/* Model selector button - matches V1 exactly */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={isGenerating}
        className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text flex items-center justify-center h-8 px-2 lg:px-3 rounded-full transition-colors duration-100 group gap-2 parallax-small ${
          isGenerating ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onPointerMove={onPointerMove}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        {(() => {
          const currentModel = getCurrentModel();
          if (hasToolLogo(currentModel.name)) {
            return (
              <img
                src={getToolLogo(currentModel.name)!}
                alt={`${currentModel.name} logo`}
                loading="lazy"
                className="w-4 h-4 object-contain rounded flex-shrink-0"
              />
            );
          } else {
            const Icon = currentModel.Icon;
            return <Icon className="w-4 h-4 flex-shrink-0 text-n-text group-hover:text-n-text transition-colors duration-100" />;
          }
        })()}
        <span className="hidden xl:inline font-raleway text-sm whitespace-nowrap text-n-text">{getCurrentModel().name}</span>
      </button>
      
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
          className={`${glass.prompt} rounded-lg focus:outline-none shadow-lg max-h-96 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-n-mid/30 scrollbar-track-transparent hover:scrollbar-thumb-n-mid/50 ${
            inferredCategory === "video" ? "p-1" : "p-2"
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
          {inferredCategory === "video" ? (
            <>
              <button
                onClick={() => {
                  handleModelSelect("Veo 3");
                  setIsOpen(false);
                }}
                className={`w-full px-2 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                  selectedModel === "veo-3"
                    ? 'bg-theme-text/10 border-theme-text/20 shadow-lg shadow-theme-text/5' 
                    : 'bg-transparent hover:bg-theme-text/20 border-0'
                }`}
              >
                {hasToolLogo("Veo 3") ? (
                  <img
                    src={getToolLogo("Veo 3")!}
                    alt="Veo 3 logo"
                    loading="lazy"
                    className="w-5 h-5 flex-shrink-0 object-contain rounded"
                  />
                ) : (
                  <Film className={`w-5 h-5 flex-shrink-0 transition-colors duration-100 ${
                    selectedModel === "veo-3" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                  }`} />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                    selectedModel === "veo-3" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                  }`}>
                    Veo 3
                  </div>
                  <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                    selectedModel === "veo-3" ? 'text-theme-text' : 'text-theme-white group-hover:text-theme-text'
                  }`}>
                    Best video model. Great cinematic quality with sound output.
                  </div>
                </div>
                {selectedModel === "veo-3" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>
                )}
              </button>
              <button
                onClick={() => {
                  debugLog('[ModelSelector] Selecting Runway video model');
                  handleModelSelect("Runway Gen-4 (Video)");
                  setIsOpen(false);
                }}
                className={`w-full px-2 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                  selectedModel === "runway-video-gen4"
                    ? 'bg-theme-text/10 border-theme-text/20 shadow-lg shadow-theme-text/5' 
                    : 'bg-transparent hover:bg-theme-text/20 border-0'
                }`}
              >
                {hasToolLogo("Runway Gen-4") ? (
                  <img
                    src={getToolLogo("Runway Gen-4")!}
                    alt="Runway logo"
                    loading="lazy"
                    className="w-5 h-5 flex-shrink-0 object-contain rounded"
                  />
                ) : (
                  <VideoIcon className={`w-5 h-5 flex-shrink-0 transition-colors duration-100 ${
                    selectedModel === "runway-video-gen4" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                  }`} />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                    selectedModel === "runway-video-gen4" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                  }`}>
                    Runway Gen-4
                  </div>
                  <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                    selectedModel === "runway-video-gen4" ? 'text-theme-text' : 'text-theme-white group-hover:text-theme-text'
                  }`}>
                    Good video model. Great editing with Runway Aleph.
                  </div>
                </div>
                {selectedModel === "runway-video-gen4" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>
                )}
              </button>
              {/* Add other video models similarly... */}
              <button
                onClick={() => {
                  handleModelSelect("Hailuo 02");
                  setIsOpen(false);
                }}
                className={`w-full px-2 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                  selectedModel === "hailuo-02"
                    ? 'bg-theme-text/10 border-theme-text/20 shadow-lg shadow-theme-text/5' 
                    : 'bg-transparent hover:bg-theme-text/20 border-0'
                }`}
              >
                {hasToolLogo("Hailuo 02") ? (
                  <img
                    src={getToolLogo("Hailuo 02")!}
                    alt="Hailuo 02 logo"
                    loading="lazy"
                    className="w-5 h-5 flex-shrink-0 object-contain rounded"
                  />
                ) : (
                  <VideoIcon className={`w-5 h-5 flex-shrink-0 transition-colors duration-100 ${
                    selectedModel === "hailuo-02" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                  }`} />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                    selectedModel === "hailuo-02" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                  }`}>
                    Hailuo 02
                  </div>
                  <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                    selectedModel === "hailuo-02" ? 'text-theme-text' : 'text-theme-white group-hover:text-theme-text'
                  }`}>
                    MiniMax video with start & end frame control.
                  </div>
                </div>
                {selectedModel === "hailuo-02" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>
                )}
              </button>
              <button
                onClick={() => {
                  handleModelSelect("Seedance 1.0 Pro (Video)");
                  setIsOpen(false);
                }}
                className={`w-full px-2 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                  selectedModel === "seedance-1.0-pro"
                    ? 'bg-theme-text/10 border-theme-text/20 shadow-lg shadow-theme-text/5' 
                    : 'bg-transparent hover:bg-theme-text/20 border-0'
                }`}
              >
                {hasToolLogo("Seedance 1.0 Pro (Video)") ? (
                  <img
                    src={getToolLogo("Seedance 1.0 Pro (Video)")!}
                    alt="Seedance 1.0 Pro logo"
                    loading="lazy"
                    className="w-5 h-5 flex-shrink-0 object-contain rounded"
                  />
                ) : (
                  <Film className={`w-5 h-5 flex-shrink-0 transition-colors duration-100 ${
                    selectedModel === "seedance-1.0-pro" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                  }`} />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                    selectedModel === "seedance-1.0-pro" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                  }`}>
                    Seedance 1.0 Pro
                  </div>
                  <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                    selectedModel === "seedance-1.0-pro" ? 'text-theme-text' : 'text-theme-white group-hover:text-theme-text'
                  }`}>
                    Great quality text-to-image.
                  </div>
                </div>
                {selectedModel === "seedance-1.0-pro" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>
                )}
              </button>
              <button
                onClick={() => {
                  handleModelSelect("Kling");
                  setIsOpen(false);
                }}
                className={`w-full px-2 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                  selectedModel === "kling-video"
                    ? 'bg-theme-text/10 border-theme-text/20 shadow-lg shadow-theme-text/5' 
                    : 'bg-transparent hover:bg-theme-text/20 border-0'
                }`}
              >
                {hasToolLogo("Kling") ? (
                  <img
                    src={getToolLogo("Kling")!}
                    alt="Kling logo"
                    loading="lazy"
                    className="w-5 h-5 flex-shrink-0 object-contain rounded"
                  />
                ) : (
                  <VideoIcon className={`w-5 h-5 flex-shrink-0 transition-colors duration-100 ${
                    selectedModel === "kling-video" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                  }`} />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                    selectedModel === "kling-video" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                  }`}>
                    Kling
                  </div>
                  <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                    selectedModel === "kling-video" ? 'text-theme-text' : 'text-theme-white group-hover:text-theme-text'
                  }`}>
                    ByteDance's Kling V2.1 Master with hyper-realistic motion and advanced physics.
                  </div>
              </div>
                {selectedModel === "kling-video" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>
                )}
              </button>
                  <button
                onClick={() => {
                  handleModelSelect("Wan 2.2 Video");
                  setIsOpen(false);
                }}
                className={`w-full px-2 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                  selectedModel === "wan-video-2.2"
                    ? 'bg-theme-text/10 border-theme-text/20 shadow-lg shadow-theme-text/5' 
                    : 'bg-transparent hover:bg-theme-text/20 border-0'
                }`}
              >
                {hasToolLogo("Wan 2.2 Video") ? (
                  <img
                    src={getToolLogo("Wan 2.2 Video")!}
                    alt="Wan 2.2 Video logo"
                    loading="lazy"
                    className="w-5 h-5 flex-shrink-0 object-contain rounded"
                  />
                ) : (
                  <VideoIcon className={`w-5 h-5 flex-shrink-0 transition-colors duration-100 ${
                    selectedModel === "wan-video-2.2" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                  }`} />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                    selectedModel === "wan-video-2.2" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                  }`}>
                    Wan 2.2 Video
                  </div>
                  <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                    selectedModel === "wan-video-2.2" ? 'text-theme-text' : 'text-theme-white group-hover:text-theme-text'
                  }`}>
                    Alibaba's Wan 2.2 text-to-video model.
                  </div>
                    </div>
                {selectedModel === "wan-video-2.2" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>
                    )}
                  </button>
              <button
                onClick={() => {
                  handleModelSelect("Luma Ray 2");
                  setIsOpen(false);
                }}
                className={`w-full px-2 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                  selectedModel === "luma-ray-2"
                    ? 'bg-theme-text/10 border-theme-text/20 shadow-lg shadow-theme-text/5' 
                    : 'bg-transparent hover:bg-theme-text/20 border-0'
                }`}
              >
                {hasToolLogo("Luma Ray 2") ? (
                  <img
                    src={getToolLogo("Luma Ray 2")!}
                    alt="Luma Ray 2 logo"
                    loading="lazy"
                    className="w-5 h-5 flex-shrink-0 object-contain rounded"
                  />
                ) : (
                  <VideoIcon className={`w-5 h-5 flex-shrink-0 transition-colors duration-100 ${
                    selectedModel === "luma-ray-2" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                  }`} />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-raleway truncate transition-colors duration-100 ${
                    selectedModel === "luma-ray-2" ? 'text-theme-text' : 'text-theme-text group-hover:text-theme-text'
                  }`}>
                    Luma Ray 2
                  </div>
                  <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                    selectedModel === "luma-ray-2" ? 'text-theme-text' : 'text-theme-white group-hover:text-theme-text'
                  }`}>
                    Cinematic 4K video with detailed camera control.
              </div>
                </div>
                {selectedModel === "luma-ray-2" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>
                )}
              </button>
            </>
          ) : (
            AI_MODELS.filter(model => {
              const isVideoModel = isVideoModelId(model.id);
              if (inferredCategory === "image") {
                return !isVideoModel;
              }
              if (inferredCategory === "video") {
                return isVideoModel;
              }
              return true;
            }).map((model) => {
              const isSelected = selectedModel === model.id;
              const isComingSoon = model.id !== "flux-1.1" && model.id !== "gemini-2.5-flash-image" && model.id !== "grok-2-image" && model.id !== "chatgpt-image" && model.id !== "ideogram" && model.id !== "qwen-image" && model.id !== "runway-gen4" && model.id !== "reve-image" && model.id !== "recraft" && model.id !== "luma-photon-1" && model.id !== "luma-photon-flash-1" && model.id !== "luma-ray-2" && model.id !== "wan-video-2.2" && model.id !== "hailuo-02" && model.id !== "kling-video";
              
              return (
                <button
                  key={model.name}
                  onClick={() => {
                    if (isComingSoon) {
                      alert('This model is coming soon! Currently only Gemini 2.5 Flash, Flux 1.1, Grok 2 Image, ChatGPT, Ideogram, Qwen, Runway, Wan 2.2 Video, Hailuo 02, Reve, Recraft, and Luma models are available.');
                      return;
                    }
                    handleModelSelect(model.name);
                    setIsOpen(false);
                  }}
                  className={`w-full px-2 py-2 rounded-lg border transition-all duration-100 text-left flex items-center gap-2 group ${
                    isSelected 
                      ? 'bg-theme-text/10 border-theme-text/20 shadow-lg shadow-theme-text/5' 
                      : isComingSoon
                      ? "bg-transparent border-theme-mid opacity-60 cursor-not-allowed"
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
                    <model.Icon className={`w-5 h-5 flex-shrink-0 transition-colors duration-100 ${
                      isSelected ? 'text-theme-text' : isComingSoon ? 'text-theme-light' : 'text-theme-text group-hover:text-theme-text'
                    }`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-raleway truncate transition-colors duration-100 flex items-center gap-2 ${
                      isSelected ? 'text-theme-text' : isComingSoon ? 'text-theme-light' : 'text-theme-text group-hover:text-theme-text'
                    }`}>
                      {model.name}
                      <ToolInfoHover
                        toolName={model.name}
                        className="shrink-0"
                        iconClassName={isComingSoon ? undefined : 'group-hover:opacity-100'}
                      />
                    </div>
                    <div className={`text-xs font-raleway truncate transition-colors duration-100 ${
                      isSelected ? 'text-theme-text' : isComingSoon ? 'text-theme-light' : 'text-theme-white group-hover:text-theme-text'
                    }`}>
                      {isComingSoon ? 'Coming soon.' : model.desc}
            </div>
          </div>
                  {isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full bg-theme-text flex-shrink-0 shadow-sm"></div>
                  )}
                </button>
              );
            })
          )}
        </div>,
        document.body
      )}
    </div>
  );
});

ModelSelector.displayName = 'ModelSelector';

export default ModelSelector;
