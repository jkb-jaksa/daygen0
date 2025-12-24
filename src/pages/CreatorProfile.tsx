import { useState, useEffect, useCallback, Suspense, lazy, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Copy, RefreshCw, BookmarkPlus, BookmarkCheck, Heart, MoreHorizontal, Share2, Download, Edit } from 'lucide-react';
import { createPortal } from 'react-dom';
import { glass, layout } from '../styles/designSystem';
import { useAuth } from "../auth/useAuth";
import { createCardImageStyle } from '../utils/cardImageStyle';

const ModelBadge = lazy(() => import('../components/ModelBadge'));
const AspectRatioBadge = lazy(() => import('../components/shared/AspectRatioBadge'));
const ProfileFullView = lazy(() => import('../components/ProfileFullView'));
import { CountryFlag } from "../components/shared/CountryFlag";

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

interface ProfileGeneration {
    id: string;
    fileUrl: string;
    prompt?: string;
    model?: string;
    aspectRatio?: string;
    createdAt: string;
    isLiked?: boolean;
    likeCount?: number;
    likes?: number;
    type?: 'image' | 'video'; // Added to support video type if present in API response or inferred
}

interface ProfileData {
    user?: {
        authUserId: string;
        username?: string;
        profileImage?: string;
        bio?: string;
        country?: string;
    };
    items: ProfileGeneration[];
    totalCount: number;
    nextCursor: string | null;
}

// Helper to detect if a string is a UUID
const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

