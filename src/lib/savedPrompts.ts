// Storage for user-saved prompts (starred/favorite prompts)

export type SavedPrompt = {
  id: string;
  text: string;
  savedAt: number; // epoch ms
};

const KEY_PREFIX = "dg:savedPrompts:";

function keyFor(userKey: string) {
  return `${KEY_PREFIX}${userKey || "anon"}`;
}

export function loadSavedPrompts(userKey: string): SavedPrompt[] {
  try {
    const raw = localStorage.getItem(keyFor(userKey));
    if (!raw) return [];
    const arr = JSON.parse(raw) as SavedPrompt[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveSavedPrompts(userKey: string, prompts: SavedPrompt[]) {
  try {
    localStorage.setItem(keyFor(userKey), JSON.stringify(prompts));
  } catch {
    // ignore quota errors
  }
}

export function savePrompt(userKey: string, text: string): SavedPrompt {
  const t = (text || "").trim();
  if (t.length < 3) throw new Error("Prompt too short");

  const list = loadSavedPrompts(userKey);
  
  // Check if prompt already exists (case-insensitive)
  const existing = list.find(p => p.text.toLowerCase() === t.toLowerCase());
  if (existing) {
    return existing; // Already saved
  }

  const newPrompt: SavedPrompt = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    text: t,
    savedAt: Date.now(),
  };

  list.unshift(newPrompt);
  saveSavedPrompts(userKey, list);
  return newPrompt;
}

export function removeSavedPrompt(userKey: string, id: string) {
  const list = loadSavedPrompts(userKey);
  const filtered = list.filter(p => p.id !== id);
  saveSavedPrompts(userKey, filtered);
}

export function updateSavedPrompt(userKey: string, id: string, newText: string) {
  const t = (newText || "").trim();
  if (t.length < 3) throw new Error("Prompt too short");

  const list = loadSavedPrompts(userKey);
  const updated = list.map(p => 
    p.id === id ? { ...p, text: t } : p
  );
  saveSavedPrompts(userKey, updated);
}

export function clearSavedPrompts(userKey: string) {
  try {
    localStorage.removeItem(keyFor(userKey));
  } catch (error) {
    console.warn("Failed to clear saved prompts", error);
  }
}

export function isPromptSaved(userKey: string, text: string): boolean {
  const list = loadSavedPrompts(userKey);
  const t = (text || "").trim().toLowerCase();
  return list.some(p => p.text.toLowerCase() === t);
}
