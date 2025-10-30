import React, { memo, useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles } from 'lucide-react';
import { getToolLogo, hasToolLogo } from '../../utils/toolLogos';
import { useGeneration } from './contexts/GenerationContext';
import { useParallaxHover } from '../../hooks/useParallaxHover';
import { buttons, glass } from '../../styles/designSystem';
import { debugLog } from '../../utils/debug';

// We intentionally do NOT use ModelBadge for the trigger, but the dropdown list
// still renders each option with `ModelBadge` like V1; ensure it's available.
const ModelBadge = lazy(() => import('../ModelBadge'));

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  isGenerating: boolean;
}

const ModelSelector = memo<ModelSelectorProps>(({ selectedModel, onModelChange, isGenerating }) => {
  const { setSelectedModel } = useGeneration();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  
  // Parallax hover effect
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLButtonElement>();
  
  // AI Models list
  const AI_MODELS = useMemo(() => [
    // Image models (match V1 order and labels)
    { id: "gemini-2.5-flash-image", name: "Gemini 2.5 Flash", category: "image" },
    { id: "flux-1.1", name: "Flux 1.1", category: "image" },
    { id: "reve-image", name: "Reve", category: "image" },
    { id: "ideogram", name: "Ideogram 3.0", category: "image" },
    { id: "recraft", name: "Recraft", category: "image" },
    { id: "qwen-image", name: "Qwen", category: "image" },
    { id: "runway-gen4", name: "Runway Gen-4", category: "image" },
    // Video and other entries (match V1 order and labels)
    { id: "runway-video-gen4", name: "Runway Gen-4 (Video)", category: "video" },
    { id: "wan-video-2.2", name: "Wan 2.2 Video", category: "video" },
    { id: "hailuo-02", name: "Hailuo 02", category: "video" },
    { id: "kling-video", name: "Kling", category: "video" },
    { id: "chatgpt-image", name: "ChatGPT", category: "image" },
    { id: "veo-3", name: "Veo 3", category: "video" },
    { id: "seedance-1.0-pro", name: "Seedance 1.0 Pro (Video)", category: "video" },
    { id: "luma-photon-1", name: "Luma Photon 1", category: "video" },
    { id: "luma-photon-flash-1", name: "Luma Photon Flash 1", category: "video" },
    { id: "luma-ray-2", name: "Luma Ray 2", category: "video" },
  ], []);
  
  // Get current model info
  const currentModel = useMemo(() => 
    AI_MODELS.find(model => model.id === selectedModel), 
    [selectedModel, AI_MODELS]
  );
  const isComingSoon = useMemo(() => !currentModel, [currentModel]);
  
  // Handle model selection
  const handleModelSelect = useCallback((modelId: string) => {
    debugLog('[ModelSelector] Model selected:', modelId);
    setSelectedModel(modelId);
    onModelChange(modelId);
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
  
  // Compute and update menu position anchored to the trigger (like V1 portal)
  useEffect(() => {
    const updatePosition = () => {
      const anchor = buttonRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    };
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        handleClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClose]);
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleClose]);

  // Focus management & keyboard navigation within menu (Arrow keys/Enter)
  useEffect(() => {
    if (!isOpen) return;
    const menu = menuRef.current;
    if (!menu) return;
    // Focus the menu container so it can receive key events
    menu.focus();

    const getItems = () => Array.from(menu.querySelectorAll<HTMLButtonElement>('button[data-model-item="true"]'));

    const onKeyDown = (e: KeyboardEvent) => {
      const items = getItems();
      if (items.length === 0) return;
      const activeEl = document.activeElement as HTMLElement | null;
      let index = items.findIndex((el) => el === activeEl);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        index = (index + 1 + items.length) % items.length;
        items[index].focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        index = (index - 1 + items.length) % items.length;
        items[index].focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        items[0].focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (e.key === 'Enter' && activeEl && activeEl instanceof HTMLButtonElement && activeEl.dataset.modelItem === 'true') {
        e.preventDefault();
        activeEl.click();
      }
    };

    menu.addEventListener('keydown', onKeyDown as unknown as EventListener);
    return () => {
      menu.removeEventListener('keydown', onKeyDown as unknown as EventListener);
    };
  }, [isOpen]);
  
  return (
    <div className="relative">
      {/* Model selector button - mirrors V1 (icon + label, no inner pill, no chevron) */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={isGenerating}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerMove={onPointerMove}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text flex items-center justify-center h-8 px-2 lg:px-3 rounded-full transition-colors duration-100 group gap-2 parallax-small ${
          isGenerating ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {(() => {
          // Use the same logo/icon approach as V1
          const name = currentModel?.name ?? 'Gemini 2.5 Flash';
          if (hasToolLogo(name)) {
            return (
              <img
                src={getToolLogo(name)}
                alt={`${name} logo`}
                loading="lazy"
                className="w-4 h-4 object-contain rounded flex-shrink-0"
              />
            );
          }
          // Fallback: simple sparkles icon sized like V1 icons
          return <Sparkles className="w-4 h-4 flex-shrink-0 text-n-text group-hover:text-n-text transition-colors duration-100" />;
        })()}
        <span className="hidden xl:inline font-raleway text-sm whitespace-nowrap text-n-text">
          {currentModel?.name || 'Select Model'}
        </span>
      </button>
      
      {/* Model menu via portal (V1-style anchored, fixed positioning) */}
      {isOpen && menuPosition && createPortal(
        (
          <div
            ref={menuRef}
            role="listbox"
            tabIndex={-1}
            className={`${glass.prompt} rounded-lg focus:outline-none shadow-lg max-h-96 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-n-mid/30 scrollbar-track-transparent hover:scrollbar-thumb-n-mid/50 border border-theme-mid z-[9999]`}
            style={{
              position: 'fixed',
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
          >
            <div className="p-2">
              <div className="px-3 py-2 border-b border-theme-mid">
                <h3 className="text-sm font-medium text-theme-text">Choose AI Model</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {AI_MODELS.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    role="option"
                    data-model-item="true"
                    aria-selected={selectedModel === model.id}
                    onClick={() => handleModelSelect(model.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                      selectedModel === model.id
                        ? 'bg-theme-accent/20 text-theme-accent'
                        : 'hover:bg-theme-mid/50 text-theme-white'
                    }`}
                  >
                    <Suspense fallback={<div className="w-4 h-4 bg-theme-mid rounded" />}>
                      <ModelBadge model={model.id} size="sm" />
                    </Suspense>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">{model.name}</div>
                      <div className="text-xs text-theme-text capitalize">{model.category}</div>
                    </div>
                    {selectedModel === model.id && (
                      <Sparkles className="w-4 h-4 text-theme-accent" />
                    )}
                  </button>
                ))}
              </div>
              {isComingSoon && (
                <div className="px-3 py-2 border-t border-theme-mid">
                  <p className="text-xs text-theme-text text-center">More models coming soon!</p>
                </div>
              )}
            </div>
          </div>
        ),
        document.body
      )}
    </div>
  );
});

ModelSelector.displayName = 'ModelSelector';

export default ModelSelector;
