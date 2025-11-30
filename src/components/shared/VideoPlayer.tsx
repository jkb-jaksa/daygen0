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
    onInfoMouseEnter?: () => void;
    onInfoMouseLeave?: () => void;
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
    onInfoMouseEnter,
    onInfoMouseLeave,
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
    const [showBottomControls, setShowBottomControls] = useState(false);
    const [duration, setDuration] = useState(0);
    const [momentaryIcon, setMomentaryIcon] = useState<'play' | 'pause' | null>(null);
    const [hasInteracted, setHasInteracted] = useState(autoPlay);
    const [hasEnded, setHasEnded] = useState(false);
    const bottomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const momentaryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const resetBottomTimeout = useCallback((delay = 2000) => {
        setShowBottomControls(true);
        if (bottomTimeoutRef.current) {
            clearTimeout(bottomTimeoutRef.current);
        }
        // Only auto-hide if we are in fullscreen mode
        if (isFullscreen) {
            bottomTimeoutRef.current = setTimeout(() => {
                setShowBottomControls(false);
            }, delay);
        }
    }, [isFullscreen]);

    const animationFrameRef = useRef<number | null>(null);

    const updateProgress = useCallback(() => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            const duration = videoRef.current.duration;
            if (duration) {
                setProgress((current / duration) * 100);
            }
        }
        animationFrameRef.current = requestAnimationFrame(updateProgress);
    }, []);

    useEffect(() => {
        if (isPlaying) {
            updateProgress();
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying, updateProgress]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            if (loop) {
                video.play();
                setIsPlaying(true);
            } else {
                setHasEnded(true);
            }
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('ended', handleEnded);
        };
    }, [loop]);

    const togglePlay = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        const wasInitial = !hasInteracted;
        setHasInteracted(true);
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                setMomentaryIcon('pause');
                // Pause icon stays until play is resumed
            } else {
                videoRef.current.play();
                setMomentaryIcon('play');
                setHasEnded(false);
            }
            setIsPlaying(!isPlaying);
            // If not fullscreen, we don't want to auto-hide controls on play/pause interaction if mouse is over
            // But resetBottomTimeout now handles the isFullscreen check
            resetBottomTimeout(2000);

            // Clear momentary icon after animation for play only
            if (momentaryTimeoutRef.current) {
                clearTimeout(momentaryTimeoutRef.current);
            }
            if (!isPlaying) {
                // just started playing, schedule clearing of play icon
                momentaryTimeoutRef.current = setTimeout(() => {
                    setMomentaryIcon(null);
                }, (wasInitial || hasEnded) ? 100 : 700);
            }
        }
    }, [isPlaying, resetBottomTimeout, hasInteracted, hasEnded]);

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

    const [hoverProgress, setHoverProgress] = useState<number | null>(null);

    const handleProgressBarMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setHoverProgress(percentage);
    }, []);

    const handleProgressBarMouseLeave = useCallback(() => {
        setHoverProgress(null);
    }, []);

    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (!videoRef.current || !duration) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        const newTime = (percentage / 100) * duration;

        videoRef.current.currentTime = newTime;
        setProgress(percentage);
        setHasEnded(false);
    }, [duration]);

    const handleMouseMove = useCallback(() => {
        if (isFullscreen) {
            resetBottomTimeout(2000);
        } else {
            // In non-fullscreen, just ensure controls are visible and clear any existing timeout
            setShowBottomControls(true);
            if (bottomTimeoutRef.current) {
                clearTimeout(bottomTimeoutRef.current);
                bottomTimeoutRef.current = null;
            }
        }
    }, [resetBottomTimeout, isFullscreen]);

    const handleMouseLeave = useCallback(() => {
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

    // Determine which icon to show in the center
    let CenterIcon = null;
    if (momentaryIcon === 'play') {
        CenterIcon = Play;
    } else if (momentaryIcon === 'pause') {
        CenterIcon = Pause;
    } else if ((!isPlaying && !hasInteracted) || hasEnded) {
        CenterIcon = Play;
    }

    // Determine if center controls should be visible
    const isCenterVisible = (momentaryIcon === 'play') ||
        (momentaryIcon === 'pause' && showBottomControls) ||
        (!isPlaying && !hasInteracted) ||
        hasEnded;

    return (
        <div
            ref={containerRef}
            className={`${containerBaseClass} ${className} outline-none`}
            onMouseEnter={() => {
                setShowBottomControls(true);
                if (bottomTimeoutRef.current) {
                    clearTimeout(bottomTimeoutRef.current);
                    bottomTimeoutRef.current = null;
                }
            }}
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

            {/* Unified Center Button */}
            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 z-20 ${isCenterVisible ? 'opacity-100' : 'opacity-0'} pointer-events-none`}>
                <button
                    onClick={togglePlay}
                    className={`w-16 h-16 rounded-full ${glass.promptDark} border border-[rgb(var(--theme-dark-rgb)/0.10)] flex items-center justify-center parallax-large hover:scale-105 transition-all duration-200 group/playbutton pointer-events-auto outline-none`}
                >
                    {CenterIcon && (
                        <CenterIcon className={`w-6 h-6 text-theme-white fill-theme-white transition-colors duration-200 group-hover/playbutton:text-theme-text group-hover/playbutton:fill-theme-text ${CenterIcon === Play ? 'ml-1' : ''}`} />
                    )}
                </button>
            </div>

            {/* Controls Bar */}
            <div
                className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-200 ${layout === 'intrinsic' ? 'px-6 pb-4 pt-16' : 'px-3 pb-2 pt-12'
                    } ${showBottomControls ? 'opacity-100' : 'opacity-0'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Progress Bar */}
                <div
                    className={`relative w-full h-1.5 ${layout === 'intrinsic' ? 'mb-4' : 'mb-2'} cursor-pointer group/progress-wrapper`}
                    onClick={handleSeek}
                    onMouseMove={handleProgressBarMouseMove}
                    onMouseLeave={handleProgressBarMouseLeave}
                >
                    <div
                        className={`absolute bottom-0 left-0 right-0 h-full group-hover/progress-wrapper:h-2 transition-all duration-200 ease-out ${glass.promptBorderless} rounded-full !overflow-visible`}
                        style={{
                            '--glass-prompt-bg': 'rgb(var(--n-mid-rgb) / 0.80)',
                            '--glass-prompt-text': 'var(--n-text)'
                        } as React.CSSProperties}
                    >
                        {/* Hover Highlight Bar */}
                        {hoverProgress !== null && (
                            <div
                                className="absolute top-0 left-0 h-full bg-white/20 rounded-full pointer-events-none"
                                style={{ width: `${hoverProgress}%` }}
                            />
                        )}
                        <div
                            className="absolute top-0 left-0 h-full bg-white/80 rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                        <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-sm ring-1 ring-black/10 z-10 group-hover/progress-wrapper:scale-125"
                            style={{
                                left: `${progress}%`
                            }}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between gap-0.5">
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={togglePlay}
                            className="image-action-btn image-action-btn--fullsize parallax-large outline-none shrink-0"
                        >
                            {isPlaying ? (
                                <Pause className="w-5 h-5 fill-current" />
                            ) : (
                                <Play className="w-5 h-5 fill-current" />
                            )}
                        </button>

                        <div className="flex items-center gap-2 group/volume relative">
                            <button
                                onClick={toggleMute}
                                className="image-action-btn image-action-btn--fullsize parallax-large outline-none shrink-0"
                            >
                                {isMuted || volume === 0 ? (
                                    <VolumeX className="w-5 h-5" />
                                ) : (
                                    <Volume2 className="w-5 h-5" />
                                )}
                            </button>

                            {/* Vertical Volume Slider Popup */}
                            <div
                                className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-8 h-0 opacity-0 group-hover/volume:h-24 group-hover/volume:opacity-100 ${isDraggingVolume ? 'h-24 opacity-100 pointer-events-auto' : ''} transition-all duration-300 ease-out flex flex-col justify-end items-center ${glass.promptDark} rounded-full overflow-hidden`}
                            >
                                <div
                                    ref={volumeSliderRef}
                                    className="w-full h-24 flex flex-col items-center justify-center cursor-pointer py-4"
                                    onMouseDown={handleVolumeMouseDown}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="w-1 h-16 bg-theme-text/20 rounded-full relative pointer-events-none">
                                        <div
                                            className="absolute bottom-0 left-0 w-full bg-theme-text rounded-full"
                                            style={{ height: `${volume * 100}%` }}
                                        />
                                        <div
                                            className="absolute left-1/2 w-3 h-3 bg-theme-text rounded-full shadow-sm"
                                            style={{
                                                bottom: `${volume * 100}%`,
                                                transform: 'translate(-50%, 50%)'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <span className="inline-flex items-center justify-center h-[28px] px-3 rounded-full border border-[rgb(var(--theme-dark-rgb)/0.10)] bg-[var(--glass-dark-bg)] backdrop-blur-[32px] text-xs font-raleway font-medium text-[var(--theme-white)] parallax-large leading-none shrink-0">
                            {videoRef.current ? formatTime(videoRef.current.currentTime) : '0:00'} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className="flex items-center gap-0.5">
                        {showInfoButton && onInfoClick && !isFullscreen && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onInfoClick();
                                }}
                                onMouseEnter={onInfoMouseEnter}
                                onMouseLeave={onInfoMouseLeave}
                                className={`image-action-btn image-action-btn--fullsize parallax-large outline-none shrink-0 ${isInfoActive
                                    ? 'border-theme-text text-theme-text'
                                    : ''
                                    }`}
                            >
                                <Info className="w-5 h-5" />
                            </button>
                        )}

                        <button
                            onClick={toggleFullscreen}
                            className="image-action-btn image-action-btn--fullsize parallax-large outline-none shrink-0"
                        >
                            {isFullscreen ? (
                                <Minimize className="w-5 h-5" />
                            ) : (
                                <Maximize className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
};
