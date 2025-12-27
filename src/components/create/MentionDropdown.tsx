import React, { useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { User, Package, BookmarkIcon, Fingerprint } from 'lucide-react';
import { glass } from '../../styles/designSystem';
import type { MentionItem, MentionType } from './hooks/useMentionSuggestions';

interface MentionDropdownProps {
    isOpen: boolean;
    suggestions: MentionItem[];
    selectedIndex: number;
    anchorRef: React.RefObject<HTMLTextAreaElement | null>;
    onSelect: (item: MentionItem) => void;
    onClose: () => void;
    setSelectedIndex: (index: number) => void;
    mentionType: MentionType | null;
    dropdownPosition?: 'above' | 'below';
}

export const MentionDropdown: React.FC<MentionDropdownProps> = ({
    isOpen,
    suggestions,
    selectedIndex,
    anchorRef,
    onSelect,
    onClose,
    setSelectedIndex,
    mentionType,
    dropdownPosition = 'above',
}) => {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = React.useState({ top: 0, left: 0 });

    // Position dropdown relative to textarea
    useEffect(() => {
        if (!isOpen || !anchorRef.current) return;

        const updatePosition = () => {
            const textarea = anchorRef.current;
            if (!textarea) return;

            const rect = textarea.getBoundingClientRect();
            // Position above or below the textarea based on dropdownPosition prop
            if (dropdownPosition === 'below') {
                setPosition({
                    top: rect.bottom + 8, // 8px gap below
                    left: rect.left,
                });
            } else {
                setPosition({
                    top: rect.top - 8, // 8px gap above
                    left: rect.left,
                });
            }
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen, anchorRef, dropdownPosition]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                anchorRef.current &&
                !anchorRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose, anchorRef]);

    // Disable body scroll when dropdown is open
    useEffect(() => {
        if (!isOpen) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen]);

    // Scroll selected item into view
    useEffect(() => {
        if (!isOpen || !dropdownRef.current) return;

        const selectedElement = dropdownRef.current.querySelector(`[data-index="${selectedIndex}"]`);
        if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [isOpen, selectedIndex]);

    // Group suggestions by type for @ trigger (avatars + products)
    const groupedSuggestions = useMemo(() => {
        // For savedPrompt type (/ trigger), no grouping needed
        if (mentionType === 'savedPrompt') {
            return { type: 'savedPrompt' as const, items: suggestions };
        }

        // For @ trigger (null mentionType means mixed avatars + products)
        if (mentionType === null) {
            const avatars = suggestions.filter(s => s.type === 'avatar');
            const products = suggestions.filter(s => s.type === 'product');
            return { type: 'mixed' as const, avatars, products };
        }

        // Single type (legacy, shouldn't happen with new logic)
        return { type: 'single' as const, items: suggestions };
    }, [suggestions, mentionType]);

    if (!isOpen || suggestions.length === 0) return null;

    const renderItem = (item: MentionItem, index: number) => (
        <button
            key={`${item.type}-${item.id}`}
            data-index={index}
            type="button"
            onClick={() => onSelect(item)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={`w-full flex items-center gap-3 px-2 py-2 text-left transition-colors duration-75 rounded-lg ${index === selectedIndex
                ? 'bg-theme-text/20 text-theme-text'
                : 'text-theme-white hover:bg-theme-text/10 hover:text-theme-text'
                }`}
        >
            {/* Thumbnail or Icon */}
            <div className="w-8 h-8 flex-shrink-0 rounded-lg overflow-hidden bg-theme-dark">
                {item.type === 'savedPrompt' ? (
                    <div className="w-full h-full flex items-center justify-center">
                        <BookmarkIcon className="w-4 h-4 text-theme-white/40" />
                    </div>
                ) : item.imageUrl ? (
                    <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        {item.type === 'product' ? (
                            <Package className="w-4 h-4 text-theme-white/40" />
                        ) : (
                            <User className="w-4 h-4 text-theme-white/40" />
                        )}
                    </div>
                )}
            </div>

            {/* Name/Text */}
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-raleway truncate flex items-center gap-1.5 ${item.type === 'savedPrompt' ? 'italic' : ''}`}>
                    {item.name}
                    {item.isMe && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-theme-text/20 px-2 py-0.5 text-[10px] font-medium text-theme-text">
                            <Fingerprint className="w-2.5 h-2.5" />
                            Me
                        </span>
                    )}
                </p>
            </div>
        </button>
    );

    return createPortal(
        <div
            ref={dropdownRef}
            className={`${glass.promptDark} fixed z-[9999] min-w-[220px] max-w-[350px] max-h-[300px] overflow-y-auto overscroll-contain scroll-smooth rounded-xl shadow-lg border border-theme-mid/30`}
            style={{
                top: position.top,
                left: position.left,
                transform: dropdownPosition === 'below' ? 'none' : 'translateY(-100%)',
            }}
        >
            <div className="py-2 px-2">
                {/* Saved Prompts (/ trigger) */}
                {groupedSuggestions.type === 'savedPrompt' && (
                    <>
                        <div className="px-2 py-1.5 text-sm font-raleway font-medium text-theme-text">
                            Saved Prompts
                        </div>
                        <div className="space-y-1">
                            {groupedSuggestions.items.map((item, index) => renderItem(item, index))}
                        </div>
                    </>
                )}

                {/* Mixed Avatars + Products (@ trigger) */}
                {groupedSuggestions.type === 'mixed' && (
                    <>
                        {groupedSuggestions.avatars.length > 0 && (
                            <>
                                <div className="px-2 py-1.5 text-sm font-raleway font-normal text-theme-text flex items-center gap-2">
                                    <User className="w-3.5 h-3.5" />
                                    Avatars
                                </div>
                                <div className="space-y-1">
                                    {groupedSuggestions.avatars.map((item, index) => renderItem(item, index))}
                                </div>
                            </>
                        )}
                        {groupedSuggestions.products.length > 0 && (
                            <>
                                <div className={`px-2 py-1.5 text-sm font-raleway font-normal text-theme-text flex items-center gap-2 ${groupedSuggestions.avatars.length > 0 ? 'mt-2 pt-2 border-t border-theme-mid/20' : ''}`}>
                                    <Package className="w-3.5 h-3.5" />
                                    Products
                                </div>
                                <div className="space-y-1">
                                    {groupedSuggestions.products.map((item, index) =>
                                        renderItem(item, groupedSuggestions.avatars.length + index)
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* Single type (legacy fallback) */}
                {groupedSuggestions.type === 'single' && (
                    <>
                        <div className="px-2 py-1.5 text-sm font-raleway font-medium text-theme-text">
                            {mentionType === 'product' ? 'Products' : mentionType === 'avatar' ? 'Avatars' : 'Suggestions'}
                        </div>
                        <div className="space-y-1">
                            {groupedSuggestions.items.map((item, index) => renderItem(item, index))}
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
};

export default MentionDropdown;
