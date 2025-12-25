import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';
import { glass } from '../../styles/designSystem';
import type { StoredAvatar, AvatarImage } from './types';

interface AvatarImagePopoverProps {
    avatar: StoredAvatar;
    selectedImageId: string | null;
    onSelectImage: (avatarId: string, imageId: string) => void;
    onRemove: (avatarId: string) => void;
    onClose: () => void;
    anchorRef: React.RefObject<HTMLElement | null>;
    isOpen: boolean;
}

export const AvatarImagePopover: React.FC<AvatarImagePopoverProps> = ({
    avatar,
    selectedImageId,
    onSelectImage,
    onRemove,
    onClose,
    anchorRef,
    isOpen,
}) => {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0, transform: 'translateY(0)' });

    // Position popover relative to anchor
    useEffect(() => {
        if (!isOpen || !anchorRef.current) return;

        const updatePosition = () => {
            const anchor = anchorRef.current;
            if (!anchor) return;

            const rect = anchor.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const popoverHeight = 280; // Approximate height

            const spaceAbove = rect.top;
            const spaceBelow = viewportHeight - rect.bottom;
            const shouldPositionAbove = spaceAbove > spaceBelow && spaceAbove > popoverHeight;

            const verticalOffset = 8;

            setPosition({
                top: shouldPositionAbove ? rect.top - verticalOffset : rect.bottom + verticalOffset,
                left: rect.left + rect.width / 2,
                transform: shouldPositionAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen, anchorRef]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target as Node) &&
                anchorRef.current &&
                !anchorRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, anchorRef]);

    // Get the currently selected image (or fallback to primary/first)
    const currentImageId = useMemo(() => {
        if (selectedImageId) return selectedImageId;
        return avatar.primaryImageId ?? avatar.images[0]?.id ?? null;
    }, [selectedImageId, avatar]);

    const handleImageClick = useCallback((imageId: string) => {
        onSelectImage(avatar.id, imageId);
        // Don't close - let user see selection change
    }, [avatar.id, onSelectImage]);

    const handleRemoveClick = useCallback(() => {
        onRemove(avatar.id);
        onClose();
    }, [avatar.id, onRemove, onClose]);

    if (!isOpen || avatar.images.length === 0) return null;

    return createPortal(
        <div
            ref={popoverRef}
            className={`${glass.promptDark} fixed z-[9999] w-64 rounded-2xl shadow-2xl overflow-hidden`}
            style={{
                top: position.top,
                left: position.left,
                transform: position.transform,
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="px-4 py-3 border-b border-theme-mid/20 flex items-center justify-between">
                <h3 className="text-sm font-raleway font-medium text-theme-text truncate">
                    {avatar.name}
                </h3>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1 text-theme-white hover:text-theme-text transition-colors"
                    aria-label="Close"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Image Grid */}
            <div className="p-3 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-3 gap-2">
                    {avatar.images.map((image: AvatarImage) => {
                        const isSelected = image.id === currentImageId;
                        return (
                            <button
                                key={image.id}
                                type="button"
                                onClick={() => handleImageClick(image.id)}
                                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all duration-150 ${isSelected
                                        ? 'border-theme-text ring-2 ring-theme-text/30'
                                        : 'border-transparent hover:border-theme-mid'
                                    }`}
                            >
                                <img
                                    src={image.url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                                {isSelected && (
                                    <div className="absolute inset-0 bg-theme-text/20 flex items-center justify-center">
                                        <Check className="w-5 h-5 text-theme-text" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-theme-mid/20">
                <button
                    type="button"
                    onClick={handleRemoveClick}
                    className="w-full py-2 text-sm font-raleway text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                >
                    Remove from prompt
                </button>
            </div>
        </div>,
        document.body
    );
};

export default AvatarImagePopover;
