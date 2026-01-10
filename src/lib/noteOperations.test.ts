import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { createNote, updateNoteContent, getMostRecentNote } from './noteOperations';

describe('Note Operations', () => {
  beforeEach(async () => {
    await db.notes.clear();
    await db.tasks.clear();
    await db.tags.clear();
  });

  it('should create a new note', async () => {
    const note = await createNote('# My Note\nContent with #tag');

    expect(note.id).toBeDefined();
    expect(note.title).toBe('My Note');
    expect(note.content).toBe('# My Note\nContent with #tag');
    expect(note.tags).toEqual(['tag']);
  });

  it('should update note content and extract tasks', async () => {
    const note = await createNote('Initial content');

    await updateNoteContent(note.id, '# Updated\n[ ] Task #work');

    const updated = await db.notes.get(note.id);
    expect(updated?.title).toBe('Updated');
    expect(updated?.tags).toEqual(['work']);

    const tasks = await db.tasks.where({ noteId: note.id }).toArray();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Task #work');
  });

  it('should get most recent note', async () => {
    await createNote('First');
    await new Promise(resolve => setTimeout(resolve, 10));
    const note2 = await createNote('Second');

    const recent = await getMostRecentNote();
    expect(recent?.id).toBe(note2.id);
  });
});
