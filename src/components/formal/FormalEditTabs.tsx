import React from 'react';
import { Mountain, Sparkles, Star } from 'lucide-react';
import { glass } from '../../styles/designSystem';
import type { PresetCategory } from '../../data/formalPresets';

interface FormalEditTabsProps {
  activeTab: PresetCategory;
  onTabChange: (tab: PresetCategory) => void;
}

const TABS = [
  {
    id: 'background' as const,
    label: 'Background',
    Icon: Mountain,
    description: 'Skyscrapers, Office, Plain',
  },
  {
    id: 'effects' as const,
    label: 'Effects',
    Icon: Sparkles,
    description: 'Grain, Relight, Upscale',
  },
  {
    id: 'enhancements' as const,
    label: 'Enhancements',
    Icon: Star,
    description: 'Lipstick, Skin, Hair',
  },
];

export function FormalEditTabs({ activeTab, onTabChange }: FormalEditTabsProps) {
  return (
    <div className={`${glass.prompt} rounded-2xl border border-theme-dark p-1`}>
      <div className="flex items-center gap-1">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.Icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 relative rounded-xl px-4 py-3 transition-all duration-200 group ${
                isActive
                  ? 'bg-theme-light/20 text-theme-light'
                  : 'text-theme-white hover:text-theme-text hover:bg-theme-dark/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Icon className={`w-4 h-4 ${isActive ? 'text-theme-light' : 'text-theme-white group-hover:text-theme-text'}`} />
                <span className="font-raleway font-medium text-sm hidden sm:inline">
                  {tab.label}
                </span>
              </div>
              <span className={`hidden lg:block text-xs font-raleway mt-1 ${
                isActive ? 'text-theme-light/80' : 'text-theme-white/60 group-hover:text-theme-white/80'
              }`}>
                {tab.description}
              </span>
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-theme-light rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}


