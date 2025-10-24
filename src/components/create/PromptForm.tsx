import React, { memo, useCallback, useRef, useState } from 'react';
import { lazy, Suspense } from 'react';
import { Wand2, Settings, User, Package, Palette, Upload, X } from 'lucide-react';
import { useGeneration } from './contexts/GenerationContext';
import { usePromptHandlers } from './hooks/usePromptHandlers';
import { useReferenceHandlers } from './hooks/useReferenceHandlers';
import { useAvatarHandlers } from './hooks/useAvatarHandlers';
import { useProductHandlers } from './hooks/useProductHandlers';
import { useStyleHandlers } from './hooks/useStyleHandlers';
import { useParallaxHover } from '../../hooks/useParallaxHover';
import { buttons, glass, inputs } from '../../styles/designSystem';
import { debugLog } from '../../utils/debug';

// Lazy load components
const ModelSelector = lazy(() => import('./ModelSelector'));
const ReferenceImages = lazy(() => import('./ReferenceImages'));
const AspectRatioDropdown = lazy(() => import('../AspectRatioDropdown'));
const PromptsDropdown = lazy(() => import('../PromptsDropdown'));
const SettingsMenu = lazy(() => import('./SettingsMenu'));

interface PromptFormProps {
  onGenerate: () => void;
  isGenerating: boolean;
  isButtonSpinning: boolean;
}

