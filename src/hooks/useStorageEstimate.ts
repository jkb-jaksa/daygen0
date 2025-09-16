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
  console.log('formatBytes called with value:', value);
  if (!Number.isFinite(value) || value <= 0) {
    console.log('formatBytes returning 0 MB for value:', value);
    return '0 MB';
  }
  const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
  let idx = 0;
  let size = value;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }
  const result = `${bytesFormatter.format(size)} ${units[idx]}`;
  console.log('formatBytes result:', result);
  return result;
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
    console.log('Refreshing storage estimate, supported:', supported);
    if (!supported) {
      console.log('Storage not supported, setting estimate to null');
      if (mountedRef.current) setEstimate(null);
      return;
    }
    try {
      const res = await estimateStorage();
      console.log('Raw storage estimate result:', res);
      console.log('Raw storage estimate type:', typeof res);
      console.log('Raw storage estimate keys:', res ? Object.keys(res) : 'null');
      if (!mountedRef.current) return;
      console.log('Checking quota condition - res:', res, 'res?.quota:', res?.quota, '!res?.quota:', !res?.quota);
      if (!res || !res.quota) {
        console.log('No quota in storage estimate, setting to null');
        console.log('res:', res, 'res?.quota:', res?.quota);
        setEstimate(null);
        return;
      }
      const usage = res.usage ?? 0;
      const quota = res.quota;
      const newEstimate = {
        usage,
        quota,
        percentUsed: quota === 0 ? 0 : usage / quota,
        timestamp: Date.now(),
      };
      console.log('Storage estimate refreshed:', newEstimate);
      setEstimate(newEstimate);
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
