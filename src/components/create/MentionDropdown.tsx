import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User } from 'lucide-react';
import { glass } from '../../styles/designSystem';
import type { MentionItem } from './hooks/useMentionSuggestions';

interface MentionDropdownProps {
    isOpen: boolean;
    suggestions: MentionItem[];
    selectedIndex: number;
    anchorRef: React.RefObject<HTMLTextAreaElement>;
    onSelect: (item: MentionItem) => void;
    onClose: () => void;
    setSelectedIndex: (index: number) => void;
}

export const MentionDropdown: React.FC<MentionDropdownProps> = ({
    isOpen,
    suggestions,
    selectedIndex,
    anchorRef,
    onSelect,
    onClose,
    setSelectedIndex,
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
            // Position above the textarea
            setPosition({
                top: rect.top - 8, // 8px gap above
                left: rect.left,
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

    // Scroll selected item into view
    useEffect(() => {
        if (!isOpen || !dropdownRef.current) return;

        const selectedElement = dropdownRef.current.querySelector(`[data-index="${selectedIndex}"]`);
        if (selectedElement) {
            selectedElement.scrollIntoView({ block: 'nearest' });
        }
    }, [isOpen, selectedIndex]);

    if (!isOpen || suggestions.length === 0) return null;

    return createPortal(
        <div
            ref={dropdownRef}
            className={`${glass.promptDark} fixed z-[9999] min-w-[220px] max-w-[300px] max-h-[240px] overflow-y-auto rounded-xl shadow-lg border border-theme-mid/30`}
            style={{
                top: position.top,
                left: position.left,
                transform: 'translateY(-100%)',
            }}
        >
            <div className="py-2 px-2">
                <div className="px-2 py-1.5 text-sm font-raleway font-medium text-theme-text">
                    Avatars
                </div>
                <div className="space-y-1">
                    {suggestions.map((item, index) => (
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
                            {/* Thumbnail */}
                            <div className="w-8 h-8 flex-shrink-0 rounded-lg overflow-hidden bg-theme-dark">
                                {item.imageUrl ? (
                                    <img
                                        src={item.imageUrl}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <User className="w-4 h-4 text-theme-white/40" />
                                    </div>
                                )}
                            </div>

                            {/* Name only (no type since it's always avatar) */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-raleway truncate">{item.name}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default MentionDropdown;
