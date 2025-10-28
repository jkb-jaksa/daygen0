import React from 'react';
import { Sparkles } from 'lucide-react';
import { glass } from '../../styles/designSystem';
import type { FormalPreset } from '../../data/formalPresets';

interface PresetGridProps {
  presets: FormalPreset[];
  selectedPresetId: string | null;
  onSelectPreset: (presetId: string) => void;
  isGenerating?: boolean;
}

export function PresetGrid({ presets, selectedPresetId, onSelectPreset, isGenerating }: PresetGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4">
      {presets.map((preset) => {
        const isSelected = preset.id === selectedPresetId;
        const isCustom = preset.isCustom;

        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelectPreset(preset.id)}
            disabled={isGenerating}
            className={`group relative rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
              isSelected
                ? 'border-theme-light bg-theme-light/10 ring-2 ring-theme-light/50'
                : 'border-theme-dark hover:border-theme-mid bg-theme-black/40'
            } ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${
              isCustom ? 'border-dashed' : ''
            }`}
          >
            {/* Preset card content */}
            <div className="aspect-square flex flex-col items-center justify-center p-4 relative">
              {isCustom ? (
                <>
                  <div className={`mb-2 p-3 rounded-full ${glass.prompt} border border-theme-dark group-hover:border-theme-mid transition-colors duration-200`}>
                    <Sparkles className={`w-6 h-6 ${isSelected ? 'text-theme-light' : 'text-theme-white group-hover:text-theme-text'}`} />
                  </div>
                  <span className={`text-sm font-raleway font-medium ${isSelected ? 'text-theme-light' : 'text-theme-white group-hover:text-theme-text'}`}>
                    {preset.name}
                  </span>
                  <span className="text-xs font-raleway text-theme-white/60 mt-1 text-center">
                    {preset.description}
                  </span>
                </>
              ) : (
                <>
                  {/* Preset preview - placeholder gradient for now */}
                  <div 
                    className="absolute inset-0 opacity-20"
                    style={{
                      background: `linear-gradient(135deg, rgba(${Math.random() * 100 + 150}, ${Math.random() * 100 + 100}, ${Math.random() * 100 + 150}, 0.3) 0%, rgba(${Math.random() * 100 + 100}, ${Math.random() * 100 + 150}, ${Math.random() * 100 + 150}, 0.5) 100%)`,
                    }}
                  />
                  <div className="relative z-10 text-center">
                    <span className={`text-base font-raleway font-medium block mb-1 ${isSelected ? 'text-theme-light' : 'text-theme-text'}`}>
                      {preset.name}
                    </span>
                    <span className="text-xs font-raleway text-theme-white/70 block">
                      {preset.description}
                    </span>
                  </div>
                </>
              )}

              {/* Selected indicator */}
              {isSelected && !isCustom && (
                <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-theme-light ring-2 ring-theme-light/50" />
              )}
            </div>

            {/* Hover effect overlay */}
            {!isSelected && !isCustom && (
              <div className="absolute inset-0 bg-gradient-to-t from-theme-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// Grouped preset display for background category with subcategories
interface GroupedPresetGridProps {
  groups: {
    label: string;
    presets: FormalPreset[];
  }[];
  selectedPresetId: string | null;
  onSelectPreset: (presetId: string) => void;
  isGenerating?: boolean;
}

export function GroupedPresetGrid({ groups, selectedPresetId, onSelectPreset, isGenerating }: GroupedPresetGridProps) {
  return (
    <div className="space-y-6 p-4">
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="text-sm font-raleway font-medium text-theme-text mb-3 px-2">
            {group.label}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {group.presets.map((preset) => {
              const isSelected = preset.id === selectedPresetId;
              const isCustom = preset.isCustom;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset.id)}
                  disabled={isGenerating}
                  className={`group relative rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                    isSelected
                      ? 'border-theme-light bg-theme-light/10 ring-2 ring-theme-light/50'
                      : 'border-theme-dark hover:border-theme-mid bg-theme-black/40'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${
                    isCustom ? 'border-dashed' : ''
                  }`}
                >
                  <div className="aspect-square flex flex-col items-center justify-center p-4 relative">
                    {isCustom ? (
                      <>
                        <div className={`mb-2 p-3 rounded-full ${glass.prompt} border border-theme-dark group-hover:border-theme-mid transition-colors duration-200`}>
                          <Sparkles className={`w-6 h-6 ${isSelected ? 'text-theme-light' : 'text-theme-white group-hover:text-theme-text'}`} />
                        </div>
                        <span className={`text-sm font-raleway font-medium ${isSelected ? 'text-theme-light' : 'text-theme-white group-hover:text-theme-text'}`}>
                          {preset.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <div 
                          className="absolute inset-0 opacity-20"
                          style={{
                            background: `linear-gradient(135deg, rgba(${Math.random() * 100 + 150}, ${Math.random() * 100 + 100}, ${Math.random() * 100 + 150}, 0.3) 0%, rgba(${Math.random() * 100 + 100}, ${Math.random() * 100 + 150}, ${Math.random() * 100 + 150}, 0.5) 100%)`,
                          }}
                        />
                        <div className="relative z-10 text-center">
                          <span className={`text-base font-raleway font-medium block ${isSelected ? 'text-theme-light' : 'text-theme-text'}`}>
                            {preset.name}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-theme-light ring-2 ring-theme-light/50" />
                        )}
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}


