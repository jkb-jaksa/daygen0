import { useCallback, useEffect, useState } from "react";
import { debugError } from "../utils/debug";
import type { SavedPrompt } from "../lib/savedPrompts";
import {
  loadSavedPrompts,
  savePrompt as savePromptRaw,
  removeSavedPrompt as removePromptRaw,
  updateSavedPrompt as updatePromptRaw,
  clearSavedPrompts as clearRaw,
  isPromptSaved as isPromptSavedRaw,
} from "../lib/savedPrompts";
import { STORAGE_CHANGE_EVENT, dispatchStorageChange } from "../utils/storageEvents";

export function useSavedPrompts(userKey: string) {
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>(() => loadSavedPrompts(userKey));

  // Reload when user changes
  useEffect(() => {
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
      return saved;
    } catch {
      return null;
    }
  }, [userKey]);

  const removePrompt = useCallback((id: string) => {
    removePromptRaw(userKey, id);
    setSavedPrompts(loadSavedPrompts(userKey));
    dispatchStorageChange('savedPrompts');
  }, [userKey]);

  const updatePrompt = useCallback((id: string, newText: string) => {
    try {
      updatePromptRaw(userKey, id, newText);
      setSavedPrompts(loadSavedPrompts(userKey));
      dispatchStorageChange('savedPrompts');
    } catch (error) {
      debugError("Failed to update prompt:", error);
    }
  }, [userKey]);

  const clear = useCallback(() => {
    clearRaw(userKey);
    setSavedPrompts([]);
  }, [userKey]);

  const isPromptSaved = useCallback((text: string): boolean => {
    return isPromptSavedRaw(userKey, text);
  }, [userKey]);

  return { savedPrompts, savePrompt, removePrompt, updatePrompt, clear, isPromptSaved };
}
