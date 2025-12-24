import { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import { X, User, Edit, Copy, RefreshCw, BookmarkPlus, BookmarkCheck, Heart, MoreHorizontal, Share2, Download } from 'lucide-react';
import { createPortal } from 'react-dom';
import { glass } from '../styles/designSystem';
import { useNavigate } from 'react-router-dom';

const ModelBadge = lazy(() => import('./ModelBadge'));
const AspectRatioBadge = lazy(() => import('./shared/AspectRatioBadge'));
const ProfileFullView = lazy(() => import('./ProfileFullView'));
import { useAuth } from "../auth/useAuth";

// ImageActionMenuPortal implementation matching Explore/ProfileFullView
function ImageActionMenuPortal({
    anchorEl,
    open,
    onClose,
    children,
    isRecreateMenu = false
}: {
    anchorEl: HTMLElement | null;
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    isRecreateMenu?: boolean;
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
            const menuHeight = isRecreateMenu ? 120 : 80;
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
    }, [open, anchorEl, isRecreateMenu]);

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
            className={`${glass.promptDark} absolute z-[9999] min-w-[160px] rounded-xl border border-theme-dark/70 shadow-xl`}
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

interface CreatorProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    initialName?: string;
    initialProfileImage?: string;
}

interface ProfileGeneration {
    id: string;
    fileUrl: string;
    prompt?: string;
    model?: string;
    aspectRatio?: string;
    createdAt: string;
    // Added for action buttons
    isLiked?: boolean;
    likeCount?: number;
    likes?: number; // Alias for consistent usage if needed
}

interface ProfileData {
    user?: {
        displayName?: string;
        authUserId: string;
        username?: string;
        profileImage?: string;
        bio?: string;
    };
    items: ProfileGeneration[];
    totalCount: number;
    nextCursor: string | null;
}

