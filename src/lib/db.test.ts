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
    const note = {
      id: uuidv4(),
      title: 'Test Note',
      content: [],
      markdownCache: '# Test\nContent here',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastOpenedAt: new Date(),
    };

    await db.notes.add(note);
    const retrieved = await db.notes.get(note.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe('Test Note');
  });
});
