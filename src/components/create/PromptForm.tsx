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
import { useGallery } from './contexts/GalleryContext';
import { buttons, glass } from '../../styles/designSystem';
import { debugLog } from '../../utils/debug';
import { SIDEBAR_PROMPT_GAP } from './layoutConstants';

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
  onPromptBarHeightChange?: (reservedSpace: number) => void;
}

const MAX_REFERENCE_SLOTS = 3;

// Tooltip helper functions (matching V1 implementation)
const showHoverTooltip = (target: HTMLElement, tooltipId: string) => {
  if (typeof document === 'undefined') return;
  const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`) as HTMLElement | null;
  if (!tooltip) return;
  const ownerCard = target.closest('.group') as HTMLElement | null;
  if (ownerCard) {
    const triggerRect = target.getBoundingClientRect();
    const cardRect = ownerCard.getBoundingClientRect();
    const relativeTop = triggerRect.top - cardRect.top;
    const relativeLeft = triggerRect.left - cardRect.left + triggerRect.width / 2;
    tooltip.style.top = `${relativeTop - 8}px`;
    tooltip.style.left = `${relativeLeft}px`;
    tooltip.style.transform = 'translateX(-50%) translateY(-100%)';
  }
  tooltip.classList.remove('opacity-0');
  tooltip.classList.add('opacity-100');
};

const hideHoverTooltip = (tooltipId: string) => {
  if (typeof document === 'undefined') return;
  const tooltip = document.querySelector(`[data-tooltip-for="${tooltipId}"]`) as HTMLElement | null;
  if (!tooltip) return;
  tooltip.classList.remove('opacity-100');
  tooltip.classList.add('opacity-0');
};

const tooltipBaseClasses =
  'absolute left-1/2 -translate-x-1/2 -top-2 -translate-y-full whitespace-nowrap rounded-lg bg-theme-black border border-theme-mid px-2 py-1 text-xs text-theme-white opacity-0 shadow-lg z-[70] pointer-events-none hidden lg:block';

const PromptForm = memo<PromptFormProps>(
  ({
    onGenerate,
    isGenerating: isGeneratingProp,
    isButtonSpinning: isButtonSpinningProp,
    onPromptBarHeightChange,
  }) => {
    const navigate = useNavigate();
    const { setFullSizeImage, setFullSizeOpen } = useGallery();
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

    const [isDragActive, setIsDragActive] = useState(false);

    useEffect(() => {
      if (!onPromptBarHeightChange || typeof window === 'undefined') {
        return;
      }

      let animationFrame: number | null = null;

      const notifyReservedSpace = () => {
        animationFrame = null;
        const promptElement = promptBarRef.current;
        if (!promptElement) {
          onPromptBarHeightChange(0);
          return;
        }

        const rect = promptElement.getBoundingClientRect();
        const distanceFromBottom = window.innerHeight - rect.top;
        const reservedSpace = Math.max(0, Math.round(distanceFromBottom + SIDEBAR_PROMPT_GAP));
        onPromptBarHeightChange(reservedSpace);
      };

      const queueNotify = () => {
        if (animationFrame !== null) {
          window.cancelAnimationFrame(animationFrame);
        }
        animationFrame = window.requestAnimationFrame(notifyReservedSpace);
      };

      queueNotify();

      const handleResize = () => {
        queueNotify();
      };

      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);

      let resizeObserver: ResizeObserver | null = null;

      const element = promptBarRef.current;
      if (typeof ResizeObserver !== 'undefined' && element) {
        resizeObserver = new ResizeObserver(() => {
          queueNotify();
        });
        resizeObserver.observe(element);
      }

      return () => {
        if (animationFrame !== null) {
          window.cancelAnimationFrame(animationFrame);
        }
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
        resizeObserver?.disconnect();
        onPromptBarHeightChange(0);
      };
    }, [onPromptBarHeightChange]);

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
      const dragState = isGeminiModel && isDragActive ? 'border-brand drag-active' : 'border-n-mid';
      return `promptbar fixed z-40 ${base} ${dragState}`;
    }, [isDragActive, isGeminiModel]);

    return (
      <div
        ref={promptBarRef}
        className={promptSurfaceClasses}
        style={{
          bottom: '0.75rem',
          transform: 'translateX(-50%) translateZ(0)',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        }}
        onDragEnter={handleDragAreaEnter}
        onDragLeave={handleDragAreaLeave}
        onDragOver={handleDragAreaOver}
        onDrop={handleDragAreaDrop}
      >
        <div className="flex gap-3 items-stretch">
          <div className="flex-1 flex flex-col">
            <div className="mb-1">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={event => handlePromptChangeInternal(event.target.value)}
                onInput={handlePromptInput}
                onPaste={handlePaste}
                placeholder="Describe what you want to create..."
                rows={1}
                className={`w-full min-h-[36px] max-h-40 bg-transparent ${prompt.trim() ? 'text-n-text' : 'text-n-white'} placeholder-n-white border-0 focus:outline-none ring-0 focus:ring-0 focus:text-n-text font-raleway text-base px-3 py-2 leading-normal resize-none overflow-x-hidden overflow-y-auto text-left whitespace-pre-wrap break-words rounded-lg transition-[height] duration-150`}
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
            
            <div className="flex items-center justify-between gap-2 px-3">
              <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => navigate('/create/chat')}
                    className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text grid place-items-center h-8 w-8 rounded-full transition-colors duration-200 parallax-small`}
                    aria-label="Chat mode"
                    onMouseEnter={(e) => {
                      showHoverTooltip(e.currentTarget, 'chat-mode-tooltip');
                    }}
                    onMouseLeave={() => {
                      hideHoverTooltip('chat-mode-tooltip');
                    }}
                    onPointerMove={onPointerMove}
                    onPointerEnter={onPointerEnter}
                    onPointerLeave={onPointerLeave}
                  >
                    <MessageCircle className="w-3 h-3 flex-shrink-0 text-n-text" />
                  </button>
                  <div
                    data-tooltip-for="chat-mode-tooltip"
                    className={tooltipBaseClasses}
                    style={{ left: '50%', transform: 'translateX(-50%) translateY(-100%)', top: '0px' }}
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
                    }}
                    aria-label="Add reference image"
                    disabled={!isGeminiModel || remainingReferenceSlots === 0}
                    className={`${isGeminiModel ? `${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text` : 'bg-n-black/20 text-n-white/40 cursor-not-allowed'} grid place-items-center h-8 w-8 rounded-full transition-colors duration-200 parallax-small`}
                    onMouseEnter={() => {
                      if (isGeminiModel && typeof document !== 'undefined') {
                        const tooltip = document.querySelector(`[data-tooltip-for="reference-tooltip"]`) as HTMLElement | null;
                        if (tooltip) {
                          tooltip.style.top = '0px';
                          tooltip.style.left = '50%';
                          tooltip.style.transform = 'translateX(-50%) translateY(-100%)';
                          tooltip.classList.remove('opacity-0');
                          tooltip.classList.add('opacity-100');
                        }
                      }
                    }}
                    onMouseLeave={() => {
                      if (typeof document !== 'undefined') {
                        const tooltip = document.querySelector(`[data-tooltip-for="reference-tooltip"]`) as HTMLElement | null;
                        if (tooltip) {
                          tooltip.classList.remove('opacity-100');
                          tooltip.classList.add('opacity-0');
                        }
                      }
                    }}
                    onPointerMove={onPointerMove}
                    onPointerEnter={onPointerEnter}
                    onPointerLeave={onPointerLeave}
                  >
                    <Plus className="w-4 h-4 flex-shrink-0" />
                  </button>
                  <div
                    data-tooltip-for="reference-tooltip"
                    className={tooltipBaseClasses}
                    style={{ left: '50%', transform: 'translateX(-50%) translateY(-100%)', top: '0px' }}
                  >
                    Reference Image
                  </div>
                </div>

                {totalReferenceCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="hidden lg:block text-sm text-n-text font-raleway">Reference ({totalReferenceCount}/{MAX_REFERENCE_SLOTS}):</div>
                    <div className="flex items-center gap-1.5">
                      {referencePreviews.map((preview, index) => (
                        <div key={`${preview}-${index}`} className="relative group">
                          <img
                            src={preview}
                            alt={`Reference ${index + 1}`}
                            loading="lazy"
                            className="w-9 h-9 rounded-lg object-cover border border-theme-mid cursor-pointer hover:bg-theme-light transition-colors duration-200"
                            onClick={() => {
                              setFullSizeImage(
                                {
                                  url: preview,
                                  prompt: '',
                                  timestamp: new Date().toISOString(),
                                },
                                0
                              );
                              setFullSizeOpen(true);
                            }}
                          />
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation();
                              clearReference(index);
                            }}
                            className="absolute -top-1 -right-1 bg-n-black hover:bg-n-dark text-n-text hover:text-n-text rounded-full p-0.5 transition-all duration-200"
                            title="Remove reference"
                          >
                            <X className="w-2.5 h-2.5 text-n-text" />
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
                    }}
                    className={`${glass.promptBorderless} hover:bg-n-text/20 text-n-text hover:text-n-text grid place-items-center h-8 w-8 rounded-full transition-colors duration-200 parallax-small`}
                    onMouseEnter={(e) => {
                      showHoverTooltip(e.currentTarget, 'prompts-tooltip');
                    }}
                    onMouseLeave={() => {
                      hideHoverTooltip('prompts-tooltip');
                    }}
                    onPointerMove={onPointerMove}
                    onPointerEnter={onPointerEnter}
                    onPointerLeave={onPointerLeave}
                  >
                    <BookmarkIcon className="w-4 h-4" />
                  </button>
                  <div
                    data-tooltip-for="prompts-tooltip"
                    className={tooltipBaseClasses}
                    style={{ left: '50%', transform: 'translateX(-50%) translateY(-100%)', top: '0px' }}
                  >
                    Your Prompts
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
