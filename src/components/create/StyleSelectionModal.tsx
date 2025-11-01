import React, { memo, useCallback, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
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
    totalSelectedStyles,
    totalTempSelectedStyles,
    selectedStylesLabel,
    handleToggleTempStyle,
    handleApplyStyles,
    handleClearStyles,
    handleActiveStyleGenderChange,
    handleActiveStyleSectionChange,
    STYLE_SECTION_DEFINITIONS,
    STYLE_GENDER_OPTIONS,
  } = styleHandlers;

  const activeTempStyles =
    tempSelectedStyles?.[activeStyleGender]?.[activeStyleSection] ?? [];
  
  const modalRef = useRef<HTMLDivElement>(null);
  
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
  
  // Handle clear
  const handleClear = useCallback(() => {
    handleClearStyles();
  }, [handleClearStyles]);
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/80 py-12">
      <div
        ref={modalRef}
        className={`${glass.promptDark} rounded-[20px] w-full max-w-4xl min-w-[32rem] max-h-[90vh] overflow-hidden transition-colors duration-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-theme-mid">
          <div>
            <h2 className="text-xl font-raleway font-light text-theme-text">
              Style Selection
            </h2>
            <p className="text-sm text-theme-white/70 mt-1">
              Choose styles to apply to your prompts
            </p>
          </div>
          <button
            onClick={onClose}
            className={`${buttons.ghost} p-2 rounded-lg transition-colors duration-200`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* Gender tabs */}
          <div className="flex gap-2 mb-6">
            {STYLE_GENDER_OPTIONS.map((gender) => (
              <button
                key={gender.id}
                onClick={() => handleActiveStyleGenderChange(gender.id)}
                className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeStyleGender === gender.id
                    ? 'bg-theme-accent text-theme-white'
                    : 'bg-theme-mid/50 text-theme-white hover:bg-theme-mid'
                }`}
              >
                {gender.label}
              </button>
            ))}
          </div>
          
          {/* Section tabs */}
          <div className="flex gap-2 mb-6">
            {STYLE_SECTION_DEFINITIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => handleActiveStyleSectionChange(section.id)}
                className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeStyleSection === section.id
                    ? 'bg-theme-accent text-theme-white'
                    : 'bg-theme-mid/50 text-theme-white hover:bg-theme-mid'
                }`}
              >
                {section.name}
              </button>
            ))}
          </div>
          
          {/* Style grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {/* Placeholder styles - in real implementation, this would be populated with actual style data */}
            {Array.from({ length: 12 }, (_, index) => (
              <button
                key={index}
                onClick={() => handleToggleTempStyle(activeStyleGender, activeStyleSection, {
                  id: `${activeStyleGender}-${activeStyleSection}-${index + 1}`,
                  name: `${activeStyleSection} Style ${index + 1}`,
                  prompt: `${activeStyleGender} ${activeStyleSection} inspired style ${index + 1}`,
                })}
                className={`p-4 rounded-lg border-2 transition-colors duration-200 ${
                  activeTempStyles.some(
                    style => style.id === `${activeStyleGender}-${activeStyleSection}-${index + 1}`
                  )
                    ? 'border-theme-accent bg-theme-accent/20'
                    : 'border-theme-mid bg-theme-mid/20 hover:border-theme-accent/50'
                }`}
              >
                <div className="text-center">
                  <div className="w-8 h-8 bg-theme-accent/30 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <span className="text-xs font-bold text-theme-accent">
                      {index + 1}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-theme-white">
                    {activeStyleSection} Style {index + 1}
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {/* Selection summary */}
          {totalTempSelectedStyles > 0 && (
            <div className="mb-6 p-4 rounded-lg bg-theme-accent/10 border border-theme-accent/20">
              <div className="text-sm text-theme-accent font-medium mb-2">
                Selected Styles ({totalTempSelectedStyles})
              </div>
              <div className="text-xs text-theme-white/70">
                {activeTempStyles.map(style => style.name).join(', ')}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-theme-mid">
          <div className="text-sm text-theme-white/70">
            {totalSelectedStyles > 0 && (
              <span>Current: {selectedStylesLabel}</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClear}
              className={`${buttons.ghost} text-theme-red hover:bg-theme-red/10`}
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className={`${buttons.ghost}`}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className={`${buttons.primary} flex items-center gap-2`}
            >
              <Check className="w-4 h-4" />
              Apply Styles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

StyleSelectionModal.displayName = 'StyleSelectionModal';

export default StyleSelectionModal;
