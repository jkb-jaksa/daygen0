import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { StoredAvatar } from '../../avatars/types';
import type { StoredProduct } from '../../products/types';

export type MentionType = 'avatar' | 'product';

export interface MentionItem {
    id: string;
    name: string;
    imageUrl: string;
    type: MentionType;
}

export interface ParsedMention {
    name: string;
    type: MentionType;
    startIndex: number;
    endIndex: number;
}

interface UseMentionSuggestionsOptions {
    storedAvatars: StoredAvatar[];
    storedProducts: StoredProduct[];
    prompt: string;
    cursorPosition: number;
    onSelectAvatar: (avatar: StoredAvatar) => void;
    onDeselectAvatar: (avatarId: string) => void;
    selectedAvatars: StoredAvatar[];
    onSelectProduct: (product: StoredProduct) => void;
    onDeselectProduct: (productId: string) => void;
    selectedProducts: StoredProduct[];
}

// Helper to escape special regex characters in names
const escapeRegex = (str: string): string =>
    str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function useMentionSuggestions({
    storedAvatars,
    storedProducts,
    prompt,
    cursorPosition,
    onSelectAvatar,
    onDeselectAvatar,
    selectedAvatars,
    onSelectProduct,
    onDeselectProduct,
    selectedProducts,
}: UseMentionSuggestionsOptions) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTrigger, setActiveTrigger] = useState<'@' | '/' | null>(null);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);

    // Track previously detected mentions to handle removal
    const previousMentionsRef = useRef<ParsedMention[]>([]);

    // Parse all mentions from prompt by matching against known avatar/product names
    const parsedMentions = useMemo((): ParsedMention[] => {
        const mentions: ParsedMention[] = [];

        // 1. Check Avatars (@)
        for (const avatar of storedAvatars) {
            const mentionPattern = new RegExp(
                `@${escapeRegex(avatar.name)}(?=\\s|@|/|\\n|$)`,
                'gi'
            );

            let match;
            while ((match = mentionPattern.exec(prompt)) !== null) {
                mentions.push({
                    name: avatar.name,
                    type: 'avatar',
                    startIndex: match.index,
                    endIndex: match.index + match[0].length,
                });
            }
        }

        // 2. Check Products (/)
        for (const product of storedProducts) {
            const mentionPattern = new RegExp(
                `/${escapeRegex(product.name)}(?=\\s|@|/|\\n|$)`,
                'gi'
            );

            let match;
            while ((match = mentionPattern.exec(prompt)) !== null) {
                mentions.push({
                    name: product.name,
                    type: 'product',
                    startIndex: match.index,
                    endIndex: match.index + match[0].length,
                });
            }
        }

        // Sort by position
        mentions.sort((a, b) => a.startIndex - b.startIndex);

        return mentions;
    }, [prompt, storedAvatars, storedProducts]);

    // Get suggestions list based on active trigger (@ or /)
    const suggestions = useMemo((): MentionItem[] => {
        if (!activeTrigger) return [];

        const lowerQuery = query.toLowerCase().trim();
        const items: MentionItem[] = [];

        if (activeTrigger === '@') {
            // Avatars
            for (const avatar of storedAvatars) {
                if (!lowerQuery || avatar.name.toLowerCase().includes(lowerQuery)) {
                    items.push({
                        id: avatar.id,
                        name: avatar.name,
                        imageUrl: avatar.imageUrl,
                        type: 'avatar',
                    });
                }
            }
        } else if (activeTrigger === '/') {
            // Products
            for (const product of storedProducts) {
                if (!lowerQuery || product.name.toLowerCase().includes(lowerQuery)) {
                    items.push({
                        id: product.id,
                        name: product.name,
                        imageUrl: product.imageUrl,
                        type: 'product',
                    });
                }
            }
        }

        return items;
    }, [query, storedAvatars, storedProducts, activeTrigger]);

    // Check if user typed an exact match (optionally followed by space) - auto-select
    const checkForSpaceComplete = useCallback((): MentionItem | null => {
        if (mentionStartIndex === null || !activeTrigger) return null;

        // Get query without trailing space
        const trimmedQuery = query.trimEnd();
        const hasTrailingSpace = query !== trimmedQuery && query.endsWith(' ');

        // Only trigger on space
        if (!hasTrailingSpace) return null;

        const queryLower = trimmedQuery.toLowerCase();
        if (!queryLower) return null;

        if (activeTrigger === '@') {
            const exactMatch = storedAvatars.find(
                a => a.name.toLowerCase() === queryLower
            );
            if (exactMatch) {
                return {
                    id: exactMatch.id,
                    name: exactMatch.name,
                    imageUrl: exactMatch.imageUrl,
                    type: 'avatar',
                };
            }
        } else if (activeTrigger === '/') {
            const exactMatch = storedProducts.find(
                p => p.name.toLowerCase() === queryLower
            );
            if (exactMatch) {
                return {
                    id: exactMatch.id,
                    name: exactMatch.name,
                    imageUrl: exactMatch.imageUrl,
                    type: 'product',
                };
            }
        }

        return null;
    }, [query, mentionStartIndex, activeTrigger, storedAvatars, storedProducts]);

    // Detect @ or / being typed and show suggestions
    useEffect(() => {
        const textBeforeCursor = prompt.slice(0, cursorPosition);

        // Check for both triggers
        const lastAt = textBeforeCursor.lastIndexOf('@');
        const lastSlash = textBeforeCursor.lastIndexOf('/');

        // Find the closest trigger
        const lastTriggerIndex = Math.max(lastAt, lastSlash);

        if (lastTriggerIndex === -1) {
            setIsOpen(false);
            setQuery('');
            setMentionStartIndex(null);
            setActiveTrigger(null);
            return;
        }

        const triggerChar = textBeforeCursor[lastTriggerIndex] as '@' | '/';

        // Check if there's a newline between trigger and cursor
        const textAfterTrigger = textBeforeCursor.slice(lastTriggerIndex + 1);
        if (textAfterTrigger.includes('\n')) {
            setIsOpen(false);
            setQuery('');
            setMentionStartIndex(null);
            setActiveTrigger(null);
            return;
        }

        // Check if this trigger is part of an already completed mention
        const isCompletedMention = parsedMentions.some(
            m => m.startIndex === lastTriggerIndex && cursorPosition > m.endIndex
        );

        if (isCompletedMention) {
            setIsOpen(false);
            setQuery('');
            setMentionStartIndex(null);
            setActiveTrigger(null);
            return;
        }

        // We're typing a mention
        setMentionStartIndex(lastTriggerIndex);
        setQuery(textAfterTrigger);
        setIsOpen(true);
        setActiveTrigger(triggerChar);
        setSelectedIndex(0);
    }, [prompt, cursorPosition, parsedMentions]);

    // Sync mentions with selection state - handle both additions and removals
    useEffect(() => {
        const previousMentions = previousMentionsRef.current;

        // 1. ADDITIONS
        for (const mention of parsedMentions) {
            const wasAlreadyMentioned = previousMentions.some(
                m => m.name.toLowerCase() === mention.name.toLowerCase() && m.type === mention.type
            );

            if (!wasAlreadyMentioned) {
                if (mention.type === 'avatar') {
                    const avatar = storedAvatars.find(
                        a => a.name.toLowerCase() === mention.name.toLowerCase()
                    );
                    if (avatar && !selectedAvatars.some(a => a.id === avatar.id)) {
                        onSelectAvatar(avatar);
                    }
                } else if (mention.type === 'product') {
                    const product = storedProducts.find(
                        p => p.name.toLowerCase() === mention.name.toLowerCase()
                    );
                    if (product && !selectedProducts.some(p => p.id === product.id)) {
                        onSelectProduct(product);
                    }
                }
            }
        }

        // 2. REMOVALS
        for (const prevMention of previousMentions) {
            const stillExists = parsedMentions.some(
                m => m.name.toLowerCase() === prevMention.name.toLowerCase() && m.type === prevMention.type
            );

            if (!stillExists) {
                if (prevMention.type === 'avatar') {
                    const avatar = storedAvatars.find(
                        a => a.name.toLowerCase() === prevMention.name.toLowerCase()
                    );
                    if (avatar && selectedAvatars.some(a => a.id === avatar.id)) {
                        onDeselectAvatar(avatar.id);
                    }
                } else if (prevMention.type === 'product') {
                    const product = storedProducts.find(
                        p => p.name.toLowerCase() === prevMention.name.toLowerCase()
                    );
                    if (product && selectedProducts.some(p => p.id === product.id)) {
                        onDeselectProduct(product.id);
                    }
                }
            }
        }

        previousMentionsRef.current = parsedMentions;
    }, [
        parsedMentions,
        storedAvatars,
        storedProducts,
        selectedAvatars,
        selectedProducts,
        onSelectAvatar,
        onDeselectAvatar,
        onSelectProduct,
        onDeselectProduct
    ]);

    // Handle selecting a suggestion
    const selectSuggestion = useCallback((item: MentionItem): { newPrompt: string; newCursorPos: number } | null => {
        if (mentionStartIndex === null) return null;

        const prefix = item.type === 'avatar' ? '@' : '/';

        // Insert name with correct prefix
        const beforeMention = prompt.slice(0, mentionStartIndex);
        const afterCursor = prompt.slice(cursorPosition);
        const mentionText = `${prefix}${item.name} `;
        const newPrompt = beforeMention + mentionText + afterCursor;
        const newCursorPos = mentionStartIndex + mentionText.length;

        // Select the entity
        if (item.type === 'avatar') {
            const avatar = storedAvatars.find(a => a.id === item.id);
            if (avatar) onSelectAvatar(avatar);
        } else {
            const product = storedProducts.find(p => p.id === item.id);
            if (product) onSelectProduct(product);
        }

        setIsOpen(false);
        setQuery('');
        setMentionStartIndex(null);
        setActiveTrigger(null);

        return { newPrompt, newCursorPos };
    }, [mentionStartIndex, prompt, cursorPosition, storedAvatars, storedProducts, onSelectAvatar, onSelectProduct]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((event: React.KeyboardEvent): boolean => {
        if (!isOpen || suggestions.length === 0) return false;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setSelectedIndex(prev => (prev + 1) % suggestions.length);
                return true;
            case 'ArrowUp':
                event.preventDefault();
                setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
                return true;
            case 'Enter':
            case 'Tab':
                if (suggestions[selectedIndex]) {
                    event.preventDefault();
                    return true;
                }
                return false;
            case 'Escape':
                event.preventDefault();
                setIsOpen(false);
                return true;
            default:
                return false;
        }
    }, [isOpen, suggestions, selectedIndex]);

    const closeSuggestions = useCallback(() => {
        setIsOpen(false);
        setQuery('');
        setMentionStartIndex(null);
        setActiveTrigger(null);
    }, []);

    return {
        isOpen,
        suggestions,
        selectedIndex,
        query,
        mentionStartIndex,
        activeTrigger,
        parsedMentions,
        currentMentionType: activeTrigger === '@' ? 'avatar' : activeTrigger === '/' ? 'product' : null,
        selectSuggestion,
        handleKeyDown,
        closeSuggestions,
        setSelectedIndex,
        checkForSpaceComplete,
    };
}
