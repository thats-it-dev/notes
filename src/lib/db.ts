import Dexie, { Table } from 'dexie';
import { Note, Task, Tag } from './types';

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
  }
}

export const db = new NotesDatabase();
