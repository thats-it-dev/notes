import { create } from 'zustand';
import { syncEngine, type SyncStatus } from '../sync/engine';
import { ensureSyncHooksInitialized } from '../sync/hooks';
import { db } from '../lib/db';

const SYNC_URL_KEY = 'syncUrl';
const AUTH_TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

interface SyncStore {
  status: SyncStatus;
  isEnabled: boolean;

  // Actions
  enable: (syncUrl: string, accessToken: string, refreshToken: string) => void;
  disable: () => Promise<void>;
  syncNow: () => Promise<void>;
  initialize: () => void;
}

// Prevent concurrent refresh attempts (token rotation means old token is invalidated)
let refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

async function refreshAccessToken(
  syncUrl: string,
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${syncUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      };
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  status: 'idle',
  isEnabled: false,

  enable: (syncUrl: string, accessToken: string, refreshToken: string) => {
    localStorage.setItem(SYNC_URL_KEY, syncUrl);
    localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    syncEngine.init(syncUrl, () => localStorage.getItem(AUTH_TOKEN_KEY));
    // Only sync once on enable, not on an interval (to avoid disrupting editing)
    syncEngine.syncNow().catch(console.error);
    set({ isEnabled: true });
  },

  disable: async () => {
    syncEngine.stop();
    localStorage.removeItem(SYNC_URL_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    await db.syncMeta.delete('lastSyncToken');
    set({ isEnabled: false, status: 'idle' });
  },

  syncNow: async () => {
    await syncEngine.syncNow();
  },

  initialize: () => {
    // Initialize sync hooks
    ensureSyncHooksInitialized();

    // Subscribe to status changes
    syncEngine.onStatusChange((status) => set({ status }));

    // Handle auth errors
    syncEngine.onAuthError(async () => {
      const syncUrl = localStorage.getItem(SYNC_URL_KEY);
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (syncUrl && refreshToken) {
        const tokens = await refreshAccessToken(syncUrl, refreshToken);
        if (tokens) {
          localStorage.setItem(AUTH_TOKEN_KEY, tokens.accessToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
          syncEngine.syncNow().catch(console.error);
          return;
        }
      }

      // Refresh failed - disable sync
      await get().disable();
    });

    // Check for existing sync config
    const syncUrl = localStorage.getItem(SYNC_URL_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (syncUrl && refreshToken) {
      refreshAccessToken(syncUrl, refreshToken).then((tokens) => {
        if (tokens) {
          localStorage.setItem(AUTH_TOKEN_KEY, tokens.accessToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
          syncEngine.init(syncUrl, () => localStorage.getItem(AUTH_TOKEN_KEY));
          // Only sync once on app open, not on an interval (to avoid disrupting editing)
          syncEngine.syncNow().catch(console.error);
          set({ isEnabled: true });
        } else {
          // Refresh failed - clear credentials
          localStorage.removeItem(AUTH_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem(SYNC_URL_KEY);
        }
      });
    }

    // Sync when user leaves the app (tab hidden or closing)
    // Use multiple events for better cross-platform support (especially iOS PWAs)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && get().isEnabled) {
        // Best effort sync - may not complete on iOS before suspension
        syncEngine.syncNow().catch(console.error);
      } else if (document.visibilityState === 'visible' && get().isEnabled) {
        // Sync when returning to app - catches cases where previous sync was interrupted
        // This is safe because we're syncing BEFORE the user starts typing
        syncEngine.syncNow().catch(console.error);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // pagehide is more reliable than visibilitychange on some iOS versions
    const onPageHide = () => {
      if (get().isEnabled) {
        syncEngine.syncNow().catch(console.error);
      }
    };
    window.addEventListener('pagehide', onPageHide);
  },
}));
