
import React, { useEffect, useRef, useState, useCallback, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Copy, Download } from 'lucide-react';
import { glass, tooltips } from '../styles/designSystem';
import { VideoPlayer } from './shared/VideoPlayer';

// Lazy load ImageBadgeRow to avoid circular dependencies or heavy init
const ImageBadgeRow = lazy(() => import('./shared/ImageBadgeRow'));

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
        type?: 'image' | 'video'; // Inferred from URL or explicit
    }>;
}

export function ProfileFullView({
    isOpen,
    onClose,
    initialIndex,
    items
}: ProfileFullViewProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isVideoPromptExpanded, setIsVideoPromptExpanded] = useState(false);
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
            // Ideally show toast here, but for now we rely on UI feedback or implicit success
        }
    };

    // Tooltip helpers (simplified)
    const showHoverTooltip = (target: HTMLElement, id: string) => {
        const tooltip = document.getElementById(id);
        if (tooltip) {
            const rect = target.getBoundingClientRect();
            tooltip.style.top = `${rect.top - 32}px`;
            tooltip.style.left = `${rect.left + rect.width / 2}px`;
            tooltip.style.transform = 'translateX(-50%)';
            tooltip.classList.remove('opacity-0');
        }
    };
    const hideHoverTooltip = (id: string) => {
        const tooltip = document.getElementById(id);
        if (tooltip) tooltip.classList.add('opacity-0');
    };

    const copyTooltipId = `copy-${item.id}`;
    const downloadTooltipId = `download-sidebar-${item.id}`;

    return createPortal(
        <>
            <div
                ref={overlayRef}
                className="fixed inset-0 z-[200] bg-theme-black/80 backdrop-blur-[16px] flex items-center justify-center p-4"
                onClick={(e) => {
                    if (e.target === overlayRef.current || e.target === modalRef.current) {
                        onClose();
                    }
                }}
            >
                <div ref={modalRef} className="relative w-full h-full flex items-center justify-center">

                    {/* Main Content */}
                    <div className="relative group flex items-start justify-center mt-14" style={{ transform: 'translateX(-50px)' }} onClick={e => e.stopPropagation()}>

                        {/* Navigation */}
                        {!isVideo && hasMultipleItems && (
                            <>
                                <button
                                    onClick={handlePrevious}
                                    className={`${glass.promptDark} hover:border-theme-mid absolute -left-14 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-theme-text`}
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleNext}
                                    className={`${glass.promptDark} hover:border-theme-mid absolute -right-14 top-1/2 -translate-y-1/2 z-20 text-theme-white rounded-[40px] p-2.5 focus:outline-none focus:ring-0 hover:scale-105 transition-all duration-100 opacity-0 group-hover:opacity-100 hover:text-theme-text`}
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </>
                        )}

                        {/* Media */}
                        {isVideo ? (
                            <div className="max-w-[90vw] sm:max-w-[calc(100vw-20rem)] lg:max-w-[calc(100vw-40rem)] max-h-[85vh] w-full h-full flex items-center justify-center relative">
                                {/* Blurred Background for Video */}
                                <div
                                    className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat blur-[100px] opacity-50 scale-110 pointer-events-none"
                                    style={{ backgroundImage: `url(${item.fileUrl})` }}
                                />
                                <div className="z-10 relative w-full h-full flex items-center justify-center">
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
                            </div>
                        ) : (
                            <div className="relative flex items-center justify-center max-w-[90vw] sm:max-w-[calc(100vw-20rem)] lg:max-w-[calc(100vw-40rem)] max-h-[85vh]">
                                {/* Blurred Background for Image */}
                                <div
                                    className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat blur-[100px] opacity-50 scale-110 pointer-events-none"
                                    style={{ backgroundImage: `url(${item.fileUrl})` }}
                                />
                                <img
                                    src={item.fileUrl}
                                    alt={item.prompt || 'Generated Content'}
                                    className="relative z-10 max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                                />
                            </div>
                        )}

                        {/* Close button (top right of image) */}
                        <button
                            onClick={onClose}
                            className="absolute -top-3 -right-3 p-1.5 rounded-full bg-[color:var(--glass-dark-bg)] text-theme-white hover:text-theme-text backdrop-blur-sm transition-colors duration-200"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Prompt Bar Overlay */}
                        <div
                            className={`PromptDescriptionBar absolute left-4 right-4 rounded-2xl p-4 text-theme-text transition-opacity duration-150 ${isVideo
                                ? `bottom-4 z-30 ${isVideoPromptExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`
                                : 'bottom-4 opacity-0 group-hover:opacity-100'
                                }`}
                        >
                            <div className="flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-sm font-raleway leading-relaxed relative">
                                        {item.prompt || 'Generated Content'}
                                        {item.prompt && (
                                            <button
                                                onClick={handleCopyPrompt}
                                                onMouseEnter={(e) => showHoverTooltip(e.currentTarget, copyTooltipId)}
                                                onMouseLeave={() => hideHoverTooltip(copyTooltipId)}
                                                className="ml-2 inline cursor-pointer text-theme-white transition-colors duration-200 hover:text-theme-text relative z-30 align-middle"
                                            >
                                                <Copy className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Badges */}
                                    <div className="mt-2 text-center flex justify-center">
                                        <Suspense fallback={null}>
                                            <ImageBadgeRow
                                                align="center"
                                                model={{
                                                    name: item.model || 'unknown',
                                                    size: 'md'
                                                }}
                                                // We don't have avatar/product objects here comfortably, so skipping them as discussed
                                                aspectRatio={item.aspectRatio}
                                                compact={false}
                                            />
                                        </Suspense>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar (Simplified Actions) */}
                    <aside
                        className={`${glass.promptDark} w-[72px] rounded-2xl py-4 flex flex-col items-center gap-4 fixed z-[210]`}
                        style={{
                            right: 'calc(var(--container-inline-padding, clamp(1rem,5vw,6rem)))', // Simplified position
                            top: '50%',
                            transform: 'translateY(-50%)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={handleDownload}
                            onMouseEnter={(e) => showHoverTooltip(e.currentTarget, downloadTooltipId)}
                            onMouseLeave={() => hideHoverTooltip(downloadTooltipId)}
                            className="p-3 rounded-xl text-theme-white hover:text-theme-text hover:bg-theme-white/10 transition-all"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                    </aside>

                    {/* Tooltips */}
                    {createPortal(
                        <div id={copyTooltipId} className={`${tooltips.base} fixed opacity-0 transition-opacity z-[9999]`}>Copy prompt</div>,
                        document.body
                    )}
                    {createPortal(
                        <div id={downloadTooltipId} className={`${tooltips.base} fixed opacity-0 transition-opacity z-[9999]`}>Download</div>,
                        document.body
                    )}
                </div>
            </div>
        </>,
        document.body
    );
}

export default ProfileFullView;
