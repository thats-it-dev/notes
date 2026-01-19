import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { v4 as uuidv4 } from 'uuid';

describe('Database', () => {
  beforeEach(async () => {
    await db.notes.clear();
    await db.tasks.clear();
    await db.tags.clear();
  });

  it('should create a note', async () => {
    const now = new Date();
    const note = {
      id: uuidv4(),
      title: 'Test Note',
      content: [],
      markdownCache: '# Test\nContent here',
      tags: [],
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      _syncStatus: 'pending' as const,
      _localUpdatedAt: now,
    };

    await db.notes.add(note);
    const retrieved = await db.notes.get(note.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe('Test Note');
  });
});
