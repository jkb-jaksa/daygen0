import React, { useState, useCallback, useMemo } from 'react';
import { Fingerprint } from 'lucide-react';
import MakeVideoModal, { type MakeVideoOptions } from '../create/MakeVideoModal';
import type { StoredAvatar } from './types';

interface MakeVideoAvatarModalProps {
    isOpen: boolean;
    onClose: () => void;
    avatar: StoredAvatar;
    onSubmit: (options: MakeVideoOptions) => void;
    isLoading?: boolean;
}

/**
 * Avatar-specific video creation modal.
 * Wraps MakeVideoModal with a custom overlay showing avatar name and image thumbnails.
 */
const MakeVideoAvatarModal: React.FC<MakeVideoAvatarModalProps> = ({
    isOpen,
    onClose,
    avatar,
    onSubmit,
    isLoading = false,
}) => {
    // Track currently selected avatar image URL
    const [selectedImageUrl, setSelectedImageUrl] = useState<string>(() => {
        // Default to primary image or first image
        const primaryImage = avatar.images.find(img => img.id === avatar.primaryImageId);
        return primaryImage?.url || avatar.imageUrl || avatar.images[0]?.url || '';
    });

    // Get all avatar images (max 5)
    const avatarImages = useMemo(() => {
        return avatar.images.slice(0, 5);
    }, [avatar.images]);

    // Handle thumbnail click
    const handleThumbnailClick = useCallback((imageUrl: string) => {
        setSelectedImageUrl(imageUrl);
    }, []);

    // Custom overlay with avatar name and image thumbnails
    const customDescriptionOverlay = useMemo(() => (
        <div className="flex flex-col items-start gap-3">
            {/* Avatar Name with Me Badge */}
            <h3 className="text-base font-raleway font-normal text-theme-text flex items-center gap-2">
                {avatar.name}
                {avatar.isMe && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-theme-text/20 px-3 py-0 text-[10px] font-medium text-theme-text">
                        <Fingerprint className="w-3 h-3" />
                        Me
                    </span>
                )}
            </h3>

            {/* Image Thumbnails Grid */}
            {avatarImages.length > 1 && (
                <div className="flex gap-2">
                    {avatarImages.map((image, index) => (
                        <button
                            key={image.id}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleThumbnailClick(image.url);
                            }}
                            className={`
                                relative w-10 h-10 rounded-lg overflow-hidden transition-all duration-150
                                hover:scale-105 focus:outline-none
                                ${selectedImageUrl === image.url
                                    ? 'border border-theme-text'
                                    : 'border border-theme-dark hover:border-theme-mid'
                                }
                            `}
                            aria-label={`Select avatar image ${index + 1}`}
                            title={`Image ${index + 1}`}
                        >
                            <img
                                src={image.url}
                                alt={`${avatar.name} - ${index + 1}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    ), [avatar.name, avatar.isMe, avatarImages, selectedImageUrl, handleThumbnailClick]);

    // Custom title for avatar-specific modal
    const customTitle = useMemo(() => (
        <span className="flex items-center gap-2">
            Create with {avatar.name}
            {avatar.isMe && (
                <span className="inline-flex items-center gap-1 rounded-full bg-theme-text/20 px-3 py-0 text-[12px] font-medium text-theme-text">
                    <Fingerprint className="w-3 h-3" />
                    Me
                </span>
            )}
        </span>
    ), [avatar.name, avatar.isMe]);

    // Handle submit - add avatar info to options
    const handleSubmit = useCallback((options: MakeVideoOptions) => {
        onSubmit({
            ...options,
            avatarId: avatar.id,
            avatarImageUrl: selectedImageUrl,
            avatarIds: [avatar.id],
            avatarImageUrls: [selectedImageUrl],
        });
    }, [onSubmit, avatar.id, selectedImageUrl]);

    return (
        <MakeVideoModal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={handleSubmit}
            imageUrl={selectedImageUrl}
            isLoading={isLoading}
            customDescriptionOverlay={customDescriptionOverlay}
            customTitle={customTitle}
            initialAvatar={avatar}
            lockedAvatarId={avatar.id}
        />
    );
};

export default MakeVideoAvatarModal;
