// API client for backend prompt storage
// Provides persistent storage for saved and recent prompts

import { getApiUrl } from '../utils/api';

export type PromptType = 'SAVED' | 'RECENT';

export interface BackendPrompt {
    id: string;
    text: string;
    type: PromptType;
    savedAt: string; // ISO date string
}

/**
 * Fetch prompts from backend by type
 */
export async function fetchPrompts(
    token: string,
    type: PromptType,
    limit = 50
): Promise<BackendPrompt[]> {
    try {
        const response = await fetch(
            getApiUrl(`/api/prompts?type=${type}&limit=${limit}`),
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        if (!response.ok) {
            console.warn(`Failed to fetch ${type} prompts:`, response.status);
            return [];
        }

        return await response.json();
    } catch (error) {
        console.warn(`Error fetching ${type} prompts:`, error);
        return [];
    }
}

/**
 * Fetch saved (starred) prompts
 */
export function fetchSavedPrompts(token: string, limit = 50): Promise<BackendPrompt[]> {
    return fetchPrompts(token, 'SAVED', limit);
}

/**
 * Fetch recent (history) prompts
 */
export function fetchRecentPrompts(token: string, limit = 20): Promise<BackendPrompt[]> {
    return fetchPrompts(token, 'RECENT', limit);
}

/**
 * Save or upsert a prompt (moves to top if exists)
 */
export async function savePromptToBackend(
    token: string,
    text: string,
    type: PromptType
): Promise<BackendPrompt | null> {
    try {
        const response = await fetch(getApiUrl('/api/prompts'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ text, type }),
        });

        if (!response.ok) {
            console.warn(`Failed to save prompt:`, response.status);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.warn('Error saving prompt:', error);
        return null;
    }
}

/**
 * Update a prompt's text
 */
export async function updatePromptInBackend(
    token: string,
    id: string,
    text: string
): Promise<BackendPrompt | null> {
    try {
        const response = await fetch(getApiUrl(`/api/prompts/${id}`), {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            console.warn('Failed to update prompt:', response.status);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.warn('Error updating prompt:', error);
        return null;
    }
}

/**
 * Delete a prompt by ID
 */
export async function deletePromptFromBackend(
    token: string,
    id: string
): Promise<boolean> {
    try {
        const response = await fetch(getApiUrl(`/api/prompts/${id}`), {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        return response.ok;
    } catch (error) {
        console.warn('Error deleting prompt:', error);
        return false;
    }
}

/**
 * Delete a prompt by text (more convenient for frontend)
 */
export async function deletePromptByText(
    token: string,
    text: string,
    type: PromptType
): Promise<boolean> {
    try {
        const response = await fetch(
            getApiUrl(`/api/prompts/by-text?text=${encodeURIComponent(text)}&type=${type}`),
            {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        return response.ok;
    } catch (error) {
        console.warn('Error deleting prompt by text:', error);
        return false;
    }
}
