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
  if (!Number.isFinite(value) || value <= 0) {
    return '0 MB';
  }
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
    console.log('Storage estimate refresh called, supported:', supported, 'mounted:', mountedRef.current);
    if (!supported) {
      console.log('Storage not supported, setting estimate to null');
      if (mountedRef.current) setEstimate(null);
      return;
    }
    try {
      console.log('Calling estimateStorage...');
      const res = await estimateStorage();
      console.log('Storage estimate result:', res);
      if (!res) {
        console.log('No storage estimate result, setting to null');
        if (mountedRef.current) setEstimate(null);
        return;
      }
      const usage = res.usage ?? 0;
      const quota = res.quota ?? 0;
      console.log('Storage usage:', usage, 'quota:', quota);
      const newEstimate = {
        usage,
        quota,
        percentUsed: quota === 0 ? 0 : usage / quota,
        timestamp: Date.now(),
      };
      console.log('Setting new storage estimate:', newEstimate);
      if (mountedRef.current) {
        setEstimate(newEstimate);
      } else {
        console.log('Component unmounted, not setting estimate');
      }
    } catch (error) {
      console.error('Failed to refresh storage estimate:', error);
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
