import React, { useEffect, useMemo, useState } from "react";
import {
  fetchElevenLabsVoices,
  type ElevenLabsVoiceSummary,
} from "../../utils/audioApi";
import { inputs } from "../../styles/designSystem";

// Reusable component for selecting a voice
type VoiceSelectorProps = {
  value: string;
  onChange: (voiceId: string) => void;
  className?: string;
  recentVoice?: ElevenLabsVoiceSummary | null;
  onLoaded?: (voices: ElevenLabsVoiceSummary[]) => void;
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

  // If loading and no voices, show loading state
  if (isLoading && voices.length === 0) {
    return (
      <select
        className={`${inputs.base} ${className}`}
        disabled
        value=""
        onChange={() => { }}
      >
        <option value="">Loading voices...</option>
      </select>
    );
  }

  // If error and no voices, show error state
  if (error && voices.length === 0) {
    return (
      <select
        className={`${inputs.base} ${className} border-red-500/50 text-red-400`}
        disabled
        value=""
        onChange={() => { }}
      >
        <option value="">Error: {error}</option>
      </select>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputs.base} ${className}`}
      disabled={voices.length === 0}
    >
      <option value="" disabled>
        Select a voice
      </option>
      {Object.entries(groupedVoices).map(([category, categoryVoices]) => (
        <optgroup key={category} label={category.toUpperCase()}>
          {categoryVoices.map((voice) => (
            <option key={`${category}-${voice.voice_id}`} value={voice.voice_id}>
              {voice.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};
