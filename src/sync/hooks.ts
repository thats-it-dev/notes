import { db } from '../lib/db';
import type { SyncStatus } from '../lib/types';

/**
 * Initialize Dexie hooks for automatic sync status tracking.
 *
 * These hooks ensure that any note modifications (even those bypassing
 * noteOperations) are properly marked as pending for sync.
 *
 * Call this once during app initialization.
 */
export function initSyncHooks(): void {
  // Hook into note creation
  db.notes.hook('creating', (_primKey, obj) => {
    // Ensure sync fields are set for new notes
    if (!obj._syncStatus) {
      obj._syncStatus = 'pending';
    }
    if (!obj._localUpdatedAt) {
      obj._localUpdatedAt = new Date();
    }
  });

  // Hook into note updates - use function to add additional modifications
  db.notes.hook('updating', function (modifications) {
    // Skip if this is a sync-initiated update (marked as synced)
    const mods = modifications as Record<string, unknown>;
    const syncStatus = mods._syncStatus as SyncStatus | undefined;
    if (syncStatus === 'synced') {
      return;
    }

    // Mark as pending unless explicitly set otherwise
    return {
      _syncStatus: syncStatus || 'pending',
      _localUpdatedAt: new Date(),
    };
  });
}

/**
 * Check if sync hooks are initialized.
 */
let hooksInitialized = false;

export function ensureSyncHooksInitialized(): void {
  if (!hooksInitialized) {
    initSyncHooks();
    hooksInitialized = true;
  }
}
