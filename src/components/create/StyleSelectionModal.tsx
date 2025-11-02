import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { buttons, glass } from '../../styles/designSystem';
import type { StyleHandlers } from './hooks/useStyleHandlers';

interface StyleSelectionModalProps {
  open: boolean;
  onClose: () => void;
  styleHandlers: StyleHandlers;
}

const StyleSelectionModal = memo<StyleSelectionModalProps>(({ open, onClose, styleHandlers }) => {
  const {
    tempSelectedStyles,
    activeStyleGender,
    activeStyleSection,
    totalTempSelectedStyles,
    handleToggleTempStyle,
    handleApplyStyles,
    handleActiveStyleGenderChange,
    handleActiveStyleSectionChange,
    STYLE_SECTION_DEFINITIONS,
    STYLE_GENDER_OPTIONS,
    activeStyleSectionData,
  } = styleHandlers;

  const activeTempStyles =
    tempSelectedStyles?.[activeStyleGender]?.[activeStyleSection] ?? [];
  
  const modalRef = useRef<HTMLDivElement>(null);

  const genderSelectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { id } of STYLE_GENDER_OPTIONS) {
      const sections = tempSelectedStyles[id];
      const total = Object.values(sections ?? {}).reduce((count, styles) => count + styles.length, 0);
      counts.set(id, total);
    }
    return counts;
  }, [STYLE_GENDER_OPTIONS, tempSelectedStyles]);
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    };
    
    if (open) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);
  
  // Handle apply
  const handleApply = useCallback(() => {
    handleApplyStyles();
  }, [handleApplyStyles]);
  
  if (!open) return null;
  
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/75 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`${glass.promptDark} w-full max-w-4xl rounded-3xl border border-theme-dark px-6 pb-6 pt-4 shadow-2xl max-h-[80vh] flex flex-col`}
        onClick={event => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="style-modal-heading" className="text-lg font-raleway text-theme-text">
            Style
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-full border border-theme-mid bg-theme-black text-theme-white transition-colors duration-200 hover:text-theme-text"
            aria-label="Close style"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2">
            {STYLE_GENDER_OPTIONS.map(option => {
              const isActive = option.id === activeStyleGender;
              const selectedCount = genderSelectionCounts.get(option.id) ?? 0;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleActiveStyleGenderChange(option.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-raleway transition-colors duration-200 ${
                    isActive
                      ? 'bg-theme-text text-theme-black border border-theme-text'
                      : `${glass.promptDark} text-theme-white hover:text-theme-text hover:border-theme-text/70`
                  }`}
                  aria-pressed={isActive}
                >
                  <span>{option.label}</span>
                  {selectedCount > 0 && (
                    <span
                      className={`ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-2 text-xs font-medium ${
                        isActive ? 'bg-theme-text text-theme-black' : 'bg-[color:var(--glass-dark-bg)] text-theme-text'
                      }`}
                    >
                      {selectedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {STYLE_SECTION_DEFINITIONS.map(section => {
              const isActive = section.id === activeStyleSection;
              const sectionSelectedCount = tempSelectedStyles[activeStyleGender][section.id].length;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleActiveStyleSectionChange(section.id)}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-raleway transition-colors duration-200 ${
                    isActive
                      ? 'bg-theme-text text-theme-black border border-theme-text'
                      : `${glass.promptDark} text-theme-white hover:text-theme-text hover:border-theme-text/70`
                  }`}
                  aria-pressed={isActive}
                >
                  {section.image && (
                    <img
                      src={section.image}
                      alt={`${section.name} category`}
                      className="h-5 w-5 rounded object-cover"
                    />
                  )}
                  <span>{section.name}</span>
                  {sectionSelectedCount > 0 && (
                    <span
                      className={`ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-2 text-xs font-medium ${
                        isActive ? 'bg-theme-text text-theme-black' : 'bg-[color:var(--glass-dark-bg)] text-theme-text'
                      }`}
                    >
                      {sectionSelectedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-1 pb-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {activeStyleSectionData.options.map(option => {
                const isActive = activeTempStyles.some(style => style.id === option.id);
                const backgroundImage = option.image
                  ? `url(${encodeURI(option.image)})`
                  : option.previewGradient ?? 'linear-gradient(135deg, rgba(244,114,182,0.35) 0%, rgba(59,130,246,0.55) 100%)';
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleToggleTempStyle(activeStyleGender, activeStyleSectionData.id, option)}
                    className="group w-full text-left"
                  >
                    <div
                      className={`relative overflow-hidden rounded-xl border transition-colors duration-200 ${
                        isActive ? 'border-theme-text' : 'border-theme-mid group-hover:border-theme-text'
                      }`}
                    >
                      <div
                        role="img"
                        aria-label={`${option.name} style preview`}
                        className="aspect-square w-full"
                        style={{
                          backgroundImage,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 z-10">
                        <div className="PromptDescriptionBar rounded-b-xl px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-raleway font-[300] text-theme-text">{option.name}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {activeStyleSectionData.options.length === 0 && (
              <p className="px-1 text-sm font-raleway text-theme-white/70">
                Style options are coming soon.
              </p>
            )}

            <p className="mt-3 text-sm font-raleway text-theme-white">
              Style adds ready-made prompt guidance that layers on top of your description. Select any combination that fits your vision.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className={buttons.ghost}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={totalTempSelectedStyles === 0}
            className={`${buttons.primary} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
});

StyleSelectionModal.displayName = 'StyleSelectionModal';

export default StyleSelectionModal;
