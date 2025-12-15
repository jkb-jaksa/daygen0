
import React, { useEffect, useRef, useState, useCallback, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Copy, Download, Heart, MoreHorizontal, Share2, Edit, RefreshCw, BookmarkPlus, BookmarkCheck } from 'lucide-react';
import { glass, tooltips } from '../styles/designSystem';
import { VideoPlayer } from './shared/VideoPlayer';
import { VerticalGalleryNav } from './shared/VerticalGalleryNav';

// Lazy load badges to avoid heavy init
const ModelBadge = lazy(() => import('./ModelBadge'));
const AspectRatioBadge = lazy(() => import('./shared/AspectRatioBadge'));

// ImageActionMenuPortal - simplified version matching Explore.tsx style
function ImageActionMenuPortal({
    anchorEl,
    open,
    onClose,
    children,
}: {
    anchorEl: HTMLElement | null;
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
}) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ top: number; left: number; transformOrigin: string }>({
        top: 0,
        left: 0,
        transformOrigin: 'top left',
    });

    useEffect(() => {
        if (!open || !anchorEl) return;

        const updatePosition = () => {
            const rect = anchorEl.getBoundingClientRect();
            const menuWidth = 160;
            const menuHeight = 80;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let top = rect.bottom + 4;
            let left = rect.left;
            let transformOrigin = 'top left';

            if (left + menuWidth > viewportWidth - 16) {
                left = rect.right - menuWidth;
                transformOrigin = 'top right';
            }

            if (top + menuHeight > viewportHeight - 16) {
                top = rect.top - menuHeight - 4;
                transformOrigin = transformOrigin.replace('top', 'bottom');
            }

            setPosition({ top, left, transformOrigin });
        };

        updatePosition();
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [open, anchorEl]);

    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
                anchorEl && !anchorEl.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open, anchorEl, onClose]);

    if (!open) return null;

    return createPortal(
        <div
            ref={menuRef}
            className={`${glass.promptDark} absolute z-[9999] min-w-[160px] rounded-xl border border-theme-dark/70 py-1.5 shadow-xl`}
            style={{
                position: 'fixed',
                top: `${position.top}px`,
                left: `${position.left}px`,
                transformOrigin: position.transformOrigin,
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {children}
        </div>,
        document.body
    );
}

interface ProfileFullViewProps {
    isOpen: boolean;
    onClose: () => void;
    initialIndex: number;
    items: Array<{
        id: string;
        fileUrl: string;
        prompt?: string;
        model?: string;
        aspectRatio?: string;
        type?: 'image' | 'video';
    }>;
}

export function ProfileFullView({
    isOpen,
    onClose,
    initialIndex,
    items
}: ProfileFullViewProps) {
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isVideoPromptExpanded, setIsVideoPromptExpanded] = useState(false);
    const [moreActionMenu, setMoreActionMenu] = useState<{ id: string; anchor: HTMLElement | null } | null>(null);
    const [recreateActionMenu, setRecreateActionMenu] = useState<{ id: string; anchor: HTMLElement | null } | null>(null);
    const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
    const [savedItems, setSavedItems] = useState<Set<string>>(new Set());
    const [fullSizePadding, setFullSizePadding] = useState<{ left: number; right: number }>(() => ({
        left: 0,
        right: 0,
    }));
    const overlayRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Sync index when initialIndex changes (e.g. opening different item)
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
        }
    }, [isOpen, initialIndex]);

    const handlePrevious = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : items.length - 1));
    }, [items.length]);

    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        setCurrentIndex(prev => (prev < items.length - 1 ? prev + 1 : 0));
    }, [items.length]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen) return;
        if (e.key === 'ArrowLeft') handlePrevious();
        if (e.key === 'ArrowRight') handleNext();
        if (e.key === 'Escape') onClose();
    }, [isOpen, handlePrevious, handleNext, onClose]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const handleGalleryNavWidthChange = useCallback((width: number) => {
        setFullSizePadding(prev => ({ ...prev, right: width + 32 }));
    }, []);

    if (!isOpen || items.length === 0) return null;

    const item = items[currentIndex];
    const isVideo = item.type === 'video' || /\.(mp4|mov|webm|m4v|mkv|avi|wmv)(\?|$)/i.test(item.fileUrl);
    const hasMultipleItems = items.length > 1;

    // Helper to extract filename for download
    const getDownloadFilename = () => {
        const ext = isVideo ? 'mp4' : 'png';
        const promptSlug = item.prompt
            ? item.prompt.slice(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase()
            : 'generated';
        return `daygen-${promptSlug}-${item.id.slice(0, 8)}.${ext}`;
    };

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const response = await fetch(item.fileUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = getDownloadFilename();
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download failed', err);
        }
    };

    const handleCopyPrompt = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (item.prompt) {
            await navigator.clipboard.writeText(item.prompt);
        }
    };

    const handleCopyLink = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const shareUrl = item.fileUrl;
        await navigator.clipboard.writeText(shareUrl);
        setMoreActionMenu(null);
    };

    const toggleLike = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        e.currentTarget.blur();
        setLikedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(item.id)) {
                newSet.delete(item.id);
            } else {
                newSet.add(item.id);
            }
            return newSet;
        });
    };

    const toggleMoreMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (moreActionMenu?.id === item.id) {
            setMoreActionMenu(null);
        } else {
            setMoreActionMenu({ id: item.id, anchor: e.currentTarget as HTMLElement });
        }
    };

    const toggleRecreateMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMoreActionMenu(null);
        if (recreateActionMenu?.id === item.id) {
            setRecreateActionMenu(null);
        } else {
            setRecreateActionMenu({ id: item.id, anchor: e.currentTarget as HTMLElement });
        }
    };

    const closeRecreateMenu = () => {
        setRecreateActionMenu(null);
    };

    const handleRecreateEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        closeRecreateMenu();
        navigate("/edit", {
            state: {
                imageToEdit: {
                    url: item.fileUrl,
                    prompt: item.prompt,
                    model: item.model,
                    timestamp: new Date().toISOString(),
                    isPublic: true,
                },
            },
        });
    };

    const handleRecreateUseAsReference = (e: React.MouseEvent) => {
        e.stopPropagation();
        closeRecreateMenu();
        navigate("/app/image", {
            state: {
                referenceImageUrl: item.fileUrl,
                selectedModel: item.model,
                focusPromptBar: true,
            },
        });
    };

    const handleRecreateRunPrompt = (e: React.MouseEvent) => {
        e.stopPropagation();
        closeRecreateMenu();
        navigate("/app/image", {
            state: {
                promptToPrefill: item.prompt,
                selectedModel: item.model,
                focusPromptBar: true,
            },
        });
    };

    const toggleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSavedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(item.id)) {
                newSet.delete(item.id);
            } else {
                newSet.add(item.id);
            }
            return newSet;
        });
    };

    const isSaved = savedItems.has(item.id);
    const isRecreateMenuActive = recreateActionMenu?.id === item.id;

    // Tooltip helpers
    const showHoverTooltip = (target: HTMLElement, id: string) => {
        const tooltip = document.getElementById(id);
        if (tooltip) {
            const rect = target.getBoundingClientRect();
            tooltip.style.top = `${rect.top - 32}px`;
            tooltip.style.left = `${rect.left + rect.width / 2}px`;
            tooltip.style.transform = 'translateX(-50%)';
            tooltip.classList.remove('opacity-0');
            tooltip.classList.add('opacity-100');
        }
    };
    const hideHoverTooltip = (id: string) => {
        const tooltip = document.getElementById(id);
        if (tooltip) {
            tooltip.classList.remove('opacity-100');
            tooltip.classList.add('opacity-0');
        }
    };

    const copyTooltipId = `copy-fullsize-${item.id}`;
    const isLiked = likedItems.has(item.id);
    const isMenuActive = moreActionMenu?.id === item.id;

    return createPortal(
        <>
            <div
                ref={overlayRef}
                className="fixed inset-0 z-[200] bg-theme-black/80 backdrop-blur-md flex items-start justify-center py-4"
                style={{
                    paddingLeft: `${fullSizePadding.left}px`,
                    paddingRight: `${fullSizePadding.right}px`,
                }}
                onClick={(e) => {
                    if (e.target === overlayRef.current || e.target === modalRef.current) {
                        onClose();
                    }
                }}
            >
                <div ref={modalRef} className="relative max-w-[95vw] max-h-[90vh] group flex items-start justify-center mt-14" style={{ transform: 'translateX(-50px)' }} onClick={e => e.stopPropagation()}>

                    {/* Navigation arrows */}
                    {!isVideo && hasMultipleItems && (
                        <>
                            <button
                                onClick={handlePrevious}
                                className={`${glass.promptDark} absolute left-4 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-theme-text`}
                                title="Previous image (←)"
                                aria-label="Previous image"
                            >
                                <ChevronLeft className="w-5 h-5 text-current transition-colors duration-100" />
                            </button>
                            <button
                                onClick={handleNext}
                                className={`${glass.promptDark} absolute right-4 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-theme-text`}
                                title="Next image (→)"
                                aria-label="Next image"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </>
                    )}

                    {/* Blurred background */}
                    <div
                        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat blur-[100px] opacity-50 scale-110 pointer-events-none"
                        style={{ backgroundImage: `url(${item.fileUrl})` }}
                    />

                    {/* Media */}
                    {isVideo ? (
                        <div className="relative z-10 max-w-full max-h-[90vh] flex items-center justify-center">
                            <VideoPlayer
                                src={item.fileUrl}
                                className="rounded-lg shadow-2xl"
                                objectFit="contain"
                                showInfoButton={!!item.prompt}
                                isInfoActive={isVideoPromptExpanded}
                                onInfoClick={() => setIsVideoPromptExpanded(prev => !prev)}
                                autoPlay
                            />
                        </div>
                    ) : (
                        <img
                            src={item.fileUrl}
                            alt={item.prompt || 'Generated Content'}
                            loading="lazy"
                            className="relative z-10 max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                            style={{ objectPosition: 'top' }}
                        />
                    )}

                    {/* Action buttons at top */}
                    <div className="image-gallery-actions absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-4 pt-4 pointer-events-none">
                        {/* Left side - Recreate button */}
                        <div className="relative">
                            <button
                                type="button"
                                className={`image-action-btn image-action-btn--labelled parallax-large transition-opacity duration-100 ${isRecreateMenuActive
                                    ? 'opacity-100 pointer-events-auto'
                                    : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
                                    }`}
                                aria-haspopup="menu"
                                aria-expanded={isRecreateMenuActive}
                                onClick={toggleRecreateMenu}
                            >
                                <Edit className="w-4 h-4" />
                                <span className="text-sm font-medium">Recreate</span>
                            </button>
                            <ImageActionMenuPortal
                                anchorEl={recreateActionMenu?.id === item.id ? recreateActionMenu?.anchor ?? null : null}
                                open={isRecreateMenuActive}
                                onClose={closeRecreateMenu}
                            >
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                                    onClick={handleRecreateEdit}
                                >
                                    <Edit className="h-4 w-4" />
                                    Edit image
                                </button>
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                                    onClick={handleRecreateUseAsReference}
                                >
                                    <Copy className="h-4 w-4" />
                                    Use as reference
                                </button>
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                                    onClick={handleRecreateRunPrompt}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Run the same prompt
                                </button>
                            </ImageActionMenuPortal>
                        </div>

                        {/* Right side - Save, Heart, More, and Close buttons */}
                        <div className="flex items-center gap-2">
                            <div
                                className={`flex items-center gap-1 transition-opacity duration-100 ${isMenuActive || isRecreateMenuActive
                                    ? 'opacity-100 pointer-events-auto'
                                    : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
                                    }`}
                            >
                                <button
                                    type="button"
                                    onClick={toggleSave}
                                    className={`image-action-btn image-action-btn--labelled parallax-large pointer-events-auto ${isSaved ? 'border-theme-white/50 bg-theme-white/10 text-theme-text' : ''
                                        }`}
                                    aria-pressed={isSaved}
                                    aria-label={isSaved ? 'Remove from your gallery' : 'Save to your gallery'}
                                >
                                    {isSaved ? (
                                        <BookmarkCheck className="size-3.5" aria-hidden="true" />
                                    ) : (
                                        <BookmarkPlus className="size-3.5" aria-hidden="true" />
                                    )}
                                    {isSaved ? 'Saved' : 'Save'}
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleLike}
                                    className="image-action-btn image-action-btn--labelled parallax-large favorite-toggle pointer-events-auto"
                                    aria-label={isLiked ? "Remove from liked" : "Add to liked"}
                                >
                                    <Heart
                                        className={`w-3 h-3 transition-colors duration-100 ${isLiked ? 'fill-red-500 text-red-500' : 'text-current fill-none'
                                            }`}
                                        aria-hidden="true"
                                    />
                                </button>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={toggleMoreMenu}
                                        className="image-action-btn image-action-btn--fullsize parallax-large pointer-events-auto"
                                        aria-label="More options"
                                    >
                                        <MoreHorizontal className="size-4" aria-hidden="true" />
                                    </button>
                                    <ImageActionMenuPortal
                                        anchorEl={moreActionMenu?.id === item.id ? moreActionMenu?.anchor ?? null : null}
                                        open={moreActionMenu?.id === item.id}
                                        onClose={() => setMoreActionMenu(null)}
                                    >
                                        <button
                                            type="button"
                                            className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                                            onClick={handleCopyLink}
                                        >
                                            <Share2 className="h-4 w-4" />
                                            Copy link
                                        </button>
                                        <button
                                            type="button"
                                            className="flex w-full items-center gap-1.5 px-2 py-1.5 text-sm font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                                            onClick={handleDownload}
                                        >
                                            <Download className="h-4 w-4" />
                                            Download
                                        </button>
                                    </ImageActionMenuPortal>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Close button - positioned on right side of image */}
                    <button
                        onClick={onClose}
                        className="absolute -top-3 -right-3 p-1.5 rounded-full bg-[color:var(--glass-dark-bg)] text-theme-white hover:text-theme-text backdrop-blur-sm transition-colors duration-200"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* Prompt Bar Overlay */}
                    <div
                        className={`PromptDescriptionBar absolute bottom-4 left-4 right-4 rounded-2xl p-4 text-theme-text transition-opacity duration-100 z-30 ${isVideo
                            ? `${isVideoPromptExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`
                            : `${isMenuActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`
                            }`}
                    >
                        <div className="flex items-center justify-center">
                            <div className="text-center">
                                <div className="text-sm font-raleway leading-relaxed">
                                    {item.prompt || 'Generated Content'}
                                    {item.prompt && (
                                        <button
                                            data-copy-button="true"
                                            onClick={handleCopyPrompt}
                                            onMouseEnter={(e) => showHoverTooltip(e.currentTarget, copyTooltipId)}
                                            onMouseLeave={() => hideHoverTooltip(copyTooltipId)}
                                            className="ml-2 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle pointer-events-auto"
                                        >
                                            <Copy className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>

                                {/* Badges */}
                                <div className="mt-2 flex justify-center items-center gap-2">
                                    <div className="flex items-center gap-2">
                                        <Suspense fallback={null}>
                                            <ModelBadge model={item.model || 'unknown'} size="md" />
                                        </Suspense>
                                        <Suspense fallback={null}>
                                            <AspectRatioBadge aspectRatio={item.aspectRatio || '1:1'} size="md" />
                                        </Suspense>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Vertical Gallery Navigation */}
                {hasMultipleItems && (
                    <VerticalGalleryNav
                        images={items.map(i => ({ url: i.fileUrl, id: i.id, isVideo: i.type === 'video' || /\.(mp4|mov|webm|m4v|mkv|avi|wmv)(\?|$)/i.test(i.fileUrl) }))}
                        currentIndex={currentIndex}
                        onNavigate={(index) => {
                            if (index >= 0 && index < items.length) {
                                setCurrentIndex(index);
                            }
                        }}
                        onWidthChange={handleGalleryNavWidthChange}
                    />
                )}

                {/* Tooltips rendered via portal to avoid clipping */}
                {createPortal(
                    <div
                        id={copyTooltipId}
                        data-tooltip-for={copyTooltipId}
                        className={`${tooltips.base} fixed opacity-0 transition-opacity`}
                        style={{ zIndex: 9999 }}
                    >
                        Copy prompt
                    </div>,
                    document.body
                )}
            </div >
        </>,
        document.body
    );
}

export default ProfileFullView;
