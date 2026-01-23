import Dexie, { type Table } from 'dexie';
import type { Note, Task, Tag, SyncMeta } from './types';

export class NotesDatabase extends Dexie {
  notes!: Table<Note, string>;
  tasks!: Table<Task, string>;
  tags!: Table<Tag, string>;
  syncMeta!: Table<SyncMeta, string>;

  constructor() {
    super('NotesDatabase');

    this.version(1).stores({
      notes: 'id, title, *tags, lastOpenedAt, createdAt, updatedAt',
      tasks: 'id, noteId, completed, *tags, createdAt, updatedAt',
      tags: 'name, usageCount, lastUsedAt'
    });

    this.version(2).stores({
      notes: 'id, title, *tags, lastOpenedAt, createdAt, updatedAt',
      tasks: 'id, noteId, completed, *tags, createdAt, updatedAt',
      tags: 'name, usageCount, lastUsedAt'
    }).upgrade(tx => {
      // Clean slate migration - wipe all data
      return tx.table('notes').clear()
        .then(() => tx.table('tasks').clear())
        .then(() => tx.table('tags').clear());
    });

    this.version(3).stores({
      notes: 'id, title, *tags, lastOpenedAt, createdAt, updatedAt',
      tasks: 'id, noteId, completed, *tags, createdAt, updatedAt',
      tags: 'name, usageCount, lastUsedAt'
    }).upgrade(tx => {
      // Force clean slate for tag fix
      return tx.table('tags').clear();
    });

    // Version 4: Add sync tracking fields and syncMeta table
    this.version(4).stores({
      notes: 'id, title, *tags, lastOpenedAt, createdAt, updatedAt, _syncStatus, deletedAt',
      tasks: 'id, noteId, completed, *tags, createdAt, updatedAt',
      tags: 'name, usageCount, lastUsedAt',
      syncMeta: 'key'
    }).upgrade(tx => {
      // Add sync fields to existing notes
      return tx.table('notes').toCollection().modify(note => {
        note._syncStatus = 'pending';
        note._localUpdatedAt = note.updatedAt || new Date();
      });
    });

    // Version 5: Add sync tracking fields to tasks
    this.version(5).stores({
      notes: 'id, title, *tags, lastOpenedAt, createdAt, updatedAt, _syncStatus, deletedAt',
      tasks: 'id, noteId, completed, *tags, createdAt, updatedAt, _syncStatus, deletedAt',
      tags: 'name, usageCount, lastUsedAt',
      syncMeta: 'key'
    }).upgrade(tx => {
      // Add sync fields to existing tasks
      return tx.table('tasks').toCollection().modify(task => {
        task._syncStatus = 'pending';
        task._localUpdatedAt = task.updatedAt || new Date();
        task.appType = 'notes';
      });
    });

    // Version 6: Add dueDate index to tasks
    this.version(6).stores({
      notes: 'id, title, *tags, lastOpenedAt, createdAt, updatedAt, _syncStatus, deletedAt',
      tasks: 'id, noteId, completed, *tags, dueDate, createdAt, updatedAt, _syncStatus, deletedAt',
      tags: 'name, usageCount, lastUsedAt',
      syncMeta: 'key'
    }).upgrade(tx => {
      // Add displayTitle to existing tasks (copy from title)
      return tx.table('tasks').toCollection().modify(task => {
        if (!task.displayTitle) {
          task.displayTitle = task.title;
        }
        task._syncStatus = 'pending';
      });
    });

    // Version 7: Add blockId index for cross-app sync, clear sync token
    this.version(7).stores({
      notes: 'id, title, *tags, lastOpenedAt, createdAt, updatedAt, _syncStatus, deletedAt',
      tasks: 'id, noteId, blockId, completed, *tags, dueDate, createdAt, updatedAt, _syncStatus, deletedAt',
      tags: 'name, usageCount, lastUsedAt',
      syncMeta: 'key'
    }).upgrade(async tx => {
      // Clear sync token to force full re-sync with blockId field
      await tx.table('syncMeta').delete('lastSyncToken');

      // Mark all existing tasks as pending so they get pushed to server
      // This ensures tasks created before cross-app sync get synced
      await tx.table('tasks').toCollection().modify(task => {
        task._syncStatus = 'pending';
      });

      console.log('Cleared sync token and marked tasks pending for schema upgrade to v7');
    });
  }
}

export const db = new NotesDatabase();
