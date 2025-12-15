import React, { useEffect, useMemo, useState, useRef } from "react";
import { inputs } from "../../styles/designSystem";
import { ChevronDown, Check, Music, Play, Square, Pause } from "lucide-react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";

// Define track type matching backend
type MusicTrack = {
    id: string;
    url: string;
    name: string;
    genre?: string;
};

type MusicSelectorProps = {
    value: string | null;
    onChange: (url: string) => void;
    musicStartTime?: number;
    onMusicStartTimeChange?: (time: number) => void;
    className?: string;
    defaultOpen?: boolean;
    customTracks?: MusicTrack[];
};

export const MusicSelector: React.FC<MusicSelectorProps> = ({
    value,
    onChange,
    musicStartTime = 0,
    onMusicStartTimeChange,
    className = "",
    defaultOpen = false,
    customTracks = []
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [playingUrl, setPlayingUrl] = useState<string | null>(null); // For dropdown preview
    const [tracks, setTracks] = useState<MusicTrack[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null); // For dropdown preview
    const containerRef = useRef<HTMLDivElement>(null);

    // Waveform refs
    const waveformContainerRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const [isWaveformPlaying, setIsWaveformPlaying] = useState(false);
    const [isWaveformReady, setIsWaveformReady] = useState(false);

    // Fetch tracks
    useEffect(() => {
        const fetchTracks = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/audio/tracks`);
                if (res.ok) {
                    const data = await res.json();
                    setTracks(data);
                } else {
                    console.error("Failed to fetch tracks");
                }
            } catch (err) {
                console.error("Error fetching tracks:", err);
            }
        };
        fetchTracks();
    }, []);

    const allTracks = useMemo(() => {
        return [...customTracks, ...tracks];
    }, [customTracks, tracks]);

    // Dropdown Preview Logic
    const togglePreview = (url: string) => {
        if (playingUrl === url) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            setPlayingUrl(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }

            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => setPlayingUrl(null);
            audio.volume = 0.5;

            audio.play().catch(console.error);
            setPlayingUrl(url);
        }
    };

    // Cleanup dropdown preview on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        };
    }, []);

    // WaveSurfer Logic (Main Visualization)
    useEffect(() => {
        if (!value || !waveformContainerRef.current) return;

        // Cleanup previous instance
        if (wavesurferRef.current) {
            wavesurferRef.current.destroy();
            wavesurferRef.current = null;
        }

        setIsWaveformReady(false);
        setIsWaveformPlaying(false);

        const ws = WaveSurfer.create({
            container: waveformContainerRef.current,
            waveColor: 'rgba(255, 255, 255, 0.2)',
            progressColor: 'rgba(0, 255, 255, 0.5)',
            cursorColor: '#00ffff',
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            height: 60,
            normalize: true,
            backend: 'WebAudio', // Necessary for smoother rendering
        });

        // Add Regions Plugin for "Start" handle
        const wsRegions = ws.registerPlugin(RegionsPlugin.create());

        ws.on('ready', () => {
            setIsWaveformReady(true);

            // Create the "Start" region marker
            wsRegions.addRegion({
                start: musicStartTime,
                end: musicStartTime, // 0 length = marker/line
                color: 'rgba(0, 255, 255, 0.5)',
                drag: true,
                resize: false,
                id: 'start-marker'
            });
        });

        ws.on('finish', () => {
            setIsWaveformPlaying(false);
        });

        wsRegions.on('region-updated', (region) => {
            if (region.id === 'start-marker') {
                // Ensure it stays a marker (start == end) if we wanted point selection
                // But regions usually have width. Let's try to keep it as a point or small region?
                // Actually, dragging a 0-width region might be hard.
                // Let's make it a draggable line (marker).
                // wavesurfer regions documentation says `resize: false` prevents resizing, so it stays fixed width.
                // If we initialize start=end, it's a line.
                onMusicStartTimeChange?.(region.start);
            }
        });

        ws.on('interaction', (newTime) => {
            // Move marker to newTime
            const regions = wsRegions.getRegions();
            const marker = regions.find(r => r.id === 'start-marker');
            if (marker) {
                marker.setOptions({ start: newTime, end: newTime });
                onMusicStartTimeChange?.(newTime);
            }
        });

        ws.load(value);
        wavesurferRef.current = ws;

        return () => {
            if (wavesurferRef.current) {
                wavesurferRef.current.destroy();
                wavesurferRef.current = null;
            }
        };
    }, [value]); // Re-init if music changes. detailed dep array omitted for simplicity but musicStartTime handled via ref/update?

    // Sync external musicStartTime changes (if any) to marker? 
    // Usually only needed if parent resets it.
    useEffect(() => {
        if (wavesurferRef.current && isWaveformReady) {
            // Check if marker exists and needs update
            // This can cause loops if not careful, but since onMusicStartTimeChange updates parent...
            // We can skip this if the change came from us. 
        }
    }, [musicStartTime, isWaveformReady]);

    const toggleWaveformPlay = () => {
        if (wavesurferRef.current && isWaveformReady) {
            if (isWaveformPlaying) {
                wavesurferRef.current.pause();
                setIsWaveformPlaying(false);
            } else {
                // Should we play from Start Time or current position?
                // Requirement: "Preview play should start from this handle."
                // So every time we hit play, we jump to mark?
                // Or only if we are at 0?
                // Let's jump to start time if we are not playing.
                wavesurferRef.current.play(musicStartTime);
                setIsWaveformPlaying(true);
            }
        }
    };

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const selectedPreset = useMemo(
        () => allTracks.find((p) => p.url === value),
        [value, allTracks]
    );

    const handleSelect = (url: string) => {
        onChange(url);
        onMusicStartTimeChange?.(0); // Reset start time on new track
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className={`relative flex flex-col gap-2 ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`${inputs.base} w-full flex items-center justify-between gap-2 px-3 focus:ring-2 focus:ring-theme-mid cursor-pointer text-left`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-2 truncate">
                    <Music className={`size-4 ${value ? "text-brand-cyan" : "text-theme-light"}`} />
                    <span className={`block truncate ${!selectedPreset ? "text-theme-white/60" : "text-theme-text"}`}>
                        {selectedPreset ? selectedPreset.name : "Select a Vibe"}
                    </span>
                </div>
                <ChevronDown
                    className={`size-4 text-theme-light transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {/* Waveform Visualization (Only if track selected) */}
            {value && selectedPreset && (
                <div className="w-full bg-theme-black/40 border border-theme-dark rounded-xl p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-theme-white/60 font-mono uppercase tracking-widest">
                            Start: {musicStartTime.toFixed(1)}s
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={toggleWaveformPlay}
                                disabled={!isWaveformReady}
                                className="flex items-center gap-1.5 px-2 py-1 bg-theme-mid/10 hover:bg-theme-mid/20 text-theme-mid rounded text-xs font-medium transition-colors disabled:opacity-50"
                            >
                                {isWaveformPlaying ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                                {isWaveformPlaying ? "Pause" : "Preview Start"}
                            </button>
                        </div>
                    </div>

                    <div className="relative w-full h-[60px] bg-theme-black/20 rounded-lg overflow-hidden group cursor-crosshair">
                        {!isWaveformReady && (
                            <div className="absolute inset-0 flex items-center justify-center bg-theme-black/40 z-10">
                                <div className="w-4 h-4 border-2 border-theme-mid border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                        <div ref={waveformContainerRef} className="w-full h-full" />
                        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[10px] bg-black/50 text-white px-2 py-1 rounded backdrop-blur-sm">
                                Click or Drag Line to Set Start
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {isOpen && (
                <div className="absolute top-full z-[60] mt-2 max-h-60 w-72 overflow-y-auto rounded-xl border border-theme-dark bg-theme-black/95 backdrop-blur-xl shadow-2xl custom-scrollbar left-0">
                    <div className="py-2 px-1">
                        <div
                            onClick={() => handleSelect('')}
                            className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-150 group cursor-pointer ${!value
                                ? "bg-theme-white/10 text-theme-text"
                                : "text-theme-white/80 hover:bg-theme-white/5 hover:text-theme-text"
                                }`}
                        >
                            <span className="truncate">Auto-detected (AI will pick)</span>
                            {!value && <Check className="ml-auto size-3.5 text-brand-cyan" />}
                        </div>

                        {customTracks.length > 0 && (
                            <>
                                <div className="px-3 py-1.5 text-[10px] font-bold text-theme-white/40 uppercase tracking-wider">
                                    Custom Uploads
                                </div>
                                {customTracks.map((preset) => {
                                    const isSelected = preset.url === value;
                                    return (
                                        <div
                                            key={preset.id}
                                            onClick={() => handleSelect(preset.url)}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150 group cursor-pointer ${isSelected
                                                ? "bg-theme-white/10 text-theme-text"
                                                : "text-theme-white/80 hover:bg-theme-white/5 hover:text-theme-text"
                                                }`}
                                        >
                                            <div className="flex flex-col overflow-hidden">
                                                <div className="flex items-center gap-2">
                                                    <span className="truncate font-medium">{preset.name}</span>
                                                    {isSelected && (
                                                        <Check className="size-3.5 text-brand-cyan flex-shrink-0" />
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-theme-white/40 truncate">{preset.genre}</span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    togglePreview(preset.url);
                                                }}
                                                className="p-1.5 rounded-full hover:bg-theme-white/20 text-theme-white/70 hover:text-theme-white transition-colors flex-shrink-0 z-10"
                                            >
                                                {playingUrl === preset.url ? (
                                                    <Square size={12} fill="currentColor" />
                                                ) : (
                                                    <Play size={12} fill="currentColor" />
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                                <div className="px-3 py-1.5 text-[10px] font-bold text-theme-white/40 uppercase tracking-wider mt-1">
                                    Library
                                </div>
                            </>
                        )}


                        {tracks.map((preset) => {
                            const isSelected = preset.url === value;
                            return (
                                <div
                                    key={preset.id}
                                    onClick={() => handleSelect(preset.url)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-150 group cursor-pointer ${isSelected
                                        ? "bg-theme-white/10 text-theme-text"
                                        : "text-theme-white/80 hover:bg-theme-white/5 hover:text-theme-text"
                                        }`}
                                >
                                    <div className="flex flex-col overflow-hidden">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate font-medium">{preset.name}</span>
                                            {isSelected && (
                                                <Check className="size-3.5 text-brand-cyan flex-shrink-0" />
                                            )}
                                        </div>
                                        <span className="text-[10px] text-theme-white/40 truncate">{preset.genre}</span>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            togglePreview(preset.url);
                                        }}
                                        className="p-1.5 rounded-full hover:bg-theme-white/20 text-theme-white/70 hover:text-theme-white transition-colors flex-shrink-0 z-10"
                                    >
                                        {playingUrl === preset.url ? (
                                            <Square size={12} fill="currentColor" />
                                        ) : (
                                            <Play size={12} fill="currentColor" />
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

        </div>
    );
};

