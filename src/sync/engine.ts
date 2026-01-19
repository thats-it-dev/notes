import { db } from '../lib/db';
import { SyncApiClient, type NoteChange, type ConflictInfo } from './api';
import { v4 as uuidv4 } from 'uuid';

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: ConflictInfo[];
}

type StatusChangeCallback = (status: SyncStatus) => void;
type AuthErrorCallback = () => void;

/**
 * Generate a unique client ID for this device/browser.
 * Persisted in localStorage.
 */
function getClientId(): string {
  const key = 'sync_client_id';
  let clientId = localStorage.getItem(key);
  if (!clientId) {
    clientId = `client-${uuidv4()}`;
    localStorage.setItem(key, clientId);
  }
  return clientId;
}

export class SyncEngine {
  private api: SyncApiClient | null = null;
  private status: SyncStatus = 'idle';
  private statusCallbacks: Set<StatusChangeCallback> = new Set();
  private authErrorCallbacks: Set<AuthErrorCallback> = new Set();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private clientId: string;

  constructor() {
    this.clientId = getClientId();
  }

  /**
   * Initialize the sync engine with an auth token.
   */
  init(syncUrl: string, getToken: () => string | null): void {
    this.api = new SyncApiClient(syncUrl, getToken);
  }

  /**
   * Start background sync with the given interval.
   */
  start(intervalMs = 30000): void {
    if (this.syncInterval) {
      this.stop();
    }

    // Initial sync
    this.syncNow().catch(console.error);

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      this.syncNow().catch(console.error);
    }, intervalMs);
  }

  /**
   * Stop background sync.
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Perform a sync immediately.
   */
  async syncNow(): Promise<SyncResult> {
    if (!this.api) {
      throw new Error('SyncEngine not initialized');
    }

    if (this.status === 'syncing') {
      return { pushed: 0, pulled: 0, conflicts: [] };
    }

    this.setStatus('syncing');

    try {
      // 1. Push local changes
      const pushResult = await this.pushChanges();

      // 2. Pull remote changes
      const pullResult = await this.pullChanges();

      this.setStatus('idle');

      return {
        pushed: pushResult.pushed,
        pulled: pullResult.pulled,
        conflicts: pushResult.conflicts,
      };
    } catch (error) {
      console.error('Sync error:', error);

      if (error instanceof Error) {
        if (error.message === 'Not authenticated' || error.message === 'Authentication expired') {
          this.setStatus('error');
          // Notify listeners about auth failure
          this.notifyAuthError();
        } else if (!navigator.onLine) {
          this.setStatus('offline');
        } else {
          this.setStatus('error');
        }
      }

      throw error;
    }
  }

  /**
   * Push local pending changes to the server.
   */
  private async pushChanges(): Promise<{ pushed: number; conflicts: ConflictInfo[] }> {
    if (!this.api) {
      throw new Error('SyncEngine not initialized');
    }

    // Get pending notes (including soft-deleted ones)
    const pendingNotes = await db.notes
      .where('_syncStatus')
      .equals('pending')
      .toArray();

    if (pendingNotes.length === 0) {
      return { pushed: 0, conflicts: [] };
    }

    // Build changes array
    const changes: NoteChange[] = pendingNotes.map((note) => {
      if (note.deletedAt) {
        return {
          type: 'note',
          operation: 'delete',
          id: note.id,
          deletedAt: note.deletedAt.toISOString(),
        };
      }
      return {
        type: 'note',
        operation: 'upsert',
        data: {
          id: note.id,
          title: note.title || null,
          content: note.content || null,  // Sync BlockNote JSON content
          tags: note.tags,
          updatedAt: note._localUpdatedAt.toISOString(),
        },
      };
    });

    // Push to server
    const result = await this.api.pushChanges({
      changes,
      clientId: this.clientId,
    });

    // Mark applied notes as synced
    if (result.applied.length > 0) {
      await db.notes
        .where('id')
        .anyOf(result.applied)
        .modify({ _syncStatus: 'synced' });
    }

    // Handle conflicts
    for (const conflict of result.conflicts) {
      await db.notes.update(conflict.id, { _syncStatus: 'conflict' });
    }

    // Update sync token
    await db.syncMeta.put({ key: 'lastSyncToken', value: result.syncToken });

    return { pushed: result.applied.length, conflicts: result.conflicts };
  }

  /**
   * Pull remote changes from the server.
   */
  private async pullChanges(): Promise<{ pulled: number }> {
    if (!this.api) {
      throw new Error('SyncEngine not initialized');
    }

    // Get last sync token
    const lastSyncMeta = await db.syncMeta.get('lastSyncToken');
    const since = lastSyncMeta?.value;

    // Fetch changes from server
    const result = await this.api.getChanges(since, this.clientId);

    const noteChanges = result.changes.notes || [];
    let pulled = 0;

    // Apply remote changes
    for (const change of noteChanges) {
      if (change.operation === 'delete') {
        // Mark note as deleted locally
        const existing = await db.notes.get(change.id);
        if (existing) {
          await db.notes.update(change.id, {
            deletedAt: change.deletedAt ? new Date(change.deletedAt) : new Date(),
            _syncStatus: 'synced',
          });
          pulled++;
        }
      } else if (change.operation === 'upsert' && change.data) {
        // Check if we have a local pending change
        const existing = await db.notes.get(change.id);

        if (existing && existing._syncStatus === 'pending') {
          // Skip - local changes take precedence until synced
          continue;
        }

        // Apply remote note
        const noteData = change.data as {
          id: string;
          title?: string;
          content?: unknown[];  // BlockNote JSON blocks
          tags?: string[];
          createdAt?: string;
          updatedAt: string;
        };

        if (existing) {
          // Update existing note with BlockNote JSON content
          await db.notes.update(change.id, {
            title: noteData.title || existing.title,
            content: noteData.content || existing.content,
            tags: noteData.tags || existing.tags,
            updatedAt: new Date(noteData.updatedAt),
            _syncStatus: 'synced',
            _localUpdatedAt: new Date(noteData.updatedAt),
          });
        } else {
          // Create new note from server
          const now = new Date();
          await db.notes.put({
            id: noteData.id,
            title: noteData.title || 'Untitled',
            content: noteData.content || [],
            markdownCache: '',  // Will be regenerated when note is edited
            tags: noteData.tags || [],
            createdAt: noteData.createdAt ? new Date(noteData.createdAt) : now,
            updatedAt: new Date(noteData.updatedAt),
            lastOpenedAt: now,
            _syncStatus: 'synced',
            _localUpdatedAt: new Date(noteData.updatedAt),
          });
        }
        pulled++;
      }
    }

    // Update sync token
    if (result.syncToken) {
      await db.syncMeta.put({ key: 'lastSyncToken', value: result.syncToken });
    }

    return { pulled };
  }

  /**
   * Get the current sync status.
   */
  getStatus(): SyncStatus {
    return this.status;
  }

  /**
   * Subscribe to status changes.
   */
  onStatusChange(callback: StatusChangeCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  private setStatus(status: SyncStatus): void {
    this.status = status;
    this.statusCallbacks.forEach((cb) => cb(status));
  }

  /**
   * Subscribe to auth errors (e.g., token expiry).
   */
  onAuthError(callback: AuthErrorCallback): () => void {
    this.authErrorCallbacks.add(callback);
    return () => {
      this.authErrorCallbacks.delete(callback);
    };
  }

  private notifyAuthError(): void {
    this.authErrorCallbacks.forEach((cb) => cb());
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();
