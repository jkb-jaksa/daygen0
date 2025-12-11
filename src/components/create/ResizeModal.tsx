import React, { memo, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { X, Scaling, Image as ImageIcon, Move, AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, RotateCcw, Sparkles, Crop } from 'lucide-react';
import { buttons, glass } from '../../styles/designSystem';
import { scrollLockExemptAttr, useGlobalScrollLock } from '../../hooks/useGlobalScrollLock';
import { GEMINI_ASPECT_RATIO_OPTIONS } from '../../data/aspectRatios';
import type { GeminiAspectRatio } from '../../types/aspectRatio';
import type { GalleryImageLike } from './types';

// Mode type for the modal
type ModalMode = 'resize' | 'crop';

interface ResizeModalProps {
    open: boolean;
    onClose: () => void;
    image: GalleryImageLike | null;
    onResize?: (aspectRatio: GeminiAspectRatio, position: { x: number; y: number }, scale: number, userPrompt: string) => void;
    onCrop?: (cropArea: { x: number; y: number; width: number; height: number }) => void;
}

// Helper to parse aspect ratio string to numeric value
const parseAspectRatio = (ratio: string): number => {
    const [w, h] = ratio.split(':').map(Number);
    return w / h;
};

// Checkerboard pattern CSS
const checkerboardStyle = {
    backgroundImage: `
        linear-gradient(45deg, #3a3a3a 25%, transparent 25%),
        linear-gradient(-45deg, #3a3a3a 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #3a3a3a 75%),
        linear-gradient(-45deg, transparent 75%, #3a3a3a 75%)
    `,
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
    backgroundColor: '#2a2a2a',
};

const ResizeModal = memo<ResizeModalProps>(({
    open,
    onClose,
    image,
    onResize,
    onCrop,
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const [mode, setMode] = useState<ModalMode>('resize');
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<GeminiAspectRatio | null>(null);
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
    const [imagePosition, setImagePosition] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
    const [imageScale, setImageScale] = useState<number>(100);
    const [isDragging, setIsDragging] = useState(false);
    const [userPrompt, setUserPrompt] = useState('');
    // Crop mode state
    const [cropArea, setCropArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [cropScale, setCropScale] = useState(100); // 100 = full size, < 100 = shrink (creates AI fill areas)
    const [cropPrompt, setCropPrompt] = useState(''); // Extension hint for AI fill
    const dragStartRef = useRef<{ x: number; y: number; startPos: { x: number; y: number } } | null>(null);

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

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            setMode('resize');
            setSelectedAspectRatio(null);
            setImageDimensions(null);
            setImagePosition({ x: 50, y: 50 });
            setImageScale(100);
            setUserPrompt('');
            setCropArea(null);
            setCropScale(100);
            setCropPrompt('');
        }
    }, [open]);

    // Load image dimensions when image changes
    useEffect(() => {
        if (image?.url && open) {
            const img = new Image();
            img.onload = () => {
                setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.src = image.url;
        }
    }, [image?.url, open]);

    // Calculate base layout based on aspect ratios (before scale)
    const baseLayoutInfo = useMemo(() => {
        if (!imageDimensions || !selectedAspectRatio) {
            return null;
        }
        const originalRatio = imageDimensions.width / imageDimensions.height;
        const targetRatio = parseAspectRatio(selectedAspectRatio);

        if (Math.abs(originalRatio - targetRatio) < 0.01) {
            return { type: 'same' as const, originalRatio, targetRatio };
        }

        if (targetRatio > originalRatio) {
            const baseWidthPercent = (originalRatio / targetRatio) * 100;
            return {
                type: 'horizontal' as const,
                originalRatio,
                targetRatio,
                baseWidthPercent,
                baseHeightPercent: 100,
            };
        } else {
            const baseHeightPercent = (targetRatio / originalRatio) * 100;
            return {
                type: 'vertical' as const,
                originalRatio,
                targetRatio,
                baseWidthPercent: 100,
                baseHeightPercent,
            };
        }
    }, [imageDimensions, selectedAspectRatio]);

    // Calculate actual layout with scale applied
    const layoutInfo = useMemo(() => {
        if (!baseLayoutInfo || baseLayoutInfo.type === 'same') {
            return baseLayoutInfo;
        }
        const scaleFactor = imageScale / 100;
        const imageWidthPercent = baseLayoutInfo.baseWidthPercent * scaleFactor;
        const imageHeightPercent = baseLayoutInfo.baseHeightPercent * scaleFactor;

        return {
            ...baseLayoutInfo,
            imageWidthPercent,
            imageHeightPercent,
            // Always allow movement on both axes for complete positioning flexibility
            // This lets users position the image anywhere, even if it means extending beyond the canvas
            canMoveX: true,
            canMoveY: true,
        };
    }, [baseLayoutInfo, imageScale]);

    const minScale = 20;

    // Handle mouse/touch drag
    const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!layoutInfo || layoutInfo.type === 'same') return;
        e.preventDefault();
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        dragStartRef.current = {
            x: clientX,
            y: clientY,
            startPos: { ...imagePosition },
        };
    }, [layoutInfo, imagePosition]);

    const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
        if (!isDragging || !dragStartRef.current || !canvasRef.current || !layoutInfo || layoutInfo.type === 'same') return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const rect = canvasRef.current.getBoundingClientRect();
        const startData = dragStartRef.current;
        const deltaX = ((clientX - startData.x) / rect.width) * 100;
        const deltaY = ((clientY - startData.y) / rect.height) * 100;

        let newX = startData.startPos.x;
        let newY = startData.startPos.y;

        if (layoutInfo.canMoveX) {
            // Allow image center to be positioned anywhere from 0% to 100%
            // This allows blank space on any side for flexible positioning
            newX = Math.max(0, Math.min(100, startData.startPos.x + deltaX));
        }
        if (layoutInfo.canMoveY) {
            // Allow image center to be positioned anywhere from 0% to 100%
            // This allows blank space on any side for flexible positioning
            newY = Math.max(0, Math.min(100, startData.startPos.y + deltaY));
        }
        setImagePosition({ x: newX, y: newY });
    }, [isDragging, layoutInfo]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        dragStartRef.current = null;
    }, []);

    // Handle scroll wheel / pinch zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (!layoutInfo || layoutInfo.type === 'same') return;
        e.preventDefault();
        const delta = -e.deltaY * 0.1;
        setImageScale(prev => {
            const newScale = Math.max(minScale, Math.min(200, prev + delta));
            return Math.round(newScale);
        });
    }, [layoutInfo, minScale]);

    // Global mouse/touch listeners for dragging
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleDragMove);
            window.addEventListener('touchend', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
            window.removeEventListener('touchmove', handleDragMove);
            window.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging, handleDragMove, handleDragEnd]);

    // Constrain position when scale changes (keep within 0-100% bounds)
    useEffect(() => {
        if (!layoutInfo || layoutInfo.type === 'same') return;
        setImagePosition(prev => {
            let { x, y } = prev;
            if (layoutInfo.canMoveX) {
                // Allow full 0-100% range for flexible positioning
                x = Math.max(0, Math.min(100, x));
            } else {
                x = 50;
            }
            if (layoutInfo.canMoveY) {
                // Allow full 0-100% range for flexible positioning
                y = Math.max(0, Math.min(100, y));
            } else {
                y = 50;
            }
            return { x, y };
        });
    }, [layoutInfo]);

    // Position presets
    const setPositionPreset = useCallback((preset: 'center' | 'top' | 'bottom' | 'left' | 'right') => {
        if (!layoutInfo || layoutInfo.type === 'same') return;
        switch (preset) {
            case 'center':
                setImagePosition({ x: 50, y: 50 });
                break;
            case 'top':
                if (layoutInfo.canMoveY) {
                    // Position at very top (0%), showing blank space at bottom
                    setImagePosition(prev => ({ ...prev, y: 0 }));
                }
                break;
            case 'bottom':
                if (layoutInfo.canMoveY) {
                    // Position at very bottom (100%), showing blank space at top
                    setImagePosition(prev => ({ ...prev, y: 100 }));
                }
                break;
            case 'left':
                if (layoutInfo.canMoveX) {
                    // Position at very left (0%), showing blank space at right
                    setImagePosition(prev => ({ ...prev, x: 0 }));
                }
                break;
            case 'right':
                if (layoutInfo.canMoveX) {
                    // Position at very right (100%), showing blank space at left
                    setImagePosition(prev => ({ ...prev, x: 100 }));
                }
                break;
        }
    }, [layoutInfo]);

    // Handle apply
    const handleApply = useCallback(() => {
        if (onResize && selectedAspectRatio) {
            onResize(selectedAspectRatio, imagePosition, imageScale, userPrompt);
            onClose();
        }
    }, [onResize, selectedAspectRatio, imagePosition, imageScale, userPrompt, onClose]);

    // Reset scale and position
    const handleReset = useCallback(() => {
        setImageScale(100);
        setImagePosition({ x: 50, y: 50 });
    }, []);

    useGlobalScrollLock(open);

    if (!open || !image) return null;

    // Render the interactive canvas preview
    const renderCanvas = () => {
        if (!image.url) {
            return (
                <div className="flex flex-col items-center gap-2 text-theme-mid">
                    <ImageIcon className="w-12 h-12 opacity-50" />
                    <span className="text-sm">No image selected</span>
                </div>
            );
        }

        // Crop mode - with optional AI fill when image is shrunk
        if (mode === 'crop') {
            // cropArea represents the visible crop frame as percentage of image (0-100)
            // If not set, default to 100% (full image)
            const crop = cropArea || { x: 0, y: 0, width: 100, height: 100 };
            const needsAiFill = cropScale < 100;

            // Calculate container dimensions based on image aspect ratio (stable, doesn't change with scale)
            const maxW = 500;
            const maxH = 320;
            let containerW = maxW;
            let containerH = maxH;

            if (imageDimensions) {
                const imgRatio = imageDimensions.width / imageDimensions.height;
                if (imgRatio > 1) {
                    containerW = maxW;
                    containerH = maxW / imgRatio;
                    if (containerH > maxH) {
                        containerH = maxH;
                        containerW = maxH * imgRatio;
                    }
                } else if (imgRatio < 1) {
                    containerH = maxH;
                    containerW = maxH * imgRatio;
                } else {
                    containerW = Math.min(maxW, maxH);
                    containerH = containerW;
                }
            }

            return (
                <div className="flex flex-col items-center gap-2 w-full">
                    {/* Canvas container - fixed size based on image AR */}
                    <div
                        ref={canvasRef}
                        className="relative rounded-xl overflow-hidden shadow-2xl border-2 border-theme-text flex-shrink-0"
                        style={{
                            width: `${containerW}px`,
                            height: `${containerH}px`,
                            minWidth: `${containerW}px`,
                            minHeight: `${containerH}px`,
                            maxWidth: `${containerW}px`,
                            maxHeight: `${containerH}px`,
                            boxSizing: 'border-box',
                            // Always show a background - checkerboard when shrinking, solid when not
                            backgroundColor: '#1a1a2e',
                            ...(needsAiFill ? checkerboardStyle : {})
                        }}
                    >
                        {/* Image with scale transform - always applied */}
                        <img
                            src={image.url}
                            alt="To crop"
                            className="absolute top-1/2 left-1/2 object-cover"
                            style={{
                                width: '100%',
                                height: '100%',
                                transform: `translate(-50%, -50%) scale(${cropScale / 100})`,
                                transition: 'transform 0.15s ease-out',
                            }}
                            draggable={false}
                        />

                        {/* When 100% scale, show crop frame overlay */}
                        {cropScale === 100 && (
                            <div
                                className="absolute border-2 border-theme-text cursor-move"
                                style={{
                                    left: `${crop.x}%`,
                                    top: `${crop.y}%`,
                                    width: `${crop.width}%`,
                                    height: `${crop.height}%`,
                                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    if (!canvasRef.current) return;

                                    const rect = canvasRef.current.getBoundingClientRect();
                                    const startMouseX = e.clientX;
                                    const startMouseY = e.clientY;
                                    const startX = crop.x;
                                    const startY = crop.y;

                                    const handleMove = (moveEvent: MouseEvent) => {
                                        const deltaX = ((moveEvent.clientX - startMouseX) / rect.width) * 100;
                                        const deltaY = ((moveEvent.clientY - startMouseY) / rect.height) * 100;

                                        const newX = Math.max(0, Math.min(100 - crop.width, startX + deltaX));
                                        const newY = Math.max(0, Math.min(100 - crop.height, startY + deltaY));

                                        setCropArea({ ...crop, x: newX, y: newY });
                                    };

                                    const handleUp = () => {
                                        window.removeEventListener('mousemove', handleMove);
                                        window.removeEventListener('mouseup', handleUp);
                                    };

                                    window.addEventListener('mousemove', handleMove);
                                    window.addEventListener('mouseup', handleUp);
                                }}
                            >
                                {/* Corner handle */}
                                <div
                                    className="absolute -bottom-2 -right-2 w-5 h-5 bg-theme-text rounded-full cursor-se-resize hover:scale-110 transition-transform z-10"
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        if (!canvasRef.current || !imageDimensions) return;

                                        const rect = canvasRef.current.getBoundingClientRect();
                                        const startWidth = crop.width;
                                        const startMouseX = e.clientX;
                                        const cropCenterX = crop.x + crop.width / 2;
                                        const cropCenterY = crop.y + crop.height / 2;

                                        const handleMove = (moveEvent: MouseEvent) => {
                                            const deltaX = ((moveEvent.clientX - startMouseX) / rect.width) * 100;
                                            let newWidth = Math.max(20, Math.min(100, startWidth + deltaX));
                                            // Since container already matches image aspect ratio,
                                            // using equal percentages for width and height maintains the ratio
                                            let newHeight = newWidth;

                                            // Clamp to container bounds
                                            if (newWidth > 100) {
                                                newWidth = 100;
                                                newHeight = 100;
                                            }

                                            let newX = cropCenterX - newWidth / 2;
                                            let newY = cropCenterY - newHeight / 2;
                                            newX = Math.max(0, Math.min(100 - newWidth, newX));
                                            newY = Math.max(0, Math.min(100 - newHeight, newY));

                                            setCropArea({ x: newX, y: newY, width: newWidth, height: newHeight });
                                        };

                                        const handleUp = () => {
                                            window.removeEventListener('mousemove', handleMove);
                                            window.removeEventListener('mouseup', handleUp);
                                        };

                                        window.addEventListener('mousemove', handleMove);
                                        window.addEventListener('mouseup', handleUp);
                                    }}
                                />

                                {/* Grid lines */}
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute left-1/3 top-0 bottom-0 w-px bg-theme-white/30" />
                                    <div className="absolute left-2/3 top-0 bottom-0 w-px bg-theme-white/30" />
                                    <div className="absolute top-1/3 left-0 right-0 h-px bg-theme-white/30" />
                                    <div className="absolute top-2/3 left-0 right-0 h-px bg-theme-white/30" />
                                </div>
                            </div>
                        )}

                        {/* When shrunk, show dashed border */}
                        {needsAiFill && (
                            <div className="absolute inset-0 border-2 border-dashed border-theme-text/50 pointer-events-none" />
                        )}
                    </div>

                    {/* Scale slider - matching resize mode style */}
                    <div className="w-full max-w-[500px] flex items-center gap-3 px-2 flex-shrink-0">
                        <ZoomOut className="w-4 h-4 text-theme-white flex-shrink-0" />
                        <input
                            type="range"
                            min={20}
                            max={300}
                            value={cropScale}
                            onChange={(e) => {
                                setCropScale(Number(e.target.value));
                                if (Number(e.target.value) < 100) {
                                    setCropArea(null);
                                }
                            }}
                            className="flex-1 h-2 bg-theme-dark rounded-lg appearance-none cursor-pointer accent-theme-text"
                        />
                        <ZoomIn className="w-4 h-4 text-theme-white flex-shrink-0" />
                        <span className="text-xs font-raleway text-theme-white w-12 text-right">{cropScale}%</span>
                        {/* Reset button - always takes space, invisible when at 100% */}
                        <button
                            type="button"
                            onClick={() => {
                                setCropScale(100);
                                setCropArea(null);
                                setCropPrompt('');
                            }}
                            className={`p-1.5 rounded-lg border border-theme-dark hover:border-theme-mid bg-theme-black/50 hover:bg-theme-black transition-all ${cropScale !== 100 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                            title="Reset"
                        >
                            <RotateCcw className="w-4 h-4 text-theme-white" />
                        </button>
                    </div>

                    {/* Controls container - fixed height to prevent layout shift */}
                    <div className="w-full max-w-[500px] flex flex-col gap-2" style={{ minHeight: '100px' }}>
                        {/* Background hint when shrinking */}
                        {cropScale < 100 && (
                            <textarea
                                value={cropPrompt}
                                onChange={(e) => setCropPrompt(e.target.value)}
                                placeholder="Background hint (optional)"
                                className="w-full h-12 bg-theme-black/40 text-theme-white placeholder-theme-white/40 border border-theme-dark rounded-lg px-3 py-2 focus:outline-none focus:border-theme-mid transition-colors duration-200 font-raleway text-sm resize-none"
                            />
                        )}

                        {/* Submit button - always same height */}
                        {cropScale < 100 ? (
                            <button
                                type="button"
                                onClick={() => {
                                    if (onResize && imageDimensions) {
                                        const ratio = imageDimensions.width / imageDimensions.height;
                                        const ratioStr = ratio >= 1.7 ? '16:9' : ratio >= 1.4 ? '3:2' : ratio >= 1.2 ? '4:3' : ratio <= 0.6 ? '9:16' : ratio <= 0.7 ? '2:3' : ratio <= 0.8 ? '3:4' : '1:1';
                                        onResize(
                                            ratioStr as GeminiAspectRatio,
                                            { x: 50, y: 50 },
                                            cropScale,
                                            cropPrompt
                                        );
                                        onClose();
                                    }
                                }}
                                className={`${buttons.primary} w-full py-3 flex items-center justify-center gap-2 text-base`}
                            >
                                <Sparkles className="w-5 h-5" />
                                Generate Background
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    const crop = cropArea || { x: 0, y: 0, width: 100, height: 100 };
                                    if (onCrop) {
                                        onCrop(crop);
                                        onClose();
                                    }
                                }}
                                disabled={!cropArea || cropArea.width >= 100}
                                className={`${buttons.primary} w-full py-3 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 text-base`}
                            >
                                <Crop className="w-5 h-5" />
                                Crop Image
                            </button>
                        )}
                    </div>
                </div>
            );
        }

        // Resize mode - original logic
        if (!selectedAspectRatio || !layoutInfo || layoutInfo.type === 'same') {
            return (
                <div className="relative">
                    <img
                        src={image.url}
                        alt="Original"
                        className="max-w-full max-h-[300px] object-contain rounded-lg shadow-lg"
                    />
                    <div className="absolute top-2 left-2 bg-theme-black/80 backdrop-blur-sm px-2 py-1 rounded-md border border-theme-dark text-xs font-raleway text-theme-white">
                        Original
                    </div>
                </div>
            );
        }

        // Calculate image position within canvas
        const imageStyle: React.CSSProperties = {
            position: 'absolute',
            width: `${layoutInfo.imageWidthPercent}%`,
            height: `${layoutInfo.imageHeightPercent}%`,
            left: `${imagePosition.x - layoutInfo.imageWidthPercent / 2}%`,
            top: `${imagePosition.y - layoutInfo.imageHeightPercent / 2}%`,
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            transition: isDragging ? 'none' : 'all 0.2s ease',
        };

        const canMoveAnywhere = layoutInfo.canMoveX || layoutInfo.canMoveY;

        // Determine max dimensions based on aspect ratio
        const targetRatio = parseAspectRatio(selectedAspectRatio);
        const isWide = targetRatio > 1;
        const maxWidth = isWide ? 500 : 280 * targetRatio;
        const maxHeight = isWide ? 500 / targetRatio : 280;

        return (
            <div className="flex flex-col items-center gap-2 w-full overflow-y-auto max-h-full">
                {/* Canvas container */}
                <div
                    ref={canvasRef}
                    className="relative rounded-xl overflow-hidden shadow-2xl border-2 border-theme-text flex-shrink-0"
                    style={{
                        aspectRatio: selectedAspectRatio.replace(':', '/'),
                        width: `${maxWidth}px`,
                        maxWidth: '100%',
                        maxHeight: `${maxHeight}px`,
                        ...checkerboardStyle
                    }}
                    onWheel={handleWheel}
                >
                    {/* Draggable image */}
                    <div
                        style={imageStyle}
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                        className="rounded-lg overflow-hidden shadow-lg ring-2 ring-theme-text/50"
                    >
                        <img
                            src={image.url}
                            alt="Original"
                            className="w-full h-full object-cover pointer-events-none"
                            draggable={false}
                        />
                        {canMoveAnywhere && (
                            <div className="absolute top-2 left-2 bg-theme-black/80 backdrop-blur-sm px-2 py-1 rounded-md border border-theme-dark text-xs font-raleway text-theme-white flex items-center gap-1">
                                <Move className="w-3 h-3" />
                                Drag to position
                            </div>
                        )}
                    </div>
                </div>

                {/* Scale slider */}
                <div className="w-full max-w-[500px] flex items-center gap-3 px-2 flex-shrink-0">
                    <ZoomOut className="w-4 h-4 text-theme-white flex-shrink-0" />
                    <input
                        type="range"
                        min={minScale}
                        max={200}
                        value={imageScale}
                        onChange={(e) => setImageScale(Number(e.target.value))}
                        className="flex-1 h-2 bg-theme-dark rounded-lg appearance-none cursor-pointer accent-theme-text"
                    />
                    <ZoomIn className="w-4 h-4 text-theme-white flex-shrink-0" />
                    <span className="text-xs font-raleway text-theme-white w-12 text-right">{imageScale}%</span>
                    <button
                        type="button"
                        onClick={handleReset}
                        className="p-1.5 rounded-lg border border-theme-dark hover:border-theme-mid bg-theme-black/50 hover:bg-theme-black transition-colors"
                        title="Reset"
                    >
                        <RotateCcw className="w-4 h-4 text-theme-white" />
                    </button>
                </div>

                {/* Position controls - only show when image can be moved */}
                {canMoveAnywhere && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-raleway text-theme-white uppercase tracking-wider">Quick position:</span>
                        <div className="flex items-center gap-1">
                            {layoutInfo.canMoveX && (
                                <button
                                    type="button"
                                    onClick={() => setPositionPreset('left')}
                                    className="p-1.5 rounded-lg border border-theme-dark hover:border-theme-mid bg-theme-black/50 hover:bg-theme-black transition-colors"
                                    title="Align left"
                                >
                                    <ArrowLeft className="w-4 h-4 text-theme-white" />
                                </button>
                            )}
                            {layoutInfo.canMoveY && (
                                <button
                                    type="button"
                                    onClick={() => setPositionPreset('top')}
                                    className="p-1.5 rounded-lg border border-theme-dark hover:border-theme-mid bg-theme-black/50 hover:bg-theme-black transition-colors"
                                    title="Align top"
                                >
                                    <ArrowUp className="w-4 h-4 text-theme-white" />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setPositionPreset('center')}
                                className="p-1.5 rounded-lg border border-theme-dark hover:border-theme-mid bg-theme-black/50 hover:bg-theme-black transition-colors"
                                title="Center"
                            >
                                {layoutInfo.canMoveX && !layoutInfo.canMoveY ? (
                                    <AlignHorizontalJustifyCenter className="w-4 h-4 text-theme-white" />
                                ) : (
                                    <AlignVerticalJustifyCenter className="w-4 h-4 text-theme-white" />
                                )}
                            </button>
                            {layoutInfo.canMoveY && (
                                <button
                                    type="button"
                                    onClick={() => setPositionPreset('bottom')}
                                    className="p-1.5 rounded-lg border border-theme-dark hover:border-theme-mid bg-theme-black/50 hover:bg-theme-black transition-colors"
                                    title="Align bottom"
                                >
                                    <ArrowDown className="w-4 h-4 text-theme-white" />
                                </button>
                            )}
                            {layoutInfo.canMoveX && (
                                <button
                                    type="button"
                                    onClick={() => setPositionPreset('right')}
                                    className="p-1.5 rounded-lg border border-theme-dark hover:border-theme-mid bg-theme-black/50 hover:bg-theme-black transition-colors"
                                    title="Align right"
                                >
                                    <ArrowRight className="w-4 h-4 text-theme-white" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-theme-black/75 px-4 pt-20 pb-6 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                ref={modalRef}
                className={`${glass.promptDark} w-full max-w-6xl rounded-3xl border border-theme-dark px-8 pb-8 pt-4 shadow-2xl max-h-[85vh] flex flex-col`}
                onClick={event => event.stopPropagation()}
            >
                <div className="mb-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 id="resize-modal-heading" className="text-xl font-raleway text-theme-text flex items-center gap-3">
                            {mode === 'resize' ? (
                                <Scaling className="w-6 h-6 text-theme-text" />
                            ) : (
                                <Crop className="w-6 h-6 text-theme-text" />
                            )}
                            {mode === 'resize' ? 'Resize Image' : 'Crop Image'}
                        </h2>
                        {/* Mode toggle */}
                        <div className="flex rounded-lg border border-theme-dark bg-theme-black/50 p-0.5">
                            <button
                                type="button"
                                onClick={() => setMode('resize')}
                                className={`px-3 py-1.5 rounded-md text-xs font-raleway font-medium transition-all duration-200 flex items-center gap-1.5 ${mode === 'resize'
                                    ? 'bg-theme-mid/30 text-theme-text border border-theme-text/30'
                                    : 'text-theme-white/70 hover:text-theme-white border border-transparent'
                                    }`}
                            >
                                <Scaling className="w-3.5 h-3.5" />
                                Resize
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('crop')}
                                className={`px-3 py-1.5 rounded-md text-xs font-raleway font-medium transition-all duration-200 flex items-center gap-1.5 ${mode === 'crop'
                                    ? 'bg-theme-mid/30 text-theme-text border border-theme-text/30'
                                    : 'text-theme-white/70 hover:text-theme-white border border-transparent'
                                    }`}
                            >
                                <Crop className="w-3.5 h-3.5" />
                                Crop
                            </button>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex size-8 items-center justify-center rounded-full border border-theme-dark bg-theme-black text-theme-white transition-colors duration-200 hover:border-theme-mid hover:text-theme-text"
                        aria-label="Close resize modal"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex flex-1 gap-8 overflow-hidden flex-col lg:flex-row min-h-0">
                    {/* Left Column: Interactive Canvas */}
                    <div className="flex-1 flex flex-col items-center justify-center min-h-0 bg-theme-black/30 rounded-2xl border border-theme-dark p-4 overflow-hidden">
                        {renderCanvas()}
                        {selectedAspectRatio && layoutInfo && layoutInfo.type !== 'same' && (
                            <p className="mt-3 text-xs font-raleway text-theme-white text-center max-w-md flex-shrink-0">
                                {imageScale < 100
                                    ? 'Scaled down for more AI extension. Drag to position.'
                                    : 'Use the slider to scale and the scroll wheel to zoom.'}
                            </p>
                        )}
                        {!selectedAspectRatio && image.url && (
                            <p className="mt-3 text-xs font-raleway text-theme-white text-center flex-shrink-0">
                                Select a target aspect ratio to see the preview
                            </p>
                        )}
                    </div>

                    {/* Right Column: Controls - only for resize mode */}
                    {mode === 'resize' && (
                        <div className="w-full lg:w-80 flex flex-col gap-4 overflow-y-auto flex-shrink-0" {...{ [scrollLockExemptAttr]: 'true' }}>
                            <>
                                {/* Model Selection (Locked) */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-raleway font-medium text-theme-text uppercase tracking-wider">Model</label>
                                    <div className="w-full px-3 py-2.5 rounded-lg border border-theme-mid/50 bg-theme-dark/50 flex items-center opacity-70 cursor-not-allowed">
                                        <span className="text-xs font-raleway text-theme-white/80">Gemini 3 Pro (Nano Banana)</span>
                                    </div>
                                </div>

                                {/* Aspect Ratio Grid */}
                                <div className="space-y-2">
                                    <label className="text-xs font-raleway font-medium text-theme-text uppercase tracking-wider">Target Aspect Ratio</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {GEMINI_ASPECT_RATIO_OPTIONS.map(option => {
                                            const isSelected = selectedAspectRatio === option.value;

                                            // Check if this ratio matches the original image
                                            const [targetW, targetH] = option.value.split(':').map(Number);
                                            const targetRatio = targetW / targetH;
                                            const originalRatio = imageDimensions ? imageDimensions.width / imageDimensions.height : 0;
                                            const isOriginalRatio = imageDimensions && Math.abs(targetRatio - originalRatio) < 0.05;

                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isOriginalRatio) return;
                                                        setSelectedAspectRatio(option.value);
                                                        setImagePosition({ x: 50, y: 50 });
                                                        setImageScale(100);
                                                    }}
                                                    disabled={isOriginalRatio || false}
                                                    className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 text-left ${isOriginalRatio
                                                        ? 'border-theme-dark/50 bg-theme-dark/30 opacity-40 cursor-not-allowed'
                                                        : isSelected
                                                            ? 'border-theme-text bg-theme-mid/20'
                                                            : 'border-theme-dark hover:border-theme-mid bg-theme-black/50 hover:bg-theme-black'
                                                        }`}
                                                    title={isOriginalRatio ? 'This is the current aspect ratio' : undefined}
                                                >
                                                    <div className={`w-7 h-7 rounded flex items-center justify-center border ${isSelected ? 'border-theme-text' : 'border-theme-mid/50'} bg-theme-dark/80 overflow-hidden`}>
                                                        <div
                                                            className={`${isSelected ? 'bg-theme-text' : 'bg-theme-white/70'} flex-shrink-0`}
                                                            style={{
                                                                aspectRatio: option.value.replace(':', '/'),
                                                                ...(parseFloat(option.value.split(':')[0]) >= parseFloat(option.value.split(':')[1])
                                                                    ? { height: '14px', width: 'auto' }
                                                                    : { width: '14px', height: 'auto' }
                                                                )
                                                            }}
                                                        />
                                                    </div>
                                                    <span className={`text-xs font-raleway font-medium ${isSelected ? 'text-theme-text' : 'text-theme-white/90'}`}>
                                                        {option.label}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* User Prompt for Extension Hints */}
                                {selectedAspectRatio && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-raleway font-medium text-theme-text uppercase tracking-wider flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            Extension Hint (Optional)
                                        </label>
                                        <textarea
                                            value={userPrompt}
                                            onChange={(e) => setUserPrompt(e.target.value)}
                                            placeholder="Describe what to add in the extended areas, e.g. 'sunset sky with clouds' or 'wooden floor and plants'"
                                            className="w-full h-20 bg-theme-black/40 text-theme-white placeholder-theme-white/40 border border-theme-dark rounded-lg px-3 py-2 focus:outline-none focus:border-theme-mid transition-colors duration-200 font-raleway text-sm resize-none"
                                        />
                                        <p className="text-xs font-raleway text-theme-white/50">
                                            AI will extend the image seamlessly. Add hints for better results.
                                        </p>
                                    </div>
                                )}

                                <div className="mt-auto pt-6">
                                    <button
                                        type="button"
                                        onClick={handleApply}
                                        disabled={!selectedAspectRatio}
                                        className={`${buttons.primary} w-full py-4 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 text-base`}
                                    >
                                        <Scaling className="w-5 h-5" />
                                        Resize Image
                                    </button>
                                </div>
                            </>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

ResizeModal.displayName = 'ResizeModal';

export default ResizeModal;
