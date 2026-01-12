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
    const note = await createNote();

    expect(note.id).toBeDefined();
    expect(note.title).toBe('Untitled');
    expect(note.content).toEqual([]);
    expect(note.markdownCache).toBe('');
    expect(note.tags).toEqual([]);
  });

  it('should update note content and extract tasks', async () => {
    const note = await createNote();

    const blocks = [
      {
        id: '1',
        type: 'checkListItem',
        props: { checked: false },
        content: [{ type: 'text', text: 'Task', styles: {} }],
        children: [],
      }
    ] as any;

    await updateNoteContent(note.id, blocks);

    const updated = await db.notes.get(note.id);
    expect(updated?.content).toEqual(blocks);

    const tasks = await db.tasks.where({ noteId: note.id }).toArray();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Task');
  });

  it('should get most recent note', async () => {
    await createNote();
    await new Promise(resolve => setTimeout(resolve, 10));
    const note2 = await createNote();

    const recent = await getMostRecentNote();
    expect(recent?.id).toBe(note2.id);
  });

  it('should extract tags from content', async () => {
    const note = await createNote();

    const blocks = [
      {
        id: '1',
        type: 'paragraph',
        props: {},
        content: [{ type: 'text', text: 'Hello #world this is #test', styles: {} }],
        children: [],
      }
    ] as any;

    await updateNoteContent(note.id, blocks);

    const updated = await db.notes.get(note.id);
    expect(updated?.tags).toContain('world');
    expect(updated?.tags).toContain('test');

    // Tags should also be in the tags table
    const worldTag = await db.tags.get('world');
    expect(worldTag).toBeDefined();
    expect(worldTag?.usageCount).toBe(1);
  });
});
