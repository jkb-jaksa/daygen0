import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { StoredAvatar } from '../../avatars/types';

export type MentionType = 'avatar';

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
    prompt: string;
    cursorPosition: number;
    onSelectAvatar: (avatar: StoredAvatar) => void;
    onDeselectAvatar: (avatarId: string) => void;
    selectedAvatars: StoredAvatar[];
}

// Helper to escape special regex characters in avatar names
const escapeRegex = (str: string): string =>
    str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function useMentionSuggestions({
    storedAvatars,
    prompt,
    cursorPosition,
    onSelectAvatar,
    onDeselectAvatar,
    selectedAvatars,
}: UseMentionSuggestionsOptions) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);

    // Track previously detected mentions to handle removal
    const previousMentionsRef = useRef<ParsedMention[]>([]);

    // Parse all mentions from prompt by matching against known avatar names
    // This approach handles any characters in avatar names
    const parsedMentions = useMemo((): ParsedMention[] => {
        const mentions: ParsedMention[] = [];

        // For each stored avatar, check if it's mentioned in the prompt
        for (const avatar of storedAvatars) {
            const mentionPattern = new RegExp(
                `@${escapeRegex(avatar.name)}(?=\\s|@|\\n|$)`,
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

        // Sort by position
        mentions.sort((a, b) => a.startIndex - b.startIndex);

        return mentions;
    }, [prompt, storedAvatars]);

    // Get suggestions list (only avatars)
    const suggestions = useMemo((): MentionItem[] => {
        const lowerQuery = query.toLowerCase().trim();
        const items: MentionItem[] = [];

        // Add avatars only
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

        return items;
    }, [query, storedAvatars]);

    // Check if user typed an exact match (optionally followed by space) - auto-select
    const checkForSpaceComplete = useCallback((): MentionItem | null => {
        if (mentionStartIndex === null) return null;

        // Get query without trailing space
        const trimmedQuery = query.trimEnd();
        const hasTrailingSpace = query !== trimmedQuery && query.endsWith(' ');

        // Only trigger on space
        if (!hasTrailingSpace) return null;

        const queryLower = trimmedQuery.toLowerCase();
        if (!queryLower) return null;

        // Find exact match
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

        return null;
    }, [query, mentionStartIndex, storedAvatars]);

    // Detect @ being typed and show suggestions
    useEffect(() => {
        // Find if cursor is in the middle of typing a mention
        const textBeforeCursor = prompt.slice(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex === -1) {
            setIsOpen(false);
            setQuery('');
            setMentionStartIndex(null);
            return;
        }

        // Check if there's a newline between @ and cursor
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        if (textAfterAt.includes('\n')) {
            setIsOpen(false);
            setQuery('');
            setMentionStartIndex(null);
            return;
        }

        // Check if this @ is part of an already completed mention
        const isCompletedMention = parsedMentions.some(
            m => m.startIndex === lastAtIndex && cursorPosition > m.endIndex
        );

        if (isCompletedMention) {
            setIsOpen(false);
            setQuery('');
            setMentionStartIndex(null);
            return;
        }

        // We're typing a mention
        setMentionStartIndex(lastAtIndex);
        setQuery(textAfterAt);
        setIsOpen(true);
        setSelectedIndex(0);
    }, [prompt, cursorPosition, parsedMentions]);

    // Sync mentions with selection state - handle both additions and removals
    useEffect(() => {
        const previousMentions = previousMentionsRef.current;

        // Find newly added mentions and select their avatars
        for (const mention of parsedMentions) {
            const wasAlreadyMentioned = previousMentions.some(
                m => m.name.toLowerCase() === mention.name.toLowerCase()
            );

            if (!wasAlreadyMentioned) {
                // New mention added, select the avatar
                const avatar = storedAvatars.find(
                    a => a.name.toLowerCase() === mention.name.toLowerCase()
                );
                if (avatar && !selectedAvatars.some(a => a.id === avatar.id)) {
                    onSelectAvatar(avatar);
                }
            }
        }

        // Find removed mentions and deselect their avatars
        for (const prevMention of previousMentions) {
            const stillExists = parsedMentions.some(
                m => m.name.toLowerCase() === prevMention.name.toLowerCase()
            );

            if (!stillExists) {
                // Mention was removed, deselect the avatar
                const avatar = storedAvatars.find(
                    a => a.name.toLowerCase() === prevMention.name.toLowerCase()
                );
                if (avatar && selectedAvatars.some(a => a.id === avatar.id)) {
                    onDeselectAvatar(avatar.id);
                }
            }
        }

        // Update previous mentions
        previousMentionsRef.current = parsedMentions;
    }, [parsedMentions, storedAvatars, selectedAvatars, onSelectAvatar, onDeselectAvatar]);

    // Handle selecting a suggestion
    const selectSuggestion = useCallback((item: MentionItem): { newPrompt: string; newCursorPos: number } | null => {
        if (mentionStartIndex === null) return null;

        // Insert the mention name
        const beforeMention = prompt.slice(0, mentionStartIndex);
        const afterCursor = prompt.slice(cursorPosition);
        const mentionText = `@${item.name} `;
        const newPrompt = beforeMention + mentionText + afterCursor;
        const newCursorPos = mentionStartIndex + mentionText.length;

        // Select the avatar
        const avatar = storedAvatars.find(a => a.id === item.id);
        if (avatar) {
            onSelectAvatar(avatar);
        }

        setIsOpen(false);
        setQuery('');
        setMentionStartIndex(null);

        return { newPrompt, newCursorPos };
    }, [mentionStartIndex, prompt, cursorPosition, storedAvatars, onSelectAvatar]);

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
                    return true; // Signal that Enter was handled (caller should call selectSuggestion)
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
    }, []);

    return {
        isOpen,
        suggestions,
        selectedIndex,
        query,
        mentionStartIndex,
        parsedMentions,
        selectSuggestion,
        handleKeyDown,
        closeSuggestions,
        setSelectedIndex,
        checkForSpaceComplete,
    };
}
