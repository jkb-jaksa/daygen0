import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { StoredAvatar } from '../../avatars/types';
import type { StoredProduct } from '../../products/types';
import type { SavedPrompt } from '../../../lib/savedPrompts';

export type MentionType = 'avatar' | 'product' | 'savedPrompt';

export interface MentionItem {
    id: string;
    name: string;
    imageUrl: string;
    type: MentionType;
    // For saved prompts, this contains the full prompt text
    promptText?: string;
}

export interface ParsedMention {
    name: string;
    type: 'avatar' | 'product'; // savedPrompts don't stay as parsed mentions
    startIndex: number;
    endIndex: number;
}

interface UseMentionSuggestionsOptions {
    storedAvatars: StoredAvatar[];
    storedProducts: StoredProduct[];
    savedPrompts?: SavedPrompt[];
    prompt: string;
    cursorPosition: number;
    onSelectAvatar: (avatar: StoredAvatar) => void;
    onDeselectAvatar: (avatarId: string) => void;
    selectedAvatars: StoredAvatar[];
    onSelectProduct: (product: StoredProduct) => void;
    onDeselectProduct: (productId: string) => void;
    selectedProducts: StoredProduct[];
    onSelectSavedPrompt?: (savedPrompt: SavedPrompt) => void;
}

