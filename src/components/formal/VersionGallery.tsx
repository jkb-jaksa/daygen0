import React from 'react';
import { Loader2 } from 'lucide-react';
import { glass } from '../../styles/designSystem';

export interface ImageVersion {
  id: string;
  url: string;
  presetUsed: string;
  timestamp: number;
  isLoading?: boolean;
}

interface VersionGalleryProps {
  versions: ImageVersion[];
  selectedVersionId: string | null;
  onSelectVersion: (versionId: string) => void;
}

export function VersionGallery({ versions, selectedVersionId, onSelectVersion }: VersionGalleryProps) {
  if (versions.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-24 bottom-24 w-48 z-30">
      <div className={`${glass.prompt} rounded-2xl border border-theme-dark h-full flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-theme-dark">
          <h3 className="text-sm font-raleway font-medium text-theme-text">
            Versions ({versions.length})
          </h3>
        </div>

        {/* Scrollable gallery */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-2 scrollbar-thin scrollbar-thumb-theme-mid/30 scrollbar-track-transparent hover:scrollbar-thumb-theme-mid/50">
          {versions.map((version) => {
            const isSelected = version.id === selectedVersionId;
            const isLoading = version.isLoading;

            return (
              <button
                key={version.id}
                type="button"
                onClick={() => !isLoading && onSelectVersion(version.id)}
                disabled={isLoading}
                className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 relative group ${
                  isSelected
                    ? 'border-theme-light ring-2 ring-theme-light/50'
                    : 'border-theme-dark hover:border-theme-mid'
                } ${isLoading ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}
              >
                {isLoading ? (
                  <div className="w-full h-full flex items-center justify-center bg-theme-black">
                    <Loader2 className="w-8 h-8 text-theme-light animate-spin" />
                  </div>
                ) : (
                  <>
                    <img
                      src={version.url}
                      alt={`Version ${version.presetUsed}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Overlay on hover */}
                    {!isSelected && (
                      <div className="absolute inset-0 bg-theme-black/0 group-hover:bg-theme-black/20 transition-colors duration-200" />
                    )}
                    {/* Preset label */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-theme-black/90 to-transparent p-2">
                      <p className="text-xs font-raleway text-theme-white truncate">
                        {version.presetUsed}
                      </p>
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Mobile version - horizontal strip at bottom
export function VersionGalleryMobile({ versions, selectedVersionId, onSelectVersion }: VersionGalleryProps) {
  if (versions.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-30 lg:hidden">
      <div className={`${glass.prompt} rounded-2xl border border-theme-dark p-2`}>
        <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-theme-mid/30 scrollbar-track-transparent">
          {versions.map((version) => {
            const isSelected = version.id === selectedVersionId;
            const isLoading = version.isLoading;

            return (
              <button
                key={version.id}
                type="button"
                onClick={() => !isLoading && onSelectVersion(version.id)}
                disabled={isLoading}
                className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 relative ${
                  isSelected
                    ? 'border-theme-light ring-2 ring-theme-light/50'
                    : 'border-theme-dark hover:border-theme-mid'
                } ${isLoading ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}
              >
                {isLoading ? (
                  <div className="w-full h-full flex items-center justify-center bg-theme-black">
                    <Loader2 className="w-6 h-6 text-theme-light animate-spin" />
                  </div>
                ) : (
                  <img
                    src={version.url}
                    alt={`Version ${version.presetUsed}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}


