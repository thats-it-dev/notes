import Dexie, { type Table } from 'dexie';
import type { Note, Task, Tag } from './types';

export class NotesDatabase extends Dexie {
  notes!: Table<Note, string>;
  tasks!: Table<Task, string>;
  tags!: Table<Tag, string>;

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
  }
}

export const db = new NotesDatabase();
