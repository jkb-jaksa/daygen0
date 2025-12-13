import React, { useEffect, useMemo, useState, useRef } from "react";
import { Search, Loader2, ChevronRight, Check, Play, Pause } from "lucide-react";
import {
  fetchElevenLabsVoices,
  type ElevenLabsVoiceSummary,
} from "../../utils/audioApi";

// Reusable component for selecting a voice
type VoiceSelectorProps = {
  value: string;
  onChange: (voiceId: string) => void;
  className?: string;
  recentVoice?: ElevenLabsVoiceSummary | null;
  onLoaded?: (voices: ElevenLabsVoiceSummary[]) => void;
};

// Helper to generate a consistent gradient based on string
const getAvatarGradient = (name: string) => {
  const colors = [
    "from-purple-500 to-indigo-500",
    "from-pink-500 to-rose-500",
    "from-orange-500 to-amber-500",
    "from-blue-500 to-cyan-500",
    "from-emerald-500 to-teal-500",
    "from-violet-500 to-fuchsia-500",
  ];
  const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
};

const VoiceItem = ({
  voice,
  isSelected,
  onClick,
  onPlayPreview,
  isPlaying
}: {
  voice: ElevenLabsVoiceSummary;
  isSelected: boolean;
  onClick: () => void;
  onPlayPreview: (e: React.MouseEvent) => void;
  isPlaying: boolean;
}) => {
  const gradient = useMemo(() => getAvatarGradient(voice.name), [voice.name]);

  // Extract all useful labels
  const labels = Object.values(voice.labels || {}).filter(Boolean);
  // Show all badges
  const displayBadges = labels;

  return (
    <div
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors duration-200 group/item cursor-pointer ${isSelected ? "bg-theme-text/10" : "hover:bg-theme-text/5"
        }`}
    >
      {/* Avatar / Play Button */}
      <div className="relative w-8 h-8 flex-shrink-0">
        <div
          className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br ${gradient} transition-opacity duration-200 ${isPlaying ? 'opacity-0' : 'group-hover/item:opacity-0 opacity-100'}`}
        >
          <span className="text-white text-xs font-bold opacity-90">{voice.name.charAt(0)}</span>
        </div>

        {/* Play Overlay */}
        <button
          type="button"
          onClick={onPlayPreview}
          className={`absolute inset-0 w-full h-full rounded-full flex items-center justify-center bg-theme-white text-theme-black transition-all duration-200 hover:scale-105 z-10 ${isPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover/item:opacity-100 group-hover/item:scale-100'}`}
          title={isPlaying ? "Pause preview" : "Play preview"}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>
      </div>

      {/* Info & Badges Container */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        {/* Name */}
        <span className={`text-sm font-raleway truncate whitespace-nowrap flex-shrink-0 max-w-[140px] ${isSelected ? "text-theme-text font-medium" : "text-theme-white group-hover/item:text-theme-text"}`}>
          {voice.name}
        </span>

        {/* Badges Row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {displayBadges.map((badge, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-full bg-theme-white/10 text-[10px] font-raleway text-theme-light whitespace-nowrap border border-transparent group-hover/item:border-theme-white/20 transition-colors flex-shrink-0"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      {isSelected && <Check className="w-4 h-4 text-theme-text flex-shrink-0" />}
    </div>
  );
};

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  value,
  onChange,
  className = "",
  recentVoice,
  onLoaded,
}) => {
  const [voices, setVoices] = useState<ElevenLabsVoiceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Audio Playback
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

    return () => {
      isMounted = false;
    };
  }, [onLoaded]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayPreview = (e: React.MouseEvent, voice: ElevenLabsVoiceSummary) => {
    e.stopPropagation();

    if (playingVoiceId === voice.voice_id) {
      // Pause/Stop
      if (audioRef.current) {
        audioRef.current.pause();
        setPlayingVoiceId(null);
      }
      return;
    }

    // Play new
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const previewUrl = voice.previewUrl || voice.preview_url;

    if (previewUrl) {
      const audio = new Audio(previewUrl);
      audio.onended = () => setPlayingVoiceId(null);
      audio.onerror = (err) => {
        console.error("Audio playback error", err);
        setPlayingVoiceId(null);
      };

      audioRef.current = audio;
      audio.play().catch(err => console.error("Play failed", err));
      setPlayingVoiceId(voice.voice_id);
    } else {
      console.warn("No preview URL for voice:", voice.name);
    }
  };

  const filteredVoices = useMemo(() => {
    if (!searchQuery.trim()) return voices;
    const lowerQuery = searchQuery.toLowerCase();
    return voices.filter(v =>
      v.name.toLowerCase().includes(lowerQuery) ||
      Object.values(v.labels || {}).some(l => l.toLowerCase().includes(lowerQuery))
    );
  }, [voices, searchQuery]);

  const groupedVoices = useMemo(() => {
    const groups: {
      recent: ElevenLabsVoiceSummary[];
      professional: ElevenLabsVoiceSummary[];
      others: ElevenLabsVoiceSummary[];
    } = {
      recent: [],
      professional: [],
      others: []
    };

    if (recentVoice) {
      groups.recent.push(recentVoice);
    }

    filteredVoices.forEach(voice => {
      if (recentVoice && voice.voice_id === recentVoice.voice_id) return;

      const category = voice.category || "premade";
      if (category === "cloned" || category === "professional" || voice.labels?.tier === "professional") {
        groups.professional.push(voice);
      } else {
        groups.others.push(voice);
      }
    });

    // Group Mapping
    const finalGroups: Record<string, ElevenLabsVoiceSummary[]> = {};
    if (groups.recent.length > 0) finalGroups["Recent"] = groups.recent;
    if (groups.professional.length > 0) finalGroups["DayGen Voices"] = groups.professional;
    if (groups.others.length > 0) finalGroups["Your Voices"] = groups.others;

    return finalGroups;
  }, [filteredVoices, recentVoice]);

  return (
    <div className={`flex flex-col w-full text-theme-text ${className}`}>
      {/* Search Input */}
      <div className="pb-3 px-1">
        <div className="relative group/search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-white/40 group-focus-within/search:text-theme-text transition-colors duration-200" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a voice..."
            className="w-full bg-theme-black/40 border border-theme-mid/50 rounded-xl pl-10 pr-4 py-2.5 text-sm text-theme-text placeholder-theme-white/40 focus:outline-none focus:border-theme-text/50 focus:bg-theme-black/60 transition-all duration-200 font-raleway"
            autoFocus
          />
        </div>
      </div>

      {/* Voice List */}
      <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[300px] pr-1 -mr-1 scrollbar-thin scrollbar-thumb-theme-mid/30 scrollbar-track-transparent hover:scrollbar-thumb-theme-mid/50 space-y-4">
        {isLoading && voices.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-theme-mid" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 text-red-400 text-sm font-raleway">
            {error}
          </div>
        ) : Object.keys(groupedVoices).length === 0 ? (
          <div className="flex items-center justify-center h-32 text-theme-white/50 text-sm font-raleway">
            No voices found
          </div>
        ) : (
          Object.entries(groupedVoices).map(([category, categoryVoices]) => (
            <div key={category} className="space-y-1">
              <div className="px-2 text-xs font-medium font-raleway text-theme-white/40 uppercase tracking-wider mb-2">
                {category}
              </div>
              <div className="space-y-0.5">
                {categoryVoices.map((voice) => (
                  <VoiceItem
                    key={`${category}-${voice.voice_id}`}
                    voice={voice}
                    isSelected={value === voice.voice_id}
                    onClick={() => onChange(voice.voice_id)}
                    onPlayPreview={(e) => handlePlayPreview(e, voice)}
                    isPlaying={playingVoiceId === voice.voice_id}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-3 mt-1 border-t border-theme-mid/30 flex flex-col gap-2">


        {/* Current Selection / Trigger (Visual only to match design) */}
        <div className="w-full py-2.5 px-4 rounded-xl border border-theme-mid/30 bg-theme-black/40 flex items-center justify-between text-sm font-raleway text-theme-white cursor-default">
          <span className="opacity-80">
            {voices.find(v => v.voice_id === value)?.name || "Select a voice"}
          </span>
          <div className="flex flex-col gap-0.5 opacity-50">
            {/* Chevron up/down icons mimicking a select trigger */}
            <ChevronRight className="w-3 h-3 -rotate-90" />
            <ChevronRight className="w-3 h-3 rotate-90" />
          </div>
        </div>
      </div>
    </div>
  );
};