// Helper to escape special regex characters in names
const escapeRegex = (str: string): string =>
    str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function useMentionSuggestions({
    storedAvatars,
    storedProducts,
    savedPrompts = [],
    prompt,
    cursorPosition,
    onSelectAvatar,
    onDeselectAvatar,
    selectedAvatars,
    onSelectProduct,
    onDeselectProduct,
    selectedProducts,
    onSelectSavedPrompt,
}: UseMentionSuggestionsOptions) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTrigger, setActiveTrigger] = useState<'@' | '/' | null>(null);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);

    // Track previously detected mentions to handle removal
    const previousMentionsRef = useRef<ParsedMention[]>([]);

    // Parse all mentions from prompt by matching against known avatar/product names
    // Now both avatars AND products use @ prefix
    const parsedMentions = useMemo((): ParsedMention[] => {
        const mentions: ParsedMention[] = [];

        // 1. Check Avatars (@) - UNCHANGED
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

        // 2. Check Products (@) - NOW ALSO USES @ PREFIX
        for (const product of storedProducts) {
            const mentionPattern = new RegExp(
                `@${escapeRegex(product.name)}(?=\\s|@|/|\\n|$)`,
                'gi'
            );

            let match;
            while ((match = mentionPattern.exec(prompt)) !== null) {
                // Avoid duplicate if avatar has same name (shouldn't happen with validation)
                const alreadyAdded = mentions.some(
                    m => m.startIndex === match!.index && m.endIndex === match!.index + match![0].length
                );
                if (!alreadyAdded) {
                    mentions.push({
                        name: product.name,
                        type: 'product',
                        startIndex: match.index,
                        endIndex: match.index + match[0].length,
                    });
                }
            }
        }

        // Sort by position
        mentions.sort((a, b) => a.startIndex - b.startIndex);

        return mentions;
    }, [prompt, storedAvatars, storedProducts]);

    // Get suggestions list based on active trigger (@ or /)
    // @ shows BOTH avatars AND products (grouped)
    // / shows saved prompts
    const suggestions = useMemo((): MentionItem[] => {
        if (!activeTrigger) return [];

        const lowerQuery = query.toLowerCase().trim();
        const items: MentionItem[] = [];

        if (activeTrigger === '@') {
            // Show BOTH Avatars AND Products with @ trigger
            // Avatars first
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
            // Then Products
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
        } else if (activeTrigger === '/') {
            // Show Saved Prompts with / trigger
            for (const savedPrompt of savedPrompts) {
                // Search in prompt text
                if (!lowerQuery || savedPrompt.text.toLowerCase().includes(lowerQuery)) {
                    // Generate a display name from the prompt (first 30 chars)
                    const displayName = savedPrompt.text.length > 40
                        ? savedPrompt.text.slice(0, 40) + '...'
                        : savedPrompt.text;
                    items.push({
                        id: savedPrompt.id,
                        name: displayName,
                        imageUrl: '', // Saved prompts don't have images
                        type: 'savedPrompt',
                        promptText: savedPrompt.text,
                    });
                }
            }
        }

        return items;
    }, [query, storedAvatars, storedProducts, savedPrompts, activeTrigger]);

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
            // Check avatars first
            const exactAvatarMatch = storedAvatars.find(
                a => a.name.toLowerCase() === queryLower
            );
            if (exactAvatarMatch) {
                return {
                    id: exactAvatarMatch.id,
                    name: exactAvatarMatch.name,
                    imageUrl: exactAvatarMatch.imageUrl,
                    type: 'avatar',
                };
            }
            // Then check products
            const exactProductMatch = storedProducts.find(
                p => p.name.toLowerCase() === queryLower
            );
            if (exactProductMatch) {
                return {
                    id: exactProductMatch.id,
                    name: exactProductMatch.name,
                    imageUrl: exactProductMatch.imageUrl,
                    type: 'product',
                };
            }
        }
        // No auto-complete for saved prompts on space

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

        // Check if this trigger is part of an already completed mention (only for @, not /)
        if (triggerChar === '@') {
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

        // Handle saved prompt selection differently
        if (item.type === 'savedPrompt') {
            // Replace entirety from mentionStartIndex to end with the saved prompt text
            const beforeMention = prompt.slice(0, mentionStartIndex);
            const savedPromptText = item.promptText || item.name;
            const newPrompt = beforeMention + savedPromptText;
            const newCursorPos = newPrompt.length;

            // Call the callback if provided
            if (onSelectSavedPrompt && item.promptText) {
                const savedPrompt: SavedPrompt = {
                    id: item.id,
                    text: item.promptText,
                    savedAt: Date.now(),
                };
                onSelectSavedPrompt(savedPrompt);
            }

            setIsOpen(false);
            setQuery('');
            setMentionStartIndex(null);
            setActiveTrigger(null);

            return { newPrompt, newCursorPos };
        }

        // For avatars and products, both now use @ prefix
        const prefix = '@';

        // Insert name with @ prefix
        const beforeMention = prompt.slice(0, mentionStartIndex);
        const afterCursor = prompt.slice(cursorPosition);
        const mentionText = `${prefix}${item.name} `;
        const newPrompt = beforeMention + mentionText + afterCursor;
        const newCursorPos = mentionStartIndex + mentionText.length;

        // Select the entity
        if (item.type === 'avatar') {
            const avatar = storedAvatars.find(a => a.id === item.id);
            if (avatar) onSelectAvatar(avatar);
        } else if (item.type === 'product') {
            const product = storedProducts.find(p => p.id === item.id);
            if (product) onSelectProduct(product);
        }

        setIsOpen(false);
        setQuery('');
        setMentionStartIndex(null);
        setActiveTrigger(null);

        return { newPrompt, newCursorPos };
    }, [mentionStartIndex, prompt, cursorPosition, storedAvatars, storedProducts, onSelectAvatar, onSelectProduct, onSelectSavedPrompt]);

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

    // Determine current mention type for UI display
    // @ can be avatar or product, / is savedPrompt
    const currentMentionType = useMemo((): MentionType | null => {
        if (activeTrigger === '@') {
            // For @ trigger, we return null to indicate mixed type (avatars + products)
            // The UI will handle showing section headers
            return null;
        } else if (activeTrigger === '/') {
            return 'savedPrompt';
        }
        return null;
    }, [activeTrigger]);

    return {
        isOpen,
        suggestions,
        selectedIndex,
        query,
        mentionStartIndex,
        activeTrigger,
        parsedMentions,
        currentMentionType,
        selectSuggestion,
        handleKeyDown,
        closeSuggestions,
        setSelectedIndex,
        checkForSpaceComplete,
    };
}
