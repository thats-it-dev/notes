import { db } from '../lib/db';
import { SyncApiClient, type EntityChange, type ConflictInfo } from './api';
import { v4 as uuidv4 } from 'uuid';
import { updateTaskInBlocks } from '../lib/blockNoteConverters';
import type { Block } from '@blocknote/core';
import { RetryQueue } from './retryQueue';
import { OperationLog } from './operationLog';

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: ConflictInfo[];
}

type StatusChangeCallback = (status: SyncStatus) => void;
type AuthErrorCallback = () => void;
type SyncCompleteCallback = (result: SyncResult) => void;

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
  private syncCompleteCallbacks: Set<SyncCompleteCallback> = new Set();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private clientId: string;
  private retryQueue: RetryQueue;
  private operationLog: OperationLog;

  constructor() {
    this.clientId = getClientId();
    this.retryQueue = new RetryQueue(() => this.syncNow());
    this.operationLog = new OperationLog();
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

      // Clear retry queue on success
      this.retryQueue.recordSuccess();

      this.setStatus('idle');

      const result = {
        pushed: pushResult.pushed,
        pulled: pullResult.pulled,
        conflicts: pushResult.conflicts,
      };

      // Notify listeners that sync completed
      this.notifySyncComplete(result);

      return result;
    } catch (error) {
      console.error('Sync error:', error);

      // Schedule retry with exponential backoff
      this.retryQueue.recordFailure();

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

    // Get pending tasks (including soft-deleted ones)
    const pendingTasks = await db.tasks
      .where('_syncStatus')
      .equals('pending')
      .toArray();

    if (pendingNotes.length === 0 && pendingTasks.length === 0) {
      return { pushed: 0, conflicts: [] };
    }

    // Build changes array
    const changes: EntityChange[] = [];

    // Add note changes
    for (const note of pendingNotes) {
      if (note.deletedAt) {
        changes.push({
          type: 'note',
          operation: 'delete',
          id: note.id,
          deletedAt: note.deletedAt.toISOString(),
        });
      } else {
        changes.push({
          type: 'note',
          operation: 'upsert',
          data: {
            id: note.id,
            title: note.title || null,
            content: note.content || null,  // Sync BlockNote JSON content
            tags: note.tags,
            pinned: note.pinned || false,
            updatedAt: note._localUpdatedAt.toISOString(),
          },
        });
      }
    }

    // Add task changes
    for (const task of pendingTasks) {
      if (task.deletedAt) {
        changes.push({
          type: 'task',
          operation: 'delete',
          id: task.id,
          deletedAt: task.deletedAt.toISOString(),
        });
      } else {
        changes.push({
          type: 'task',
          operation: 'upsert',
          data: {
            id: task.id,
            title: task.title || null,
            displayTitle: task.displayTitle || task.title || null,
            tags: task.tags,
            dueDate: task.dueDate?.toISOString() || null,
            completed: task.completed,
            completedAt: null,
            createdAt: task.createdAt.toISOString(),
            updatedAt: task._localUpdatedAt.toISOString(),
            noteId: task.noteId,
            blockId: task.blockId,  // Needed to update the correct block in notes
            appType: 'notes',
          },
        });
      }
    }

    // Generate idempotency key for this batch
    const idempotencyKey = `${this.clientId}-${Date.now()}-${uuidv4()}`;

    // Track operation for crash recovery
    const entityIds = changes.map(c => c.operation === 'delete' ? c.id : c.data.id);
    this.operationLog.start('push', entityIds);

    // Push to server
    const result = await this.api.pushChanges({
      changes,
      clientId: this.clientId,
      idempotencyKey,
    });

    // Separate applied IDs by entity type
    const appliedNoteIds = result.applied.filter((id) =>
      pendingNotes.some((n) => n.id === id)
    );
    const appliedTaskIds = result.applied.filter((id) =>
      pendingTasks.some((t) => t.id === id)
    );

    // Mark applied notes as synced
    if (appliedNoteIds.length > 0) {
      await db.notes
        .where('id')
        .anyOf(appliedNoteIds)
        .modify({ _syncStatus: 'synced' });
    }

    // Mark applied tasks as synced
    if (appliedTaskIds.length > 0) {
      await db.tasks
        .where('id')
        .anyOf(appliedTaskIds)
        .modify({ _syncStatus: 'synced' });
    }

    // Handle conflicts (for notes)
    for (const conflict of result.conflicts) {
      await db.notes.update(conflict.id, { _syncStatus: 'conflict' });
    }

    // Update sync token
    await db.syncMeta.put({ key: 'lastSyncToken', value: result.syncToken });

    // Mark operation complete
    this.operationLog.complete();

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
    const taskChanges = result.changes.tasks || [];
    let pulled = 0;

    // Apply remote note changes
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
          pinned?: boolean;
          createdAt?: string;
          updatedAt: string;
        };

        if (existing) {
          // Update existing note with BlockNote JSON content
          await db.notes.update(change.id, {
            title: noteData.title || existing.title,
            content: noteData.content || existing.content,
            tags: noteData.tags || existing.tags,
            pinned: noteData.pinned ?? existing.pinned,
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
            pinned: noteData.pinned || false,
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

    // Apply remote task changes (from tasks app edits)
    for (const change of taskChanges) {
      if (change.operation === 'delete') {
        // Mark task as deleted locally
        const existing = await db.tasks.get(change.id);
        if (existing) {
          await db.tasks.update(change.id, {
            deletedAt: change.deletedAt ? new Date(change.deletedAt) : new Date(),
            _syncStatus: 'synced',
          });
          pulled++;
        }
      } else if (change.operation === 'upsert' && change.data) {
        const taskData = change.data as {
          id: string;
          title?: string;
          displayTitle?: string;
          completed?: boolean;
          tags?: string[];
          dueDate?: string | null;
          noteId?: string;
          blockId?: string;
          appType?: 'notes' | 'tasks';
          updatedAt: string;
        };

        // Only process tasks that originated from notes app (have a noteId)
        if (!taskData.noteId) {
          continue;
        }

        // Check if we have a local pending change
        const existing = await db.tasks.get(change.id);

        if (existing && existing._syncStatus === 'pending') {
          // Skip - local changes take precedence until synced
          continue;
        }

        if (existing) {
          // Task was edited in tasks app - update local task and note content
          const titleChanged = taskData.title !== undefined && taskData.title !== existing.title;
          const completedChanged = taskData.completed !== undefined && taskData.completed !== existing.completed;

          // Update the task record
          await db.tasks.update(change.id, {
            title: taskData.title ?? existing.title,
            displayTitle: taskData.displayTitle ?? existing.displayTitle,
            completed: taskData.completed ?? existing.completed,
            tags: taskData.tags ?? existing.tags,
            dueDate: taskData.dueDate ? new Date(taskData.dueDate) : existing.dueDate,
            updatedAt: new Date(taskData.updatedAt),
            _syncStatus: 'synced',
            _localUpdatedAt: new Date(taskData.updatedAt),
          });

          // Update the corresponding BlockNote block in the note
          if ((titleChanged || completedChanged) && existing.noteId && existing.blockId) {
            const note = await db.notes.get(existing.noteId);
            if (note && note.content) {
              const updatedContent = updateTaskInBlocks(
                note.content as Block[],
                existing.blockId,
                {
                  completed: taskData.completed,
                  title: taskData.title,
                }
              );

              // Update note content (mark as synced to avoid re-pushing)
              await db.notes.update(existing.noteId, {
                content: updatedContent,
                updatedAt: new Date(taskData.updatedAt),
                _syncStatus: 'synced',
                _localUpdatedAt: new Date(taskData.updatedAt),
              });
            }
          }

          pulled++;
        }
        // Note: We don't create new tasks from remote - tasks in notes are created locally
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

  /**
   * Subscribe to sync completion events.
   * Called after each successful sync with the result.
   */
  onSyncComplete(callback: SyncCompleteCallback): () => void {
    this.syncCompleteCallbacks.add(callback);
    return () => {
      this.syncCompleteCallbacks.delete(callback);
    };
  }

  private notifySyncComplete(result: SyncResult): void {
    this.syncCompleteCallbacks.forEach((cb) => cb(result));
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();
