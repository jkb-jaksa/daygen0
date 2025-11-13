export const STORAGE_CHANGE_EVENT = 'daygen:storage-change';

export type StorageChangeDetail = {
  key: 'avatars' | 'products';
};

export const dispatchStorageChange = (key: 'avatars' | 'products') => {
  const event = new CustomEvent(STORAGE_CHANGE_EVENT, {
    detail: { key } as StorageChangeDetail,
  });
  window.dispatchEvent(event);
};

