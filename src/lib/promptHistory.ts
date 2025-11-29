// Minimal, dependency-free prompt history helper.
// Stores most-recent-first, deduped, per-user key.

export type PromptEntry = {
  text: string;
  ts: number; // epoch ms
};

import { debugWarn } from '../utils/debug';

const KEY_PREFIX = "dg:promptHistory:";

function keyFor(userKey: string) {
  return `${KEY_PREFIX}${userKey || "anon"}`;
}

export function loadPromptHistory(userKey: string, limit = 50): PromptEntry[] {
  try {
    const raw = localStorage.getItem(keyFor(userKey));
    if (!raw) return [];
    const arr = JSON.parse(raw) as PromptEntry[];
    return Array.isArray(arr) ? arr.slice(0, limit) : [];
  } catch {
    return [];
  }
}

export function savePromptHistory(userKey: string, entries: PromptEntry[]) {
  try {
    localStorage.setItem(keyFor(userKey), JSON.stringify(entries));
  } catch {
    // ignore quota errors
  }
}

export function addPrompt(userKey: string, text: string, opts?: { limit?: number; minLen?: number }) {
  const limit = opts?.limit ?? 20;
  const minLen = opts?.minLen ?? 3;

  const t = (text || "").trim();
  if (t.length < minLen) return;

  const list = loadPromptHistory(userKey, limit * 2);
  // Dedupe by case-insensitive text
  const deduped = list.filter(e => e.text.toLowerCase() !== t.toLowerCase());
  deduped.unshift({ text: t, ts: Date.now() });
  savePromptHistory(userKey, deduped.slice(0, limit));
}

export function removePrompt(userKey: string, text: string) {
  const list = loadPromptHistory(userKey, 1000); // Load all entries
  const filtered = list.filter(e => e.text !== text);
  savePromptHistory(userKey, filtered);
}

export function clearPromptHistory(userKey: string) {
  try {
    localStorage.removeItem(keyFor(userKey));
  } catch (error) {
    debugWarn("Failed to clear prompt history", error);
  }
}
