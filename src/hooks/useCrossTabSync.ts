import { useEffect, useCallback, useRef } from 'react';
import type { User } from '../auth/context';
import { debugLog, debugWarn } from '../utils/debug';

interface CrossTabMessage {
  type: 'auth_update' | 'credits_update' | 'session_expired' | 'user_logout';
  data?: unknown;
  timestamp: number;
}

interface UseCrossTabSyncParams {
  user: User | null;
  refreshUser: () => Promise<User>;
  logOut: () => Promise<void>;
}

export function useCrossTabSync({ user, refreshUser, logOut }: UseCrossTabSyncParams) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
      debugWarn('BroadcastChannel not supported in this environment');
      return;
    }

    channelRef.current = new BroadcastChannel('daygen-sync');
    isInitializedRef.current = true;

    return () => {
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, []);

  // Send message to other tabs
  const sendMessage = useCallback((message: Omit<CrossTabMessage, 'timestamp'>) => {
    if (!channelRef.current || !isInitializedRef.current) return;

    const fullMessage: CrossTabMessage = {
      ...message,
      timestamp: Date.now(),
    };

    try {
      channelRef.current.postMessage(fullMessage);
    } catch (error) {
      debugWarn('Failed to send cross-tab message:', error);
    }
  }, []);

  // Listen for messages from other tabs
  useEffect(() => {
    if (!channelRef.current) return;

    const handleMessage = async (event: MessageEvent<CrossTabMessage>) => {
      const { type, timestamp } = event.data;

      // Ignore messages older than 5 seconds to prevent stale updates
      if (Date.now() - timestamp > 5000) {
        return;
      }

      // Ignore messages from the same tab (prevent loops)
      if (event.source === window) {
        return;
      }

      try {
        switch (type) {
          case 'auth_update':
            // Refresh user data when another tab updates auth
            await refreshUser();
            break;

          case 'credits_update':
            // Refresh user data when credits are updated in another tab
            await refreshUser();
            break;

          case 'session_expired':
            // Handle session expiry from another tab
            debugLog('Session expired in another tab');
            await logOut();
            break;

          case 'user_logout':
            // Handle logout from another tab
            debugLog('User logged out in another tab');
            await logOut();
            break;

          default:
            debugWarn('Unknown cross-tab message type:', type);
        }
      } catch (error) {
        debugWarn('Error handling cross-tab message:', error);
      }
    };

    channelRef.current.addEventListener('message', handleMessage);

    return () => {
      if (channelRef.current) {
        channelRef.current.removeEventListener('message', handleMessage);
      }
    };
  }, [refreshUser, logOut]);

  // Notify other tabs when user data changes
  useEffect(() => {
    if (!isInitializedRef.current) return;

    // Send auth update when user changes
    sendMessage({
      type: 'auth_update',
      data: { userId: user?.authUserId, credits: user?.credits }
    });
  }, [user?.authUserId, user?.credits, sendMessage]);

  // Notify other tabs when credits change
  const notifyCreditsUpdate = useCallback((newCredits: number) => {
    sendMessage({
      type: 'credits_update',
      data: { credits: newCredits }
    });
  }, [sendMessage]);

  // Notify other tabs when session expires
  const notifySessionExpired = useCallback(() => {
    sendMessage({
      type: 'session_expired'
    });
  }, [sendMessage]);

  // Notify other tabs when user logs out
  const notifyUserLogout = useCallback(() => {
    sendMessage({
      type: 'user_logout'
    });
  }, [sendMessage]);

  return {
    notifyCreditsUpdate,
    notifySessionExpired,
    notifyUserLogout,
    sendMessage,
  };
}
