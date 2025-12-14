import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  fetchElevenLabsVoices,
  type ElevenLabsVoiceSummary,
} from "../../utils/audioApi";
import { inputs } from "../../styles/designSystem";
import { ChevronDown, Check, User, Sparkles, Mic, Play, Square } from "lucide-react";


// Reusable component for selecting a voice
type VoiceSelectorProps = {
  value: string;
  onChange: (voiceId: string) => void;
  className?: string;
  recentVoice?: ElevenLabsVoiceSummary | null;
  onLoaded?: (voices: ElevenLabsVoiceSummary[]) => void;
  defaultOpen?: boolean;
};

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  value,
  onChange,
  className = "",
  recentVoice,
  onLoaded,
  defaultOpen = false,
}) => {
  const [voices, setVoices] = useState<ElevenLabsVoiceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [dropdownPosition, setDropdownPosition] = useState<{
    vertical: "top" | "bottom";
    horizontal: "left" | "right";
  }>({ vertical: "bottom", horizontal: "left" });
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const togglePreview = (url: string, id: string) => {
    if (playingVoiceId === id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingVoiceId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlayingVoiceId(null);

      audio.play().catch(console.error);
      setPlayingVoiceId(id);
    }
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchElevenLabsVoices()
      .then((response) => {
        if (isMounted) {
          const loadedVoices = response.voices || [];
          setVoices(loadedVoices);
          if (onLoaded) {
            onLoaded(loadedVoices);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("Failed to load voices:", err);
          setError("Failed to load voices.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    // Cleanup audio on unmount
    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, [onLoaded]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const groupedVoices = useMemo(() => {
    const combined = [...voices];
    if (
      recentVoice &&
      !combined.some((voice) => voice.voice_id === recentVoice.voice_id)
    ) {
      combined.unshift(recentVoice);
    }

    // Filter out any voices without a valid voice_id
    const validVoices = combined.filter((voice) => voice.voice_id);

    const groups: Record<string, ElevenLabsVoiceSummary[]> = {};
    validVoices.forEach((voice) => {
      const category = voice.category || "premade";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(voice);
    });
    return groups;
  }, [voices, recentVoice]);

  const selectedVoice = useMemo(
    () => voices.find((v) => v.voice_id === value) || (recentVoice?.voice_id === value ? recentVoice : null),
    [voices, value, recentVoice]
  );

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "generated":
        return <Sparkles className="size-3 text-theme-orange-1" />;
      case "cloned":
        return <User className="size-3 text-brand-cyan" />;
      default:
        return null;
    }
  };

  useEffect(() => {
    if (isOpen && containerRef.current) {
      // Smart positioning logic
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const spaceRight = window.innerWidth - rect.left;
      const DROPDOWN_HEIGHT = 350;
      const DROPDOWN_WIDTH = 320;

      let vertical: "top" | "bottom" = "bottom";
      let horizontal: "left" | "right" = "left";

      if (spaceBelow < DROPDOWN_HEIGHT && spaceAbove > spaceBelow) {
        vertical = "top";
      }

      if (spaceRight < DROPDOWN_WIDTH) {
        horizontal = "right";
      }

      setDropdownPosition({ vertical, horizontal });
    }
  }, [isOpen]);



  const handleSelect = (voiceId: string) => {
    onChange(voiceId);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    if (isLoading || (!!error && voices.length === 0)) return;

    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={isLoading || (!!error && voices.length === 0)}
        className={`${inputs.base} w-full flex items-center justify-between gap-2 px-3 focus:ring-2 focus:ring-theme-mid cursor-pointer text-left`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate">
          <Mic className={`size-4 ${value ? "text-brand-cyan" : "text-theme-light"}`} />
          <span className={`block truncate ${!selectedVoice ? "text-theme-white/60" : "text-theme-text"}`}>
            {isLoading
              ? "Loading voices..."
              : error && voices.length === 0
                ? "Error loading voices"
                : selectedVoice?.name || "Select a voice"}
          </span>
        </div>
        <ChevronDown
          className={`size-4 text-theme-light transition-transform duration-200 ${isOpen ? "rotate-180" : ""
            }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute z-[60] max-h-80 w-72 xs:w-80 overflow-y-auto overflow-x-hidden rounded-xl border border-theme-dark bg-theme-black/95 backdrop-blur-xl shadow-2xl custom-scrollbar 
              ${dropdownPosition.vertical === "bottom" ? "top-full mt-2 origin-top" : "bottom-full mb-2 origin-bottom"}
              ${dropdownPosition.horizontal === "left" ? "left-0" : "right-0"}
            `}
        >
          <div className="py-2">
            {Object.entries(groupedVoices).map(([category, categoryVoices]) => (
              <div key={category} className="mb-2 last:mb-0">
                <div className="sticky top-0 z-10 bg-theme-black/95 backdrop-blur-md px-3 py-1.5 mb-1 border-b border-theme-dark/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-theme-light/80 flex items-center gap-2">
                    {category}
                    {getCategoryIcon(category)}
                  </span>
                </div>
                <div className="px-1">
                  {categoryVoices.map((voice) => {
                    const isSelected = voice.voice_id === value;
                    return (
                      <div
                        key={`${category}-${voice.voice_id}`}
                        onClick={() => handleSelect(voice.voice_id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150 group cursor-pointer ${isSelected
                          ? "bg-theme-white/10 text-theme-text"
                          : "text-theme-white/80 hover:bg-theme-white/5 hover:text-theme-text"
                          }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="truncate">{voice.name}</span>
                          {isSelected && (
                            <Check className="size-3.5 text-brand-cyan flex-shrink-0" />
                          )}
                        </div>

                        {voice.previewUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (voice.previewUrl) {
                                togglePreview(voice.previewUrl, voice.voice_id);
                              }
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                            className="p-1.5 rounded-full hover:bg-theme-white/20 text-theme-white/70 hover:text-theme-white transition-colors flex-shrink-0 z-10"
                          >
                            {playingVoiceId === voice.voice_id ? (
                              <Square size={12} fill="currentColor" />
                            ) : (
                              <Play size={12} fill="currentColor" />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {Object.keys(groupedVoices).length === 0 && (
              <div className="px-3 py-2 text-sm text-theme-light text-center">
                No voices found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
