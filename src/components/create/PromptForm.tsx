import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { lazy, Suspense } from 'react';
import {
  Wand2,
  Settings,
  User,
  Package,
  Palette,
  Scan,
  Plus,
  MessageCircle,
  BookmarkIcon,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCreateGenerationController } from './hooks/useCreateGenerationController';
import { useParallaxHover } from '../../hooks/useParallaxHover';
import { buttons, glass } from '../../styles/designSystem';
import { debugLog } from '../../utils/debug';

const ModelSelector = lazy(() => import('./ModelSelector'));
const SettingsMenu = lazy(() => import('./SettingsMenu'));
const StyleSelectionModal = lazy(() => import('./StyleSelectionModal'));
const AspectRatioDropdown = lazy(() =>
  import('../AspectRatioDropdown').then(module => ({ default: module.AspectRatioDropdown })),
);
const PromptsDropdown = lazy(() =>
  import('../PromptsDropdown').then(module => ({ default: module.PromptsDropdown })),
);

interface PromptFormProps {
  onGenerate?: () => void;
  isGenerating?: boolean;
  isButtonSpinning?: boolean;
}

type TooltipId = 'chat' | 'reference' | 'prompts';

const MAX_REFERENCE_SLOTS = 3;

const tooltipBaseClasses =
  'absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white shadow-lg z-[70] pointer-events-none transition-opacity duration-200 hidden lg:block';

