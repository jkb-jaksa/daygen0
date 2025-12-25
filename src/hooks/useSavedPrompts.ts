import { useCallback, useEffect, useState, useRef } from "react";
import { debugError, debugLog } from "../utils/debug";
import type { SavedPrompt } from "../lib/savedPrompts";
import {
  loadSavedPrompts,
  savePrompt as savePromptRaw,
  removeSavedPrompt as removePromptRaw,
  updateSavedPrompt as updatePromptRaw,
  clearSavedPrompts as clearRaw,
  isPromptSaved as isPromptSavedRaw,
  saveSavedPrompts,
} from "../lib/savedPrompts";
import { STORAGE_CHANGE_EVENT, dispatchStorageChange } from "../utils/storageEvents";
import { useAuth } from "../auth/useAuth";
import {
  fetchSavedPrompts,
  savePromptToBackend,
  deletePromptByText,
  updatePromptInBackend,
} from "../lib/promptsApi";

export function useSavedPrompts(userKey: string) {
  const { token } = useAuth();
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>(() => loadSavedPrompts(userKey));
  const hasSyncedRef = useRef(false);
  const syncInProgressRef = useRef(false);

  // Sync with backend on mount (when we have a token)
  useEffect(() => {
    if (!token || hasSyncedRef.current || syncInProgressRef.current) {
      return;
    }

    const syncWithBackend = async () => {
      syncInProgressRef.current = true;
      try {
        const backendPrompts = await fetchSavedPrompts(token);

        if (backendPrompts.length > 0) {
          // Convert backend prompts to local format
          const converted: SavedPrompt[] = backendPrompts.map(bp => ({
            id: bp.id,
            text: bp.text,
            savedAt: new Date(bp.savedAt).getTime(),
          }));

          // Merge with local prompts (backend is source of truth)
          const localPrompts = loadSavedPrompts(userKey);
          const mergedMap = new Map<string, SavedPrompt>();

          // Add backend prompts first (higher priority)
          for (const p of converted) {
            mergedMap.set(p.text.toLowerCase(), p);
          }

          // Add local-only prompts that aren't in backend
          // and sync them to backend
          for (const p of localPrompts) {
            if (!mergedMap.has(p.text.toLowerCase())) {
              mergedMap.set(p.text.toLowerCase(), p);
              // Fire-and-forget sync to backend
              savePromptToBackend(token, p.text, 'SAVED').catch(() => { });
            }
          }

          // Sort by savedAt descending and update
          const merged = Array.from(mergedMap.values())
            .sort((a, b) => b.savedAt - a.savedAt);

          saveSavedPrompts(userKey, merged);
          setSavedPrompts(merged);
          debugLog('Synced saved prompts with backend:', merged.length);
        } else {
          // No backend prompts, but we have local ones - sync them to backend
          const localPrompts = loadSavedPrompts(userKey);
          if (localPrompts.length > 0) {
            debugLog('Syncing local saved prompts to backend:', localPrompts.length);
            for (const p of localPrompts) {
              savePromptToBackend(token, p.text, 'SAVED').catch(() => { });
            }
          }
        }

        hasSyncedRef.current = true;
      } catch (error) {
        debugError('Failed to sync saved prompts with backend:', error);
      } finally {
        syncInProgressRef.current = false;
      }
    };

    syncWithBackend();
  }, [token, userKey]);

  // Reset sync flag when user changes
  useEffect(() => {
    hasSyncedRef.current = false;
    setSavedPrompts(loadSavedPrompts(userKey));
  }, [userKey]);

  // Cross-tab sync and same-tab sync via custom events
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("dg:savedPrompts:")) {
        setSavedPrompts(loadSavedPrompts(userKey));
      }
    };

    const onCustomStorageChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ key: 'avatars' | 'products' | 'savedPrompts' }>;
      if (customEvent.detail?.key === 'savedPrompts') {
        setSavedPrompts(loadSavedPrompts(userKey));
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(STORAGE_CHANGE_EVENT, onCustomStorageChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(STORAGE_CHANGE_EVENT, onCustomStorageChange);
    };
  }, [userKey]);

  const savePrompt = useCallback((text: string): SavedPrompt | null => {
    try {
      const saved = savePromptRaw(userKey, text);
      setSavedPrompts(loadSavedPrompts(userKey));
      dispatchStorageChange('savedPrompts');

      // Sync to backend (fire-and-forget)
      if (token) {
        savePromptToBackend(token, text, 'SAVED').catch(() => { });
      }

      return saved;
    } catch {
      return null;
    }
  }, [userKey, token]);

  const removePrompt = useCallback((id: string) => {
    // Find the prompt text before removing (needed for backend delete)
    const promptToRemove = savedPrompts.find(p => p.id === id);

    removePromptRaw(userKey, id);
    setSavedPrompts(loadSavedPrompts(userKey));
    dispatchStorageChange('savedPrompts');

    // Sync to backend (fire-and-forget)
    if (token && promptToRemove) {
      deletePromptByText(token, promptToRemove.text, 'SAVED').catch(() => { });
    }
  }, [userKey, token, savedPrompts]);

  const updatePrompt = useCallback((id: string, newText: string) => {
    try {
      updatePromptRaw(userKey, id, newText);
      setSavedPrompts(loadSavedPrompts(userKey));
      dispatchStorageChange('savedPrompts');

      // Sync to backend (fire-and-forget)
      if (token) {
        updatePromptInBackend(token, id, newText).catch(() => { });
      }
    } catch (error) {
      debugError("Failed to update prompt:", error);
    }
  }, [userKey, token]);

  const clear = useCallback(() => {
    clearRaw(userKey);
    setSavedPrompts([]);
  }, [userKey]);

  const isPromptSaved = useCallback((text: string): boolean => {
    return isPromptSavedRaw(userKey, text);
  }, [userKey]);

  return { savedPrompts, savePrompt, removePrompt, updatePrompt, clear, isPromptSaved };
}