export function CreatorProfileModal({
    isOpen,
    onClose,
    userId,
    initialName,
    initialProfileImage,
}: CreatorProfileModalProps) {
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fullViewIndex, setFullViewIndex] = useState<number | null>(null);

    // Action menu states
    const [moreActionMenu, setMoreActionMenu] = useState<{ id: string; anchor: HTMLElement | null } | null>(null);
    const [recreateActionMenu, setRecreateActionMenu] = useState<{ id: string; anchor: HTMLElement | null } | null>(null);
    // Local state for tracking saved/liked items optimistically within the modal
    const [localLikedItems, setLocalLikedItems] = useState<Set<string>>(new Set());
    // Local state for basic save interaction (visual only as strict persistence requires context)
    const [localSavedItems, setLocalSavedItems] = useState<Set<string>>(new Set());

    const { token } = useAuth();
    const navigate = useNavigate();

    const fetchProfile = useCallback(async () => {
        if (!userId) return;

        setIsLoading(true);
        setError(null);

        try {
            const apiBase = import.meta.env.VITE_API_BASE_URL || '';
            const headers: HeadersInit = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${apiBase}/api/r2files/public/user/${userId}?limit=30`, {
                headers
            });

            if (!response.ok) {
                throw new Error('Failed to load profile');
            }

            const data = await response.json() as ProfileData;

            // Initialize local liked state from fetched data
            const likedSet = new Set<string>();
            data.items.forEach(item => {
                if (item.isLiked) likedSet.add(item.id);
            });
            setLocalLikedItems(likedSet);

            setProfileData(data);
        } catch (err) {
            setError('Failed to load creator profile');
            console.error('Profile fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [userId, token]);

    // Action handlers matching Explore/ProfileFullView
    const toggleLike = async (item: ProfileGeneration, e: React.MouseEvent) => {
        e.stopPropagation();
        (e.currentTarget as HTMLElement).blur();

        const isCurrentlyLiked = localLikedItems.has(item.id);

        // Optimistic update
        setLocalLikedItems(prev => {
            const next = new Set(prev);
            if (isCurrentlyLiked) next.delete(item.id);
            else next.add(item.id);
            return next;
        });

        // Also update the profileData state to reflect count change optimistically
        setProfileData(prev => {
            if (!prev) return null;
            return {
                ...prev,
                items: prev.items.map(i => {
                    if (i.id === item.id) {
                        return {
                            ...i,
                            likeCount: (i.likeCount || 0) + (isCurrentlyLiked ? -1 : 1)
                        };
                    }
                    return i;
                })
            };
        });

        try {
            const apiBase = import.meta.env.VITE_API_BASE_URL || '';
            await fetch(`${apiBase}/api/r2files/${item.id}/toggle-like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });
        } catch (err) {
            console.error('Failed to toggle like', err);
            // Revert on error
            setLocalLikedItems(prev => {
                const next = new Set(prev);
                if (isCurrentlyLiked) next.add(item.id);
                else next.delete(item.id);
                return next;
            });
        }
    };

    const toggleMoreActionMenu = (id: string, anchor: HTMLElement, e: React.MouseEvent) => {
        e.stopPropagation();
        if (moreActionMenu?.id === id) {
            setMoreActionMenu(null);
        } else {
            setMoreActionMenu({ id, anchor });
        }
    };

    const toggleRecreateActionMenu = (id: string, anchor: HTMLElement, e: React.MouseEvent) => {
        e.stopPropagation();
        if (recreateActionMenu?.id === id) {
            setRecreateActionMenu(null);
        } else {
            setRecreateActionMenu({ id, anchor });
        }
    };

    const handleCopyLink = async (url: string) => {
        await navigator.clipboard.writeText(url);
        setMoreActionMenu(null);
    };

    const handleDownload = async (url: string, id: string, type: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `daygen-${id}.${type === 'video' ? 'mp4' : 'png'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download failed', err);
        }
        setMoreActionMenu(null);
    };

    const handleRecreateEdit = (item: ProfileGeneration) => {
        setRecreateActionMenu(null);
        onClose(); // Close modal too
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

    const handleRecreateUseAsReference = (item: ProfileGeneration) => {
        setRecreateActionMenu(null);
        onClose();
        navigate("/app/image", {
            state: {
                referenceImageUrl: item.fileUrl,
                selectedModel: item.model,
                focusPromptBar: true,
            },
        });
    };

    const handleRecreateRunPrompt = (item: ProfileGeneration) => {
        setRecreateActionMenu(null);
        onClose();
        navigate("/app/image", {
            state: {
                promptToPrefill: item.prompt,
                selectedModel: item.model,
                focusPromptBar: true,
            },
        });
    };

    const toggleSave = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setLocalSavedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    useEffect(() => {
        if (isOpen && userId) {
            void fetchProfile();
        }
    }, [isOpen, userId, fetchProfile]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (fullViewIndex !== null) {
                    setFullViewIndex(null);
                } else {
                    onClose();
                }
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            if (fullViewIndex === null) {
                document.body.style.overflow = 'hidden';
            }
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            if (!isOpen) {
                document.body.style.overflow = '';
            }
        };
    }, [isOpen, onClose, fullViewIndex]);

    if (!isOpen) return null;

    // Use username (Profile URL) as primary display name, with displayName as fallback
    const displayName = profileData?.user?.username || profileData?.user?.displayName || initialName || 'Creator';
    const profileImage = profileData?.user?.profileImage || initialProfileImage;
    const bio = profileData?.user?.bio;
    const generations = profileData?.items || [];

    return createPortal(
        <>
            <div
                className="fixed inset-0 z-[80] flex items-center justify-center bg-theme-black/80 px-4 py-8"
                onClick={onClose}
            >
                <div
                    className={`${glass.promptDark} relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl border border-theme-dark/70 shadow-[0_40px_120px_rgba(0,0,0,0.55)]`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-4 top-4 z-10 inline-flex size-9 items-center justify-center rounded-full border border-theme-dark/60 text-theme-white/70 transition-colors duration-200 hover:text-theme-text hover:border-theme-mid"
                        aria-label="Close profile"
                    >
                        <X className="size-4" />
                    </button>

                    {/* Profile header */}
                    <div className="p-6 pb-4 border-b border-theme-dark/50">
                        <div
                            className="flex items-center gap-4 cursor-pointer"
                            onClick={() => {
                                onClose();
                                // Prefer username over userId for cleaner URLs
                                const profilePath = profileData?.user?.username
                                    ? `/creator/${profileData.user.username}`
                                    : `/creator/${userId}`;
                                navigate(profilePath);
                            }}
                        >
                            {profileImage ? (
                                <img
                                    src={profileImage}
                                    alt={displayName}
                                    className="w-16 h-16 rounded-full object-cover border border-theme-dark self-start transition-colors duration-200 hover:border-theme-mid"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-[conic-gradient(from_0deg,_rgba(245,158,11,0.6),_rgba(239,68,68,0.6),_rgba(59,130,246,0.6),_rgba(34,211,238,0.6),_rgba(245,158,11,0.6))] flex items-center justify-center border border-theme-dark self-start transition-colors duration-200 hover:border-theme-mid">
                                    <span className="text-2xl font-raleway font-medium text-theme-text">{displayName?.[0]?.toUpperCase() || '?'}</span>
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h2 className="text-2xl font-raleway font-normal text-theme-text mb-1">{displayName}</h2>
                                <p className="text-sm text-theme-white mb-1">
                                    {profileData?.totalCount || 0} public generation{profileData?.totalCount !== 1 ? 's' : ''}
                                </p>
                                {bio && (
                                    <p className="text-sm font-raleway text-theme-light leading-relaxed max-w-2xl whitespace-pre-wrap">
                                        {bio}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Content area */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-theme-white/60 text-sm font-raleway">Loading...</div>
                            </div>
                        ) : error ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-red-400 text-sm font-raleway">{error}</div>
                            </div>
                        ) : generations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <User className="w-12 h-12 text-theme-white/30 mb-4" />
                                <p className="text-theme-white/60 text-sm font-raleway">No public generations yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
                                {generations.map((item, index) => {
                                    const isLiked = localLikedItems.has(item.id);
                                    const isSaved = localSavedItems.has(item.id);
                                    const isMenuActive = moreActionMenu?.id === item.id;
                                    const isRecreateActive = recreateActionMenu?.id === item.id;

                                    return (
                                        <div
                                            key={item.id}
                                            className="group relative overflow-hidden rounded-xl border border-theme-dark/50 hover:border-theme-mid transition-colors duration-200 aspect-square cursor-pointer parallax-large"
                                            onClick={() => setFullViewIndex(index)}
                                        >
                                            <img
                                                src={item.fileUrl}
                                                alt={item.prompt || 'AI Generated'}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />

                                            {/* Action Buttons Overlay - Matches Explore Grid */}
                                            <div className="image-gallery-actions absolute left-3 top-3 flex items-center gap-2 transition-opacity duration-100 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto z-20">
                                                {/* Left side actions (Recreate) */}
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        className={`image-action-btn image-action-btn--labelled parallax-large transition-opacity duration-100 ${isRecreateActive
                                                            ? 'opacity-100 pointer-events-auto'
                                                            : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
                                                            }`}
                                                        onClick={(e) => toggleRecreateActionMenu(item.id, e.currentTarget as HTMLElement, e)}
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                        <span className="text-xs font-medium">Recreate</span>
                                                    </button>
                                                    <ImageActionMenuPortal
                                                        anchorEl={recreateActionMenu?.id === item.id ? recreateActionMenu?.anchor ?? null : null}
                                                        open={isRecreateActive}
                                                        onClose={() => setRecreateActionMenu(null)}
                                                        isRecreateMenu={true}
                                                    >
                                                        <button
                                                            type="button"
                                                            className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 text-xs font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRecreateEdit(item);
                                                            }}
                                                        >
                                                            <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                                                            <Edit className="h-3.5 w-3.5 relative z-10" />
                                                            <span className="relative z-10">Edit image</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 text-xs font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRecreateUseAsReference(item);
                                                            }}
                                                        >
                                                            <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                                                            <Copy className="h-3.5 w-3.5 relative z-10" />
                                                            <span className="relative z-10">Use as reference</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 text-xs font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRecreateRunPrompt(item);
                                                            }}
                                                        >
                                                            <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                                                            <RefreshCw className="h-3.5 w-3.5 relative z-10" />
                                                            <span className="relative z-10">Run the same prompt</span>
                                                        </button>
                                                    </ImageActionMenuPortal>
                                                </div>
                                            </div>

                                            <div className="image-gallery-actions absolute right-3 top-3 flex items-center gap-1 transition-opacity duration-100 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto z-20">
                                                {/* Right side actions (Save, Like, More) */}
                                                {/* Note: Save functionality requires full context (folders, etc), implementing visual stub/toggle for now to match UI request */}

                                                <button
                                                    type="button"
                                                    onClick={(e) => toggleSave(item.id, e)}
                                                    className={`image-action-btn image-action-btn--labelled parallax-large ${isSaved ? 'border-theme-white/50 bg-theme-white/10 text-theme-text' : ''}`}
                                                    aria-label={isSaved ? "Remove from saved" : "Save"}
                                                >
                                                    {isSaved ? <BookmarkCheck className="size-3.5" /> : <BookmarkPlus className="size-3.5" />}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={(e) => toggleLike(item, e)}
                                                    className="image-action-btn image-action-btn--labelled parallax-large favorite-toggle"
                                                    aria-label={isLiked ? "Remove from liked" : "Add to liked"}
                                                >
                                                    <Heart
                                                        className={`size-3.5 transition-colors duration-100 ${isLiked ? 'fill-red-500 text-red-500' : 'text-current fill-none'}`}
                                                    />
                                                    {item.likeCount || 0}
                                                </button>

                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        className="image-action-btn parallax-large"
                                                        onClick={(e) => toggleMoreActionMenu(item.id, e.currentTarget as HTMLElement, e)}
                                                    >
                                                        <MoreHorizontal className="size-4" />
                                                    </button>
                                                    <ImageActionMenuPortal
                                                        anchorEl={moreActionMenu?.id === item.id ? moreActionMenu?.anchor ?? null : null}
                                                        open={isMenuActive}
                                                        onClose={() => setMoreActionMenu(null)}
                                                    >
                                                        <button
                                                            type="button"
                                                            className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 text-xs font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCopyLink(item.fileUrl);
                                                            }}
                                                        >
                                                            <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                                                            <Share2 className="h-3.5 w-3.5 relative z-10" />
                                                            <span className="relative z-10">Copy link</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="relative overflow-hidden group flex w-full items-center gap-1.5 px-2 py-1.5 text-xs font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownload(item.fileUrl, item.id, item.model?.includes('video') ? 'video' : 'image');
                                                            }}
                                                        >
                                                            <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100" />
                                                            <Download className="h-3.5 w-3.5 relative z-10" />
                                                            <span className="relative z-10">Download</span>
                                                        </button>
                                                    </ImageActionMenuPortal>
                                                </div>
                                            </div>

                                            <div
                                                className="PromptDescriptionBar absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out opacity-0 group-hover:opacity-100 z-10"
                                            >
                                                <div className="p-3">
                                                    <p className="text-theme-text text-xs font-raleway leading-relaxed line-clamp-2 mb-2">
                                                        {item.prompt || 'AI Generated Image'}
                                                    </p>
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        {item.model && (
                                                            <Suspense fallback={null}>
                                                                <ModelBadge model={item.model} size="sm" />
                                                            </Suspense>
                                                        )}
                                                        {item.aspectRatio && (
                                                            <Suspense fallback={null}>
                                                                <AspectRatioBadge aspectRatio={item.aspectRatio} size="sm" />
                                                            </Suspense>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {fullViewIndex !== null && (
                <Suspense fallback={null}>
                    <ProfileFullView
                        isOpen={true}
                        onClose={() => setFullViewIndex(null)}
                        initialIndex={fullViewIndex}
                        items={generations}
                    />
                </Suspense>
            )}
        </>,
        document.body
    );
}

export default CreatorProfileModal;

