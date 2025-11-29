import { useCallback, useEffect, useMemo, useState } from "react";
import { debugWarn } from "../utils/debug";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  kind: "text" | "image";
  content: string;
  createdAt: string;
  imageUrl?: string;
};

export type ChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

const canUseWindow = typeof window !== "undefined";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const createEmptySession = (): ChatSession => {
  const timestamp = new Date().toISOString();
  return {
    id: createId(),
    title: "New chat",
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [],
  };
};

const sortSessions = (items: ChatSession[]) =>
  [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

export type UseChatSessionsResult = {
  sessions: ChatSession[];
  activeSessionId: string | null;
  selectSession: (id: string) => void;
  createSession: () => ChatSession;
  updateSession: (id: string, updater: (session: ChatSession) => ChatSession) => void;
  deleteSession: (id: string) => void;
};

export function useChatSessions(storagePrefix: string): UseChatSessionsResult {
  const storageKey = useMemo(
    () => `${storagePrefix ?? ""}chatSessions`,
    [storagePrefix],
  );

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    if (!canUseWindow) return;

    let parsed: ChatSession[] = [];
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        parsed = JSON.parse(raw) as ChatSession[];
      }
    } catch (error) {
      debugWarn("Failed to parse stored chat sessions", error);
    }

    if (!parsed.length) {
      parsed = [createEmptySession()];
    }

    const sorted = sortSessions(parsed);
    setSessions(sorted);
    setActiveSessionId(sorted[0]?.id ?? null);
    setHasHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hasHydrated || !canUseWindow) return;

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(sessions));
    } catch (error) {
      debugWarn("Failed to persist chat sessions", error);
    }
  }, [sessions, storageKey, hasHydrated]);

  const selectSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const createSession = useCallback(() => {
    const session = createEmptySession();
    setSessions(prev => sortSessions([session, ...prev]));
    setActiveSessionId(session.id);
    return session;
  }, []);

  const updateSession = useCallback(
    (id: string, updater: (session: ChatSession) => ChatSession) => {
      setSessions(prev => {
        let didUpdate = false;
        const next = prev.map(session => {
          if (session.id !== id) return session;
          didUpdate = true;
          return updater(session);
        });
        if (!didUpdate) return prev;
        return sortSessions(next);
      });
    },
    [],
  );

  const deleteSession = useCallback(
    (id: string) => {
      setSessions(prev => {
        const filtered = prev.filter(session => session.id !== id);
        if (filtered.length === prev.length) return prev;

        if (!filtered.length) {
          const fallback = createEmptySession();
          setActiveSessionId(fallback.id);
          return [fallback];
        }

        const sorted = sortSessions(filtered);
        if (activeSessionId === id) {
          setActiveSessionId(sorted[0]?.id ?? null);
        }
        return sorted;
      });
    },
    [activeSessionId],
  );

  return {
    sessions,
    activeSessionId,
    selectSession,
    createSession,
    updateSession,
    deleteSession,
  };
}
