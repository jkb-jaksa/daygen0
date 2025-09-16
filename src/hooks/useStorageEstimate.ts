import { useCallback, useEffect, useRef, useState } from 'react';
import { estimateStorage } from '../lib/clientStorage';

export interface StorageEstimateSnapshot {
  usage: number;
  quota: number;
  percentUsed: number;
  timestamp: number;
}

const bytesFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

export const formatBytes = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return '0 MB';
  const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
  let idx = 0;
  let size = value;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }
  return `${bytesFormatter.format(size)} ${units[idx]}`;
};

export const useStorageEstimate = (options?: { auto?: boolean }) => {
  const auto = options?.auto ?? true;
  const [estimate, setEstimate] = useState<StorageEstimateSnapshot | null>(null);
  const supported = typeof navigator !== 'undefined' && !!navigator.storage?.estimate;
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const refresh = useCallback(async () => {
    if (!supported) {
      if (mountedRef.current) setEstimate(null);
      return;
    }
    try {
      const res = await estimateStorage();
      if (!mountedRef.current) return;
      if (!res?.quota) {
        setEstimate(null);
        return;
      }
      const usage = res.usage ?? 0;
      const quota = res.quota;
      setEstimate({
        usage,
        quota,
        percentUsed: quota === 0 ? 0 : usage / quota,
        timestamp: Date.now(),
      });
    } catch {
      if (mountedRef.current) {
        setEstimate(null);
      }
    }
  }, [supported]);

  useEffect(() => {
    if (!auto) return;
    void refresh();
  }, [auto, refresh]);

  return { estimate, refresh, supported };
};
