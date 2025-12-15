import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { X, User } from 'lucide-react';
import { createPortal } from 'react-dom';
import { glass } from '../styles/designSystem';

const ModelBadge = lazy(() => import('./ModelBadge'));
const AspectRatioBadge = lazy(() => import('./shared/AspectRatioBadge'));
const ProfileFullView = lazy(() => import('./ProfileFullView'));

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
}

interface ProfileData {
    user?: {
        displayName?: string;
        authUserId: string;
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

    const fetchProfile = useCallback(async () => {
        if (!userId) return;

        setIsLoading(true);
        setError(null);

        try {
            const apiBase = import.meta.env.VITE_API_BASE_URL || '';
            const response = await fetch(`${apiBase}/api/r2files/public/user/${userId}?limit=30`);

            if (!response.ok) {
                throw new Error('Failed to load profile');
            }

            const data = await response.json() as ProfileData;
            setProfileData(data);
        } catch (err) {
            setError('Failed to load creator profile');
            console.error('Profile fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

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

    const displayName = profileData?.user?.displayName || initialName || 'Creator';
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
                        <div className="flex items-center gap-4">
                            {profileImage ? (
                                <img
                                    src={profileImage}
                                    alt={displayName}
                                    className="w-16 h-16 rounded-full object-cover border-2 border-theme-dark/50 self-start"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/50 to-cyan-500/50 flex items-center justify-center border-2 border-theme-dark/50 self-start">
                                    <User className="w-8 h-8 text-theme-white/80" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h2 className="text-2xl font-raleway font-normal text-theme-text">{displayName}</h2>
                                <p className="text-sm text-theme-white/60 mb-2">
                                    {profileData?.totalCount || 0} public generation{profileData?.totalCount !== 1 ? 's' : ''}
                                </p>
                                {bio && (
                                    <p className="text-sm font-raleway text-theme-white/80 leading-relaxed max-w-2xl whitespace-pre-wrap">
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
                                {generations.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className="group relative overflow-hidden rounded-xl border border-theme-dark/50 hover:border-theme-mid transition-colors duration-200 aspect-square cursor-pointer"
                                        onClick={() => setFullViewIndex(index)}
                                    >
                                        <img
                                            src={item.fileUrl}
                                            alt={item.prompt || 'AI Generated'}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                        <div
                                            className="PromptDescriptionBar absolute bottom-0 left-0 right-0 transition-all duration-100 ease-in-out opacity-0 group-hover:opacity-100"
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
                                ))}
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

