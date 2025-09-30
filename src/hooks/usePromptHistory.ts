import { useCallback, useEffect, useState } from "react";
import type { PromptEntry } from "../lib/promptHistory";
import {
  loadPromptHistory,
  addPrompt as addPromptRaw,
  removePrompt as removePromptRaw,
  clearPromptHistory as clearRaw,
} from "../lib/promptHistory";

export function usePromptHistory(userKey: string, limit = 20) {
  const [history, setHistory] = useState<PromptEntry[]>(() => loadPromptHistory(userKey, limit));

  // Reload when user changes
  useEffect(() => {
    setHistory(loadPromptHistory(userKey, limit));
  }, [userKey, limit]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("dg:promptHistory:")) {
        setHistory(loadPromptHistory(userKey, limit));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userKey, limit]);

  const addPrompt = useCallback((text: string) => {
    addPromptRaw(userKey, text, { limit });
    setHistory(loadPromptHistory(userKey, limit));
  }, [userKey, limit]);

  const removePrompt = useCallback((text: string) => {
    removePromptRaw(userKey, text);
    setHistory(loadPromptHistory(userKey, limit));
  }, [userKey, limit]);

  const clear = useCallback(() => {
    clearRaw(userKey);
    setHistory([]);
  }, [userKey]);

  return { history, addPrompt, removePrompt, clear };
}
