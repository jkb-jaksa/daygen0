import { useCallback, useEffect, useState } from "react";
import type { SavedPrompt } from "../lib/savedPrompts";
import {
  loadSavedPrompts,
  savePrompt as savePromptRaw,
  removeSavedPrompt as removePromptRaw,
  updateSavedPrompt as updatePromptRaw,
  clearSavedPrompts as clearRaw,
  isPromptSaved as isPromptSavedRaw,
} from "../lib/savedPrompts";

export function useSavedPrompts(userKey: string) {
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>(() => loadSavedPrompts(userKey));

  // Reload when user changes
  useEffect(() => {
    setSavedPrompts(loadSavedPrompts(userKey));
  }, [userKey]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("dg:savedPrompts:")) {
        setSavedPrompts(loadSavedPrompts(userKey));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userKey]);

  const savePrompt = useCallback((text: string): SavedPrompt | null => {
    try {
      const saved = savePromptRaw(userKey, text);
      setSavedPrompts(loadSavedPrompts(userKey));
      return saved;
    } catch {
      return null;
    }
  }, [userKey]);

  const removePrompt = useCallback((id: string) => {
    removePromptRaw(userKey, id);
    setSavedPrompts(loadSavedPrompts(userKey));
  }, [userKey]);

  const updatePrompt = useCallback((id: string, newText: string) => {
    try {
      updatePromptRaw(userKey, id, newText);
      setSavedPrompts(loadSavedPrompts(userKey));
    } catch (error) {
      console.error("Failed to update prompt:", error);
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