const PromptForm = memo<PromptFormProps>(({ onGenerate, isGenerating, isButtonSpinning }) => {
  const { state: generationState } = useGeneration();
  const { selectedModel, batchSize } = generationState;
  
  // Initialize hooks
  const promptHandlers = usePromptHandlers({}, () => '');
  const referenceHandlers = useReferenceHandlers(null, null, () => {});
  const avatarHandlers = useAvatarHandlers();
  const productHandlers = useProductHandlers();
  const styleHandlers = useStyleHandlers();
  
  // Parallax hover effect
  const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLButtonElement>();
  
  // Settings menu state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLButtonElement | null>(null);
  
  // Handle generate
  const handleGenerate = useCallback(() => {
    debugLog('[PromptForm] Generate button clicked');
    onGenerate();
  }, [onGenerate]);
  
  // Handle settings toggle
  const handleSettingsToggle = useCallback(() => {
    setIsSettingsOpen(prev => !prev);
  }, []);
  
  // Handle settings close
  const handleSettingsClose = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);
  
  // Get final prompt with styles
  const finalPrompt = useMemo(() => promptHandlers.getFinalPrompt(), [promptHandlers.getFinalPrompt]);
  
  // Check if we can generate
  const canGenerate = useMemo(() => 
    finalPrompt.trim().length > 0 && !isGenerating, 
    [finalPrompt, isGenerating]
  );
  
  return (
    <div className="flex flex-col gap-4">
      {/* Main prompt area */}
      <div className="relative">
        <textarea
          value={promptHandlers.prompt}
          onChange={(e) => promptHandlers.handlePromptChange(e.target.value)}
          onPaste={referenceHandlers.handlePaste}
          placeholder="Describe what you want to create..."
          className={`${inputs.prompt} resize-none overflow-hidden`}
          style={{ 
            minHeight: '60px',
            maxHeight: '160px',
            height: 'auto'
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
          }}
        />
        
        {/* Prompt history dropdown */}
        <Suspense fallback={null}>
          <PromptsDropdown
            open={promptHandlers.isPromptsDropdownOpen}
            recentPrompts={promptHandlers.recentPrompts}
            savedPrompts={promptHandlers.savedPromptsList}
            selectedPrompt={promptHandlers.prompt}
            onClose={promptHandlers.handlePromptsDropdownClose}
            onRecentSelect={promptHandlers.handleRecentPromptSelect}
            onSavedSelect={promptHandlers.handleSavedPromptSelect}
            onRemoveRecent={promptHandlers.handleRemoveRecentPrompt}
            onUpdateSaved={promptHandlers.handleUpdateSavedPrompt}
            onSave={promptHandlers.handleSavePrompt}
            onUnsave={promptHandlers.handleUnsavePrompt}
            isCurrentSaved={promptHandlers.isCurrentPromptSaved}
          />
        </Suspense>
      </div>
      
      {/* Reference images */}
      <Suspense fallback={null}>
        <ReferenceImages
          referenceFiles={referenceHandlers.referenceFiles}
          referencePreviews={referenceHandlers.referencePreviews}
          selectedAvatar={avatarHandlers.selectedAvatar}
          selectedProduct={productHandlers.selectedProduct}
          onClearReference={referenceHandlers.clearReference}
          onClearAllReferences={referenceHandlers.clearAllReferences}
          onOpenFileInput={referenceHandlers.openFileInput}
          onOpenRefsInput={referenceHandlers.openRefsInput}
          fileInputRef={referenceHandlers.fileInputRef}
          refsInputRef={referenceHandlers.refsInputRef}
        />
      </Suspense>
      
      {/* Control buttons */}
      <div className="flex items-center gap-3">
        {/* Model selector */}
        <Suspense fallback={null}>
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={() => {}}
            isGenerating={isGenerating}
          />
        </Suspense>
        
        {/* Avatar button */}
        <button
          ref={avatarHandlers.avatarButtonRef}
          onClick={avatarHandlers.handleAvatarPickerOpen}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          onPointerMove={onPointerMove}
          className={`${buttons.ghost} flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
            avatarHandlers.selectedAvatar ? 'bg-theme-accent/20 text-theme-accent' : ''
          }`}
        >
          <User className="w-4 h-4" />
          {avatarHandlers.selectedAvatar ? avatarHandlers.selectedAvatar.name : 'Avatar'}
        </button>
        
        {/* Product button */}
        <button
          ref={productHandlers.productButtonRef}
          onClick={productHandlers.handleProductPickerOpen}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          onPointerMove={onPointerMove}
          className={`${buttons.ghost} flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
            productHandlers.selectedProduct ? 'bg-theme-accent/20 text-theme-accent' : ''
          }`}
        >
          <Package className="w-4 h-4" />
          {productHandlers.selectedProduct ? productHandlers.selectedProduct.name : 'Product'}
        </button>
        
        {/* Style button */}
        <button
          ref={styleHandlers.stylesButtonRef}
          onClick={styleHandlers.handleStyleModalOpen}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          onPointerMove={onPointerMove}
          className={`${buttons.ghost} flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
            styleHandlers.totalSelectedStyles > 0 ? 'bg-theme-accent/20 text-theme-accent' : ''
          }`}
        >
          <Palette className="w-4 h-4" />
          {styleHandlers.selectedStylesLabel || 'Style'}
        </button>
        
        {/* Aspect ratio selector */}
        <Suspense fallback={null}>
          <AspectRatioDropdown
            selectedModel={selectedModel}
            onAspectRatioChange={() => {}}
            disabled={isGenerating}
          />
        </Suspense>
        
        {/* Settings button */}
        <button
          ref={settingsRef}
          onClick={handleSettingsToggle}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          onPointerMove={onPointerMove}
          className={`${buttons.ghost} flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200`}
        >
          <Settings className="w-4 h-4" />
        </button>
        
        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          onPointerMove={onPointerMove}
          className={`${buttons.primary} flex items-center gap-2 px-6 py-2 rounded-lg transition-colors duration-200 ${
            !canGenerate ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isButtonSpinning ? (
            <div className="w-4 h-4 border-2 border-theme-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          Generate
        </button>
      </div>
      
      {/* Settings menu */}
      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsMenu
            open={isSettingsOpen}
            onClose={handleSettingsClose}
            settingsRef={settingsRef}
          />
        </Suspense>
      )}
      
      {/* Hidden file inputs */}
      <input
        ref={referenceHandlers.fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={referenceHandlers.handleFileSelected}
        className="hidden"
      />
      <input
        ref={referenceHandlers.refsInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={referenceHandlers.handleRefsSelected}
        className="hidden"
      />
    </div>
  );
});

PromptForm.displayName = 'PromptForm';

export default PromptForm;
