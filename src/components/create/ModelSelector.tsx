import React, { memo, useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { lazy, Suspense } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useGeneration } from './contexts/GenerationContext';
import { useParallaxHover } from '../../hooks/useParallaxHover';
import { buttons, glass } from '../../styles/designSystem';
import { debugLog } from '../../utils/debug';

// Lazy load ModelBadge
const ModelBadge = lazy(() => import('../ModelBadge'));

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  isGenerating: boolean;
}

const ModelSelector = memo<ModelSelectorProps>(({ selectedModel, onModelChange, isGenerating }) => {
  const { setSelectedModel } = useGeneration();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  
  // Parallax hover effect
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLButtonElement>();
  
  // AI Models list
  const AI_MODELS = useMemo(() => [
    { id: "gemini-2.5-flash-image", name: "Gemini 2.5 Flash", category: "image" },
    { id: "flux-1.1", name: "Flux 1.1", category: "image" },
    { id: "chatgpt-image", name: "ChatGPT Image", category: "image" },
    { id: "ideogram", name: "Ideogram", category: "image" },
    { id: "qwen-image", name: "Qwen Image", category: "image" },
    { id: "runway-gen4", name: "Runway Gen-4", category: "image" },
    { id: "reve-image", name: "Reve Image", category: "image" },
    { id: "recraft", name: "Recraft", category: "image" },
    { id: "veo-3", name: "Veo 3", category: "video" },
    { id: "runway-video-gen4", name: "Runway Video Gen-4", category: "video" },
    { id: "wan-video-2.2", name: "Wan Video 2.2", category: "video" },
    { id: "hailuo-02", name: "Hailuo 02", category: "video" },
    { id: "kling-video", name: "Kling Video", category: "video" },
    { id: "seedance-1.0-pro", name: "Seedance 1.0 Pro", category: "video" },
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
  }, []);
  
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
  
  return (
    <div className="relative">
      {/* Model selector button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        disabled={isGenerating}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerMove={onPointerMove}
        className={`${buttons.ghost} flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
          isGenerating ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <Suspense fallback={<div className="w-4 h-4 bg-theme-mid rounded" />}>
          <ModelBadge model={selectedModel} size="sm" />
        </Suspense>
        <span className="text-sm font-medium">
          {currentModel?.name || 'Select Model'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Model menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className={`${glass.promptDark} absolute top-full left-0 mt-2 w-80 rounded-lg border border-theme-mid shadow-lg z-50`}
        >
          <div className="p-2">
            {/* Header */}
            <div className="px-3 py-2 border-b border-theme-mid">
              <h3 className="text-sm font-medium text-theme-text">Choose AI Model</h3>
            </div>
            
            {/* Model list */}
            <div className="max-h-80 overflow-y-auto">
              {AI_MODELS.map((model) => (
                <button
                  key={model.id}
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
            
            {/* Coming soon notice */}
            {isComingSoon && (
              <div className="px-3 py-2 border-t border-theme-mid">
                <p className="text-xs text-theme-text text-center">
                  More models coming soon!
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

ModelSelector.displayName = 'ModelSelector';

export default ModelSelector;