const PromptForm = memo<PromptFormProps>(
  ({ onGenerate, isGenerating: isGeneratingProp, isButtonSpinning: isButtonSpinningProp }) => {
    const navigate = useNavigate();
    const {
      promptHandlers,
      referenceHandlers,
      avatarHandlers,
      productHandlers,
      styleHandlers,
      selectedModel,
      handleModelChange,
      handleGenerate,
      aspectRatioControl,
      settingsSections,
      isGenerating: controllerIsGenerating,
      isButtonSpinning: controllerIsButtonSpinning,
      error,
      clearError,
    } = useCreateGenerationController();

    const {
      prompt,
      isPromptsDropdownOpen,
      recentPrompts,
      savedPromptsList,
      handlePromptChange,
      handlePromptsDropdownToggle,
      handlePromptsDropdownClose,
      handleRemoveRecentPrompt,
      handleUpdateSavedPrompt,
      handleSavePrompt,
      setPrompt: setPromptValue,
      getFinalPrompt,
    } = promptHandlers;

    const {
      referencePreviews,
      referenceFiles,
      handlePaste,
      clearReference,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileInput,
      openRefsInput,
      fileInputRef,
      refsInputRef,
    } = referenceHandlers;

    const effectiveIsGenerating = isGeneratingProp ?? controllerIsGenerating;
    const effectiveIsButtonSpinning = isButtonSpinningProp ?? controllerIsButtonSpinning;

    const { onPointerEnter, onPointerLeave, onPointerMove } = useParallaxHover<HTMLButtonElement>();

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
    const [isAspectRatioOpen, setIsAspectRatioOpen] = useState(false);
    const aspectRatioButtonRef = useRef<HTMLButtonElement | null>(null);

    const promptBarRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const promptsButtonRef = useRef<HTMLButtonElement | null>(null);

    const [activeTooltip, setActiveTooltip] = useState<TooltipId | null>(null);
    const [isDragActive, setIsDragActive] = useState(false);

    useEffect(() => {
      if (!aspectRatioControl) {
        setIsAspectRatioOpen(false);
      }
    }, [aspectRatioControl]);

    useEffect(() => {
      if (!textareaRef.current) {
        return;
      }
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const nextHeight = Math.min(textarea.scrollHeight, 160);
      textarea.style.height = `${nextHeight}px`;
    }, [prompt]);

    const aspectRatioLabel =
      aspectRatioControl?.selectedLabel ?? aspectRatioControl?.selectedValue ?? 'Aspect Ratio';
    const showAspectRatioButton = Boolean(aspectRatioControl);

    const handleAspectRatioToggle = useCallback(() => {
      if (!aspectRatioControl) {
        return;
      }
      setIsAspectRatioOpen(prev => !prev);
    }, [aspectRatioControl]);

    const isGeminiModel = selectedModel === 'gemini-2.5-flash-image';

    const handleDragAreaEnter = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        if (!isGeminiModel) {
          return;
        }
        handleDragEnter(event);
        setIsDragActive(true);
      },
      [handleDragEnter, isGeminiModel],
    );

    const handleDragAreaLeave = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        if (!isGeminiModel) {
          return;
        }
        handleDragLeave(event);
        setIsDragActive(false);
      },
      [handleDragLeave, isGeminiModel],
    );

    const handleDragAreaOver = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        if (!isGeminiModel) {
          return;
        }
        handleDragOver(event);
      },
      [handleDragOver, isGeminiModel],
    );

    const handleDragAreaDrop = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        if (!isGeminiModel) {
          return;
        }
        handleDrop(event);
        setIsDragActive(false);
      },
      [handleDrop, isGeminiModel],
    );

    const totalReferenceCount =
      referencePreviews.length +
      (avatarHandlers.selectedAvatar ? 1 : 0) +
      (productHandlers.selectedProduct ? 1 : 0);

    const remainingReferenceSlots = Math.max(0, MAX_REFERENCE_SLOTS - totalReferenceCount);

    const triggerGenerate = useCallback(() => {
      if (error) {
        clearError();
      }
      debugLog('[PromptForm] Generate button clicked');
      if (onGenerate) {
        onGenerate();
        return;
      }
      void handleGenerate();
    }, [clearError, error, handleGenerate, onGenerate]);

    const handleSettingsToggle = useCallback(() => {
      setIsSettingsOpen(prev => !prev);
    }, []);

    const handleSettingsClose = useCallback(() => {
      setIsSettingsOpen(false);
    }, []);

    const finalPrompt = useMemo(() => getFinalPrompt(), [getFinalPrompt]);

    const canGenerate = useMemo(
      () => finalPrompt.trim().length > 0 && !effectiveIsGenerating,
      [finalPrompt, effectiveIsGenerating],
    );

    const handlePromptInput = useCallback((event: React.FormEvent<HTMLTextAreaElement>) => {
      const target = event.currentTarget;
      target.style.height = 'auto';
      target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
    }, []);

    const handlePromptChangeInternal = useCallback(
      (value: string) => {
        if (error) {
          clearError();
        }
        handlePromptChange(value);
      },
      [clearError, error, handlePromptChange],
    );

    const handlePromptSelect = useCallback(
      (value: string) => {
        setPromptValue(value);
        handlePromptsDropdownClose();
      },
      [handlePromptsDropdownClose, setPromptValue],
    );

    const promptSurfaceClasses = useMemo(() => {
      const base = `${glass.prompt} rounded-[16px] px-4 py-3 transition-colors duration-200`;
      const dragState =
        isGeminiModel && isDragActive ? 'border-brand' : 'border-[color:var(--glass-prompt-border)]';
      return `promptbar relative ${base} ${dragState}`;
    }, [isDragActive, isGeminiModel]);

    return (
      <div className="relative z-10">
        <div
          ref={promptBarRef}
          className={promptSurfaceClasses}
          onDragEnter={handleDragAreaEnter}
          onDragLeave={handleDragAreaLeave}
          onDragOver={handleDragAreaOver}
          onDrop={handleDragAreaDrop}
        >
          <div className="flex flex-col gap-3">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={event => handlePromptChangeInternal(event.target.value)}
                onInput={handlePromptInput}
                onPaste={handlePaste}
                placeholder="Describe what you want to create..."
                rows={1}
                className="w-full min-h-[36px] max-h-40 bg-transparent text-theme-white placeholder-theme-white/70 border-0 focus:outline-none focus:ring-0 px-3 py-2 font-raleway text-base leading-normal resize-none overflow-x-hidden overflow-y-auto rounded-lg transition-[height] duration-150"
              />
              <Suspense fallback={null}>
                <PromptsDropdown
                  isOpen={isPromptsDropdownOpen}
                  onClose={handlePromptsDropdownClose}
                  anchorEl={promptsButtonRef.current ?? textareaRef.current}
                  recentPrompts={recentPrompts}
                  savedPrompts={savedPromptsList}
                  onSelectPrompt={handlePromptSelect}
                  onRemoveSavedPrompt={id => handleUpdateSavedPrompt(id, '')}
                  onRemoveRecentPrompt={handleRemoveRecentPrompt}
                  onUpdateSavedPrompt={handleUpdateSavedPrompt}
                  onAddSavedPrompt={text => {
                    handleSavePrompt(text);
                    return null;
                  }}
                  onSaveRecentPrompt={handleSavePrompt}
                />
              </Suspense>
            </div>

            <div className="flex flex-col gap-2 px-3 lg:px-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => navigate('/create/chat')}
                      className="grid h-9 w-9 place-items-center rounded-full bg-transparent text-theme-white transition-colors duration-200 hover:bg-theme-white/10 hover:text-theme-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-black parallax-small"
                      aria-label="Chat mode"
                      onMouseEnter={() => setActiveTooltip('chat')}
                      onMouseLeave={() => setActiveTooltip(null)}
                      onPointerMove={onPointerMove}
                      onPointerEnter={onPointerEnter}
                      onPointerLeave={onPointerLeave}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <div
                      className={`${tooltipBaseClasses} ${
                        activeTooltip === 'chat' ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      Chat Mode
                    </div>
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isGeminiModel) {
                          return;
                        }
                        if (referenceFiles.length === 0) {
                          openFileInput();
                        } else {
                          openRefsInput();
                        }
                        setActiveTooltip(null);
                      }}
                      aria-label="Add reference image"
                      disabled={!isGeminiModel || remainingReferenceSlots === 0}
                      className={`grid h-9 w-9 place-items-center rounded-full transition-colors duration-200 parallax-small ${
                        isGeminiModel && remainingReferenceSlots > 0
                          ? 'bg-transparent text-theme-white hover:bg-theme-white/10 hover:text-theme-text'
                          : 'bg-theme-white/10 text-theme-white/50 cursor-not-allowed'
                      }`}
                      onMouseEnter={() => setActiveTooltip('reference')}
                      onMouseLeave={() => setActiveTooltip(null)}
                      onPointerMove={onPointerMove}
                      onPointerEnter={onPointerEnter}
                      onPointerLeave={onPointerLeave}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <div
                      className={`${tooltipBaseClasses} ${
                        activeTooltip === 'reference' ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      Reference Image
                    </div>
                  </div>

                  {totalReferenceCount > 0 && (
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="hidden lg:block text-sm font-raleway text-theme-white whitespace-nowrap">
                        Reference ({totalReferenceCount}/{MAX_REFERENCE_SLOTS}):
                      </div>
                      <div className="flex items-center gap-1.5">
                        {referencePreviews.map((preview, index) => (
                          <div key={`${preview}-${index}`} className="relative group">
                            <img
                              src={preview}
                              alt={`Reference ${index + 1}`}
                              className="w-10 h-10 rounded-lg object-cover border border-theme-mid/80"
                            />
                            <button
                              type="button"
                              onClick={event => {
                                event.stopPropagation();
                                clearReference(index);
                              }}
                              className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-theme-black text-theme-white transition-opacity duration-150 opacity-0 group-hover:opacity-100"
                              aria-label="Remove reference"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      ref={promptsButtonRef}
                      onClick={() => {
                        handlePromptsDropdownToggle();
                        setActiveTooltip(null);
                      }}
                      className="grid h-9 w-9 place-items-center rounded-full bg-transparent text-theme-white transition-colors duration-200 hover:bg-theme-white/10 hover:text-theme-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-theme-black parallax-small"
                      onMouseEnter={() => setActiveTooltip('prompts')}
                      onMouseLeave={() => setActiveTooltip(null)}
                      onPointerMove={onPointerMove}
                      onPointerEnter={onPointerEnter}
                      onPointerLeave={onPointerLeave}
                    >
                      <BookmarkIcon className="w-4 h-4" />
                    </button>
                    <div
                      className={`${tooltipBaseClasses} ${
                        activeTooltip === 'prompts' ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      Your Prompts
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Suspense fallback={null}>
                <ModelSelector
                  selectedModel={selectedModel}
                  onModelChange={handleModelChange}
                  isGenerating={effectiveIsGenerating}
                />
              </Suspense>

              <button
                ref={avatarHandlers.avatarButtonRef}
                onClick={avatarHandlers.handleAvatarPickerOpen}
                className={`${buttons.ghost} flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  avatarHandlers.selectedAvatar ? 'bg-theme-accent/20 text-theme-accent' : ''
                }`}
                onPointerEnter={onPointerEnter}
                onPointerLeave={onPointerLeave}
                onPointerMove={onPointerMove}
              >
                <User className="w-4 h-4" />
                {avatarHandlers.selectedAvatar ? avatarHandlers.selectedAvatar.name : 'Avatar'}
              </button>

              <button
                ref={productHandlers.productButtonRef}
                onClick={productHandlers.handleProductPickerOpen}
                className={`${buttons.ghost} flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  productHandlers.selectedProduct ? 'bg-theme-accent/20 text-theme-accent' : ''
                }`}
                onPointerEnter={onPointerEnter}
                onPointerLeave={onPointerLeave}
                onPointerMove={onPointerMove}
              >
                <Package className="w-4 h-4" />
                {productHandlers.selectedProduct ? productHandlers.selectedProduct.name : 'Product'}
              </button>

              <button
                ref={styleHandlers.stylesButtonRef}
                onClick={styleHandlers.handleStyleModalOpen}
                className={`${buttons.ghost} flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  styleHandlers.totalSelectedStyles > 0 ? 'bg-theme-accent/20 text-theme-accent' : ''
                }`}
                onPointerEnter={onPointerEnter}
                onPointerLeave={onPointerLeave}
                onPointerMove={onPointerMove}
              >
                <Palette className="w-4 h-4" />
                {styleHandlers.selectedStylesLabel || 'Style'}
              </button>

              {showAspectRatioButton && (
                <div className="relative">
                  <button
                    ref={aspectRatioButtonRef}
                    onClick={handleAspectRatioToggle}
                    disabled={effectiveIsGenerating}
                    className={`${buttons.ghost} flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                      effectiveIsGenerating ? 'cursor-not-allowed opacity-70' : ''
                    }`}
                    onPointerEnter={onPointerEnter}
                    onPointerLeave={onPointerLeave}
                    onPointerMove={onPointerMove}
                  >
                    <Scan className="w-4 h-4" />
                    {aspectRatioLabel}
                  </button>
                  <Suspense fallback={null}>
                    <AspectRatioDropdown
                      anchorRef={aspectRatioButtonRef}
                      open={isAspectRatioOpen}
                      onClose={() => setIsAspectRatioOpen(false)}
                      options={aspectRatioControl!.options}
                      selectedValue={aspectRatioControl!.selectedValue}
                      onSelect={value => {
                        aspectRatioControl?.onSelect(value);
                        setIsAspectRatioOpen(false);
                      }}
                    />
                  </Suspense>
                </div>
              )}

              <div className="relative">
                <button
                  ref={settingsButtonRef}
                  onClick={handleSettingsToggle}
                  className={`${buttons.ghost} flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200`}
                  onPointerEnter={onPointerEnter}
                  onPointerLeave={onPointerLeave}
                  onPointerMove={onPointerMove}
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={triggerGenerate}
                disabled={!canGenerate}
                className={`${buttons.primary} flex items-center gap-2 px-6 py-2 rounded-lg transition-colors duration-200 ${
                  !canGenerate ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onPointerEnter={onPointerEnter}
                onPointerLeave={onPointerLeave}
                onPointerMove={onPointerMove}
              >
                {effectiveIsButtonSpinning ? (
                  <div className="w-4 h-4 border-2 border-theme-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                Generate
              </button>
            </div>

            {error && <div className="text-sm text-theme-accent">{error}</div>}
          </div>
        </div>

        {isSettingsOpen && (
          <Suspense fallback={null}>
            <SettingsMenu
              anchorRef={settingsButtonRef}
              open={isSettingsOpen}
              onClose={handleSettingsClose}
              {...settingsSections}
            />
          </Suspense>
        )}

        {styleHandlers.isStyleModalOpen && (
          <Suspense fallback={null}>
            <StyleSelectionModal
              open={styleHandlers.isStyleModalOpen}
              onClose={styleHandlers.handleStyleModalClose}
              styleHandlers={styleHandlers}
            />
          </Suspense>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={referenceHandlers.handleFileSelected}
          className="hidden"
        />
        <input
          ref={refsInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={referenceHandlers.handleRefsSelected}
          className="hidden"
        />
      </div>
    );
  },
);

PromptForm.displayName = 'PromptForm';

export default PromptForm;
