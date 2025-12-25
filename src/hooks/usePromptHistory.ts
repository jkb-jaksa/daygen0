import { useCallback, useEffect, useState, useRef } from "react";
import type { PromptEntry } from "../lib/promptHistory";
import {
  loadPromptHistory,
  addPrompt as addPromptRaw,
  removePrompt as removePromptRaw,
  clearPromptHistory as clearRaw,
  savePromptHistory,
} from "../lib/promptHistory";
import { useAuth } from "../auth/useAuth";
import {
  fetchRecentPrompts,
  savePromptToBackend,
  deletePromptByText,
} from "../lib/promptsApi";
import { debugError, debugLog } from "../utils/debug";

export function usePromptHistory(userKey: string, limit = 20) {
  const { token } = useAuth();
  const [history, setHistory] = useState<PromptEntry[]>(() => loadPromptHistory(userKey, limit));
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
        const backendPrompts = await fetchRecentPrompts(token, limit);

        if (backendPrompts.length > 0) {
          // Convert backend prompts to local format
          const converted: PromptEntry[] = backendPrompts.map(bp => ({
            text: bp.text,
            ts: new Date(bp.savedAt).getTime(),
          }));

          // Merge with local prompts (backend is source of truth)
          const localPrompts = loadPromptHistory(userKey, limit);
          const mergedMap = new Map<string, PromptEntry>();

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
              savePromptToBackend(token, p.text, 'RECENT').catch(() => { });
            }
          }

          // Sort by timestamp descending and limit
          const merged = Array.from(mergedMap.values())
            .sort((a, b) => b.ts - a.ts)
            .slice(0, limit);

          savePromptHistory(userKey, merged);
          setHistory(merged);
          debugLog('Synced recent prompts with backend:', merged.length);
        } else {
          // No backend prompts, but we have local ones - sync them to backend
          const localPrompts = loadPromptHistory(userKey, limit);
          if (localPrompts.length > 0) {
            debugLog('Syncing local recent prompts to backend:', localPrompts.length);
            for (const p of localPrompts) {
              savePromptToBackend(token, p.text, 'RECENT').catch(() => { });
            }
          }
        }

        hasSyncedRef.current = true;
      } catch (error) {
        debugError('Failed to sync recent prompts with backend:', error);
      } finally {
        syncInProgressRef.current = false;
      }
    };

    syncWithBackend();
  }, [token, userKey, limit]);

  // Reset sync flag when user changes
  useEffect(() => {
    hasSyncedRef.current = false;
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

    // Sync to backend (fire-and-forget)
    if (token) {
      savePromptToBackend(token, text, 'RECENT').catch(() => { });
    }
  }, [userKey, limit, token]);

  const removePrompt = useCallback((text: string) => {
    removePromptRaw(userKey, text);
    setHistory(loadPromptHistory(userKey, limit));

    // Sync to backend (fire-and-forget)
    if (token) {
      deletePromptByText(token, text, 'RECENT').catch(() => { });
    }
  }, [userKey, limit, token]);

  const clear = useCallback(() => {
    clearRaw(userKey);
    setHistory([]);
  }, [userKey]);

  return { history, addPrompt, removePrompt, clear };
}
