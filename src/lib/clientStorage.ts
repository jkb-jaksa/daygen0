import { createStore, del, get, set } from 'idb-keyval';

const DB_NAME = 'daygen-client-storage';
const STORE_NAME = 'kv';

type StorageKey = 'gallery' | 'favorites' | 'uploads' | 'folders' | 'editGallery';

type PersistedValue = unknown;

const canUseWindow = typeof window !== 'undefined';
const hasIndexedDb = canUseWindow && 'indexedDB' in window;
const hasLocalStorage = () => {
  if (!canUseWindow) return false;
  try {
    const testKey = '__daygen_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

const store = hasIndexedDb ? createStore(DB_NAME, STORE_NAME) : undefined;

const namespacedKey = (prefix: string, key: StorageKey) => `${prefix}${key}`;

const parseLocalValue = (value: string | null): PersistedValue | null => {
  if (value === null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const serialiseForLocalStorage = (value: PersistedValue) => {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
};

export const migrateKeyToIndexedDb = async (prefix: string, key: StorageKey) => {
  if (!store || !hasLocalStorage()) return;
  const storageKey = namespacedKey(prefix, key);
  const existing = window.localStorage.getItem(storageKey);
  if (existing === null) return;
  const parsed = parseLocalValue(existing);
  await set(storageKey, parsed, store);
  window.localStorage.removeItem(storageKey);
};

export const getPersistedValue = async <T>(prefix: string, key: StorageKey): Promise<T | null> => {
  const storageKey = namespacedKey(prefix, key);
  if (store) {
    const result = await get(storageKey, store);
    if (result !== undefined) return result as T;
  }

  if (hasLocalStorage()) {
    const raw = window.localStorage.getItem(storageKey);
    return parseLocalValue(raw) as T | null;
  }

  return null;
};

export const setPersistedValue = async <T>(prefix: string, key: StorageKey, value: T) => {
  const storageKey = namespacedKey(prefix, key);

  if (store) {
    await set(storageKey, value as PersistedValue, store);
    if (hasLocalStorage()) {
      window.localStorage.removeItem(storageKey);
    }
    return;
  }

  if (hasLocalStorage()) {
    try {
      window.localStorage.setItem(storageKey, serialiseForLocalStorage(value));
    } catch (error) {
      throw error;
    }
  }
};

export const removePersistedValue = async (prefix: string, key: StorageKey) => {
  const storageKey = namespacedKey(prefix, key);
  if (store) {
    await del(storageKey, store);
  }
  if (hasLocalStorage()) {
    window.localStorage.removeItem(storageKey);
  }
};

export const estimateStorage = async () => {
  if (!canUseWindow || !('storage' in navigator) || !navigator.storage?.estimate) return null;
  try {
    return await navigator.storage.estimate();
  } catch {
    return null;
  }
};

export const requestPersistentStorage = async () => {
  if (!canUseWindow || !('storage' in navigator) || !navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
};

export type { StorageKey };