export default function CreatorProfile() {
    const { userId: userIdOrUsername } = useParams<{ userId: string }>();
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fullViewIndex, setFullViewIndex] = useState<number | null>(null);
    const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

    // Action menu states
    const [moreActionMenu, setMoreActionMenu] = useState<{ id: string; anchor: HTMLElement | null } | null>(null);
    const [recreateActionMenu, setRecreateActionMenu] = useState<{ id: string; anchor: HTMLElement | null } | null>(null);
    const [localLikedItems, setLocalLikedItems] = useState<Set<string>>(new Set());
    const [localSavedItems, setLocalSavedItems] = useState<Set<string>>(new Set());

    // Sort mode state (matching Explore section)
    const [sortMode, setSortMode] = useState<"recent" | "top">("recent");
    const [topSortOrder, setTopSortOrder] = useState<string[]>([]); // Store IDs in sorted order for stable top sorting

    const { token } = useAuth();
    const navigate = useNavigate();

    // Resolve username to userId if needed
    useEffect(() => {
        const resolveUser = async () => {
            if (!userIdOrUsername) return;

            // If it's already a UUID, use it directly
            if (isUUID(userIdOrUsername)) {
                setResolvedUserId(userIdOrUsername);
                return;
            }

            // Otherwise, treat it as a username and look it up
            try {
                const apiBase = import.meta.env.VITE_API_BASE_URL || '';
                const response = await fetch(`${apiBase}/api/users/by-username/${userIdOrUsername}`);

                if (response.ok) {
                    const userData = await response.json() as { id: string; username: string };
                    setResolvedUserId(userData.id);
                } else {
                    setError('User not found');
                    setResolvedUserId(null);
                }
            } catch (err) {
                console.error('Failed to resolve username:', err);
                setError('Failed to find user');
                setResolvedUserId(null);
            }
        };

        void resolveUser();
    }, [userIdOrUsername]);

    const fetchProfile = useCallback(async () => {
        if (!resolvedUserId) return;

        setIsLoading(true);
        setError(null);

        try {
            const apiBase = import.meta.env.VITE_API_BASE_URL || '';
            const headers: HeadersInit = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${apiBase}/api/r2files/public/user/${resolvedUserId}?limit=30`, {
                headers
            });

            if (!response.ok) {
                throw new Error('Failed to load profile');
            }

            const data = await response.json() as ProfileData;

            // Initialize local liked state
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
    }, [resolvedUserId, token]);

    const toggleLike = async (item: ProfileGeneration, e: React.MouseEvent) => {
        e.stopPropagation();
        (e.currentTarget as HTMLElement).blur();

        const isCurrentlyLiked = localLikedItems.has(item.id);

        setLocalLikedItems(prev => {
            const next = new Set(prev);
            if (isCurrentlyLiked) next.delete(item.id);
            else next.add(item.id);
            return next;
        });

        // Optimistic update
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
        if (resolvedUserId) {
            void fetchProfile();
        }
    }, [resolvedUserId, fetchProfile]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (fullViewIndex !== null) {
                    setFullViewIndex(null);
                }
            }
        };

        if (fullViewIndex !== null) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [fullViewIndex]);

    // Update the stable sort order when switching to Top mode or when items are initially loaded
    useEffect(() => {
        if (sortMode === "top" && topSortOrder.length === 0 && profileData?.items?.length) {
            // Initialize sort order when first entering Top mode
            const sortedIds = [...profileData.items]
                .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
                .map(item => item.id);
            setTopSortOrder(sortedIds);
        }
    }, [sortMode, topSortOrder.length, profileData?.items]);

    // Reset sort order when switching away from Top mode
    const handleSortModeChange = useCallback((mode: "recent" | "top") => {
        if (mode === "recent") {
            setTopSortOrder([]); // Clear sort order so it recalculates next time we enter Top
        } else if (mode === "top" && topSortOrder.length === 0 && profileData?.items?.length) {
            // Pre-calculate sort order when entering Top mode
            const sortedIds = [...profileData.items]
                .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
                .map(item => item.id);
            setTopSortOrder(sortedIds);
        }
        setSortMode(mode);
    }, [profileData?.items, topSortOrder.length]);

    // Use username (Profile URL) as primary display name
    const displayName = profileData?.user?.username || 'Creator';
    const profileImage = profileData?.user?.profileImage;
    const bio = profileData?.user?.bio;
    const userCountry = profileData?.user?.country;
    const generations = profileData?.items || [];

    // Sorted generations based on sortMode
    const sortedGenerations = useMemo(() => {
        if (sortMode === "top") {
            if (topSortOrder.length > 0) {
                // Use stable sort order - items keep their positions based on initial sort
                const orderMap = new Map(topSortOrder.map((id, index) => [id, index]));
                return [...generations].sort((a, b) => {
                    const aIndex = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
                    const bIndex = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
                    return aIndex - bIndex;
                });
            }
            // Fallback: sort by likes if no stable order yet
            return [...generations].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
        }
        // Recent: sort by createdAt descending (newest first)
        return [...generations].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [generations, sortMode, topSortOrder]);

    return (
        <div className={`${layout.page} min-h-screen pt-[calc(var(--nav-h,4rem)+1rem)] pb-20`}>
            <div className={layout.container}>
                {/* Profile Header */}
                <div className="mb-4 flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-4 sm:gap-6">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                        {profileImage ? (
                            <img
                                src={profileImage}
                                alt={displayName}
                                className="w-20 h-20 sm:w-28 sm:h-28 rounded-full object-cover border border-theme-dark"
                            />
                        ) : (
                            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-[conic-gradient(from_0deg,_rgba(245,158,11,0.6),_rgba(239,68,68,0.6),_rgba(59,130,246,0.6),_rgba(34,211,238,0.6),_rgba(245,158,11,0.6))] flex items-center justify-center border border-theme-dark">
                                <span className="text-3xl sm:text-4xl font-raleway font-medium text-theme-text">{displayName?.[0]?.toUpperCase() || '?'}</span>
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 pt-1">
                        <h1 className="text-2xl sm:text-3xl font-raleway font-normal text-theme-text mb-1 flex items-center gap-2">
                            {displayName}
                            {userCountry && <CountryFlag code={userCountry} size="lg" />}
                        </h1>
                        <p className="text-theme-white mb-1 font-raleway">
                            {profileData?.totalCount || 0} public generation{profileData?.totalCount !== 1 ? 's' : ''}
                        </p>
                        {bio && (
                            <p className="text-theme-light font-raleway leading-relaxed whitespace-pre-wrap max-w-2xl">
                                {bio}
                            </p>
                        )}
                    </div>
                </div>

                {/* Gallery Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 rounded-full border-2 border-theme-white/30 border-t-theme-white animate-spin" />
                            <p className="text-theme-white/50 text-sm font-raleway uppercase tracking-widest">Loading profile...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="text-red-400 text-lg font-raleway bg-red-500/10 px-6 py-4 rounded-xl border border-red-500/20">{error}</div>
                    </div>
                ) : generations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center bg-theme-black/20 rounded-3xl border border-theme-dark/30">
                        <User className="w-12 h-12 text-theme-white/20 mb-4" />
                        <p className="text-theme-white/60 font-raleway text-lg">No public generations yet</p>
                    </div>
                ) : (
                    <>
                        {/* Sort Controls */}
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <div className="inline-flex rounded-full border border-theme-dark/70 bg-theme-black/40 p-1">
                                <button
                                    type="button"
                                    aria-pressed={sortMode === 'recent'}
                                    onClick={() => handleSortModeChange('recent')}
                                    className={`px-4 py-1.5 text-xs font-medium font-raleway rounded-full transition-colors duration-200 ${sortMode === 'recent'
                                        ? 'bg-theme-text text-theme-black shadow-lg shadow-theme-text/20'
                                        : 'text-theme-white hover:text-theme-text'
                                        }`}
                                >
                                    Recent
                                </button>
                                <button
                                    type="button"
                                    aria-pressed={sortMode === 'top'}
                                    onClick={() => handleSortModeChange('top')}
                                    className={`px-4 py-1.5 text-xs font-medium font-raleway rounded-full transition-colors duration-200 ${sortMode === 'top'
                                        ? 'bg-theme-text text-theme-black shadow-lg shadow-theme-text/20'
                                        : 'text-theme-white hover:text-theme-text'
                                        }`}
                                >
                                    Top
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                            {sortedGenerations.map((item, index) => {
                                const isLiked = localLikedItems.has(item.id);
                                const isSaved = localSavedItems.has(item.id);
                                const isMenuActive = moreActionMenu?.id === item.id;
                                const isRecreateActive = recreateActionMenu?.id === item.id;

                                return (
                                    <div
                                        key={item.id}
                                        className="group relative flex flex-col overflow-hidden rounded-[24px] bg-theme-black border border-theme-dark hover:bg-theme-dark hover:border-theme-mid transition-all duration-100 cursor-pointer parallax-small shadow-lg"
                                        onClick={() => setFullViewIndex(index)}
                                    >
                                        <div
                                            className="relative aspect-square overflow-hidden card-media-frame"
                                            data-has-image={Boolean(item.fileUrl)}
                                            style={createCardImageStyle(item.fileUrl)}
                                        >
                                            <img
                                                src={item.fileUrl}
                                                alt={item.prompt || 'AI Generated'}
                                                className="relative z-[1] w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        </div>

                                        {/* Action Buttons Overlay */}
                                        <div className="image-gallery-actions absolute top-3 left-3 right-3 flex items-start gap-2 z-20 pointer-events-none">
                                            {/* Left: Recreate */}
                                            <div className={`relative transition-opacity duration-100 ${isRecreateActive
                                                ? 'opacity-100 pointer-events-auto'
                                                : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto'
                                                }`}>
                                                <button
                                                    type="button"
                                                    className="image-action-btn image-action-btn--labelled parallax-large"
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
                                                        className="relative overflow-hidden group/item flex w-full items-center gap-1.5 px-2 py-1.5 text-xs font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                                                        onClick={(e) => { e.stopPropagation(); handleRecreateEdit(item); }}
                                                    >
                                                        <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover/item:opacity-100" />
                                                        <Edit className="h-3.5 w-3.5 relative z-10" />
                                                        <span className="relative z-10">Edit image</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="relative overflow-hidden group/item flex w-full items-center gap-1.5 px-2 py-1.5 text-xs font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                                                        onClick={(e) => { e.stopPropagation(); handleRecreateUseAsReference(item); }}
                                                    >
                                                        <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover/item:opacity-100" />
                                                        <Copy className="h-3.5 w-3.5 relative z-10" />
                                                        <span className="relative z-10">Use as reference</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="relative overflow-hidden group/item flex w-full items-center gap-1.5 px-2 py-1.5 text-xs font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                                                        onClick={(e) => { e.stopPropagation(); handleRecreateRunPrompt(item); }}
                                                    >
                                                        <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover/item:opacity-100" />
                                                        <RefreshCw className="h-3.5 w-3.5 relative z-10" />
                                                        <span className="relative z-10">Run the same prompt</span>
                                                    </button>
                                                </ImageActionMenuPortal>
                                            </div>

                                            {/* Right: Save, Like, More */}
                                            <div className={`ml-auto flex items-center gap-1 transition-opacity duration-100 ${isMenuActive
                                                ? 'opacity-100 pointer-events-auto'
                                                : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto'
                                                }`}>
                                                <button
                                                    type="button"
                                                    onClick={(e) => toggleSave(item.id, e)}
                                                    className={`image-action-btn image-action-btn--labelled parallax-large ${isSaved ? 'border-theme-white/50 bg-theme-white/10 text-theme-text' : ''}`}
                                                >
                                                    {isSaved ? <BookmarkCheck className="size-3.5" /> : <BookmarkPlus className="size-3.5" />}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={(e) => toggleLike(item, e)}
                                                    className="image-action-btn image-action-btn--labelled parallax-large favorite-toggle"
                                                >
                                                    <Heart className={`size-3.5 transition-colors duration-200 ${isLiked ? 'fill-red-500 text-red-500' : 'text-current fill-none'}`} />
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
                                                            className="relative overflow-hidden group/item flex w-full items-center gap-1.5 px-2 py-1.5 text-xs font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                                                            onClick={(e) => { e.stopPropagation(); handleCopyLink(item.fileUrl); }}
                                                        >
                                                            <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover/item:opacity-100" />
                                                            <Share2 className="h-3.5 w-3.5 relative z-10" />
                                                            <span className="relative z-10">Copy link</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="relative overflow-hidden group/item flex w-full items-center gap-1.5 px-2 py-1.5 text-xs font-raleway text-theme-white transition-colors duration-200 hover:text-theme-text"
                                                            onClick={(e) => { e.stopPropagation(); handleDownload(item.fileUrl, item.id, item.model?.includes('video') ? 'video' : 'image'); }}
                                                        >
                                                            <div className="pointer-events-none absolute inset-0 bg-theme-white/10 rounded-lg transition-opacity duration-200 opacity-0 group-hover/item:opacity-100" />
                                                            <Download className="h-3.5 w-3.5 relative z-10" />
                                                            <span className="relative z-10">Download</span>
                                                        </button>
                                                    </ImageActionMenuPortal>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Prompt Bar Overlay */}
                                        <div className="PromptDescriptionBar absolute bottom-0 left-0 right-0 transition-opacity duration-100 opacity-0 group-hover:opacity-100 z-10">
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
                    </>
                )}
            </div>

            {/* Full View Modal */}
            {fullViewIndex !== null && (
                <Suspense fallback={null}>
                    <ProfileFullView
                        isOpen={true}
                        onClose={() => setFullViewIndex(null)}
                        initialIndex={fullViewIndex}
                        items={sortedGenerations}
                    />
                </Suspense>
            )}
        </div>
    );
}
