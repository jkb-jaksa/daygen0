import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Info } from 'lucide-react';
import { glass } from '../../styles/designSystem';

interface VideoPlayerProps {
    src: string;
    poster?: string;
    className?: string;
    autoPlay?: boolean;
    loop?: boolean;
    muted?: boolean;
    onInfoClick?: () => void;
    showInfoButton?: boolean;
    isInfoActive?: boolean;
    onExpand?: () => void;
    objectFit?: 'cover' | 'contain';
    layout?: 'fill' | 'intrinsic';
    onClick?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
    src,
    poster,
    className = '',
    autoPlay = false,
    loop = false,
    muted = false,
    onInfoClick,
    showInfoButton = false,
    isInfoActive = false,
    onExpand,
    layout = 'fill',
    onClick,
    objectFit = 'contain',
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const volumeSliderRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [progress, setProgress] = useState(0);
    const [isMuted, setIsMuted] = useState(muted);
    const [volume, setVolume] = useState(1);
    const [isDraggingVolume, setIsDraggingVolume] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showCenterControls, setShowCenterControls] = useState(false);
    const [showBottomControls, setShowBottomControls] = useState(false);
    const [duration, setDuration] = useState(0);
    const centerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const bottomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const resetCenterTimeout = useCallback((delay = 1000) => {
        setShowCenterControls(true);
        if (centerTimeoutRef.current) {
            clearTimeout(centerTimeoutRef.current);
        }
        centerTimeoutRef.current = setTimeout(() => {
            setShowCenterControls(false);
        }, delay);
    }, []);

    const resetBottomTimeout = useCallback((delay = 2000) => {
        setShowBottomControls(true);
        if (bottomTimeoutRef.current) {
            clearTimeout(bottomTimeoutRef.current);
        }
        bottomTimeoutRef.current = setTimeout(() => {
            setShowBottomControls(false);
        }, delay);
    }, []);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateProgress = () => {
            if (video.duration) {
                setProgress((video.currentTime / video.duration) * 100);
            }
        };

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            if (loop) {
                video.play();
                setIsPlaying(true);
            }
        };

        video.addEventListener('timeupdate', updateProgress);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('timeupdate', updateProgress);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('ended', handleEnded);
        };
    }, [loop]);

    const togglePlay = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
            resetCenterTimeout(1000);
            resetBottomTimeout(2000);
        }
    }, [isPlaying, resetCenterTimeout, resetBottomTimeout]);

    const toggleMute = useCallback((e?: React.SyntheticEvent) => {
        e?.stopPropagation();
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
            if (!isMuted) {
                setVolume(0);
            } else {
                setVolume(1);
                videoRef.current.volume = 1;
            }
        }
    }, [isMuted]);

    const handleVolumeChange = useCallback((e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
        if (!videoRef.current) return;

        // For mouse events, we need to find the slider element
        // If it's a direct click, currentTarget is the slider
        // If it's a drag, we need to use the ref (which we'll add)
        const sliderElement = volumeSliderRef.current;
        if (!sliderElement) return;

        const rect = sliderElement.getBoundingClientRect();
        const clientY = 'touches' in e ? (e as unknown as TouchEvent).touches[0].clientY : (e as MouseEvent | React.MouseEvent).clientY;

        // Calculate volume based on vertical position (bottom is 0, top is 1)
        const y = rect.bottom - clientY;
        const newVolume = Math.max(0, Math.min(1, y / rect.height));

        videoRef.current.volume = newVolume;
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
        videoRef.current.muted = newVolume === 0;
    }, []);

    const handleVolumeMouseDown = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDraggingVolume(true);
        handleVolumeChange(e as React.MouseEvent<HTMLDivElement>);
    }, [handleVolumeChange]);

    useEffect(() => {
        if (isDraggingVolume) {
            const handleMouseMove = (e: MouseEvent) => {
                e.preventDefault();
                handleVolumeChange(e);
            };

            const handleMouseUp = () => {
                setIsDraggingVolume(false);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDraggingVolume, handleVolumeChange]);

    const toggleFullscreen = useCallback(async (e?: React.SyntheticEvent) => {
        e?.stopPropagation();

        if (onExpand) {
            onExpand();
            return;
        }

        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            try {
                await containerRef.current.requestFullscreen();
                setIsFullscreen(true);
            } catch (err) {
                console.error('Error attempting to enable fullscreen:', err);
            }
        } else {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    }, [onExpand]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        // Only handle keys if the container is focused or we're in fullscreen
        // We don't want to capture keys if the user is typing elsewhere, but tabIndex on container should handle that

        switch (e.key) {
            case ' ':
            case 'k':
            case 'K':
                e.preventDefault();
                e.stopPropagation();
                togglePlay();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                e.stopPropagation();
                if (videoRef.current) {
                    videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
                }
                break;
            case 'ArrowRight':
                e.preventDefault();
                e.stopPropagation();
                if (videoRef.current) {
                    videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                e.stopPropagation();
                if (videoRef.current) {
                    const newVol = Math.min(1, volume + 0.1);
                    setVolume(newVol);
                    videoRef.current.volume = newVol;
                    setIsMuted(newVol === 0);
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                e.stopPropagation();
                if (videoRef.current) {
                    const newVol = Math.max(0, volume - 0.1);
                    setVolume(newVol);
                    videoRef.current.volume = newVol;
                    setIsMuted(newVol === 0);
                }
                break;
            case 'm':
            case 'M':
                e.preventDefault();
                e.stopPropagation();
                toggleMute();
                break;
            case 'f':
            case 'F':
                e.preventDefault();
                e.stopPropagation();
                toggleFullscreen();
                break;
        }
    }, [togglePlay, duration, volume, toggleMute, toggleFullscreen]);

    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (!videoRef.current || !duration) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        const newTime = (percentage / 100) * duration;

        videoRef.current.currentTime = newTime;
        setProgress(percentage);
    }, [duration]);

    const handleMouseMove = useCallback(() => {
        resetCenterTimeout(1000);
        resetBottomTimeout(2000);
    }, [resetCenterTimeout, resetBottomTimeout]);

    const handleMouseLeave = useCallback(() => {
        setShowCenterControls(false);
        setShowBottomControls(false);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const containerBaseClass = layout === 'intrinsic' ? 'relative inline-block group overflow-hidden bg-black' : 'relative group overflow-hidden bg-black';
    // Ensure video is always centered and contained to show full resolution without cropping
    // In fullscreen, we MUST force w-full h-full to fill the screen
    const videoBaseClass = isFullscreen
        ? 'w-full h-full object-contain'
        : (layout === 'intrinsic' ? `block max-w-full max-h-full object-${objectFit}` : `w-full h-full object-${objectFit}`);

    return (
        <div
            ref={containerRef}
            className={`${containerBaseClass} ${className} outline-none`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick || togglePlay}
            onDoubleClick={toggleFullscreen}
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                className={videoBaseClass}
                autoPlay={autoPlay}
                loop={loop}
                muted={muted}
                playsInline
            />

            {/* Center Pause Button (only when paused) */}
            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 z-10 ${!isPlaying && showCenterControls ? 'opacity-100' : 'opacity-0'} pointer-events-none`}>
                <button
                    onClick={togglePlay}
                    className={`w-16 h-16 rounded-full ${glass.promptDark} border border-white/20 flex items-center justify-center hover:scale-105 transition-transform duration-200 group/play pointer-events-auto`}
                >
                    <Pause className="w-6 h-6 text-n-white fill-n-white ml-1 transition-colors duration-200 group-hover/play:text-theme-text group-hover/play:fill-theme-text" />
                </button>
            </div>

            {/* Center Play Button (only when playing and controls shown) */}
            <div className={`absolute inset-0 flex items-center justify-center z-10 pointer-events-none transition-opacity duration-300 ${isPlaying && showCenterControls ? 'opacity-100' : 'opacity-0'}`}>
                <button
                    onClick={togglePlay}
                    className={`w-16 h-16 rounded-full ${glass.promptDark} border border-white/20 flex items-center justify-center hover:scale-105 transition-transform duration-200 group/play pointer-events-auto`}
                >
                    <Play className="w-6 h-6 text-n-white fill-n-white transition-colors duration-200 group-hover/play:text-theme-text group-hover/play:fill-theme-text" />
                </button>
            </div>

            {/* Controls Bar */}
            <div
                className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${layout === 'intrinsic' ? 'px-6 pb-4 pt-16' : 'px-3 pb-1 pt-12'
                    } ${showBottomControls ? 'opacity-100' : 'opacity-0'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Progress Bar */}
                <div
                    className={`relative h-1 bg-white/20 rounded-full ${layout === 'intrinsic' ? 'mb-4' : 'mb-2'} cursor-pointer group/progress`}
                    onClick={handleSeek}
                >
                    <div
                        className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-100"
                        style={{ width: `${progress}%` }}
                    />
                    <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-transform duration-200 hover:scale-125"
                        style={{ left: `${progress}%` }}
                    />
                </div>

                <div className={`flex items-center justify-between ${layout === 'intrinsic' ? 'gap-4' : 'gap-2'}`}>
                    <div className={`flex items-center ${layout === 'intrinsic' ? 'gap-4' : 'gap-2'}`}>
                        <button
                            onClick={togglePlay}
                            className="text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                        >
                            {isPlaying ? (
                                <Pause className={`${layout === 'intrinsic' ? 'w-5 h-5' : 'w-4 h-4'} fill-current`} />
                            ) : (
                                <Play className={`${layout === 'intrinsic' ? 'w-5 h-5' : 'w-4 h-4'} fill-current`} />
                            )}
                        </button>

                        <div className="flex items-center gap-2 group/volume relative">
                            <button
                                onClick={toggleMute}
                                className="text-white/70 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                            >
                                {isMuted || volume === 0 ? (
                                    <VolumeX className={layout === 'intrinsic' ? 'w-5 h-5' : 'w-4 h-4'} />
                                ) : (
                                    <Volume2 className={layout === 'intrinsic' ? 'w-5 h-5' : 'w-4 h-4'} />
                                )}
                            </button>

                            {/* Vertical Volume Slider Popup */}
                            <div
                                className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-8 h-0 opacity-0 group-hover/volume:h-24 group-hover/volume:opacity-100 ${isDraggingVolume ? 'h-24 opacity-100 pointer-events-auto' : ''} transition-all duration-300 ease-out flex flex-col justify-end items-center bg-black/60 backdrop-blur-md rounded-full border border-white/10 overflow-hidden`}
                            >
                                <div
                                    ref={volumeSliderRef}
                                    className="w-full h-24 flex flex-col items-center justify-center cursor-pointer py-4"
                                    onMouseDown={handleVolumeMouseDown}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="w-1 h-16 bg-white/20 rounded-full relative pointer-events-none">
                                        <div
                                            className="absolute bottom-0 left-0 w-full bg-white rounded-full"
                                            style={{ height: `${volume * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <span className="text-xs font-raleway text-white/70">
                            {videoRef.current ? formatTime(videoRef.current.currentTime) : '0:00'} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {showInfoButton && onInfoClick && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onInfoClick();
                                }}
                                className={`p-2 rounded-full transition-all duration-200 ${isInfoActive
                                    ? 'bg-white/20 text-white'
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                                    }`}
                                title="Show info"
                            >
                                <Info className={layout === 'intrinsic' ? 'w-5 h-5' : 'w-4 h-4'} />
                            </button>
                        )}

                        <button
                            onClick={toggleFullscreen}
                            className="text-white/90 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
                        >
                            {isFullscreen ? (
                                <Minimize className={layout === 'intrinsic' ? 'w-5 h-5' : 'w-4 h-4'} />
                            ) : (
                                <Maximize className={layout === 'intrinsic' ? 'w-5 h-5' : 'w-4 h-4'} />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
