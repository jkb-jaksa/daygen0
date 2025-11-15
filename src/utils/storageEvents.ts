export const STORAGE_CHANGE_EVENT = 'daygen:storage-change';

export type StorageChangeDetail = {
  key: 'avatars' | 'products' | 'savedPrompts';
};

export const dispatchStorageChange = (key: 'avatars' | 'products' | 'savedPrompts') => {
  const event = new CustomEvent(STORAGE_CHANGE_EVENT, {
    detail: { key } as StorageChangeDetail,
  });
  window.dispatchEvent(event);
};

