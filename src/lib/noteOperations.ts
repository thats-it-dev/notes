import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import type { Note, Task } from './types';
import { parseContent } from './parser';

export async function createNote(content: string = ''): Promise<Note> {
  const parsed = parseContent(content);
  const now = new Date();

  const note: Note = {
    id: uuidv4(),
    title: parsed.title,
    content,
    tags: parsed.tags,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
  };

  await db.notes.add(note);

  // Create tasks
  for (const taskData of parsed.tasks) {
    await createTask(note.id, taskData.title, taskData.completed, taskData.lineNumber, taskData.tags);
  }

  // Update tag counts
  await updateTagCounts(parsed.tags);

  return note;
}

export async function updateNoteContent(noteId: string, content: string): Promise<void> {
  const note = await db.notes.get(noteId);
  if (!note) return;

  const oldTags = note.tags;
  const parsed = parseContent(content);
  const now = new Date();

  // Update note
  await db.notes.update(noteId, {
    title: parsed.title,
    content,
    tags: parsed.tags,
    updatedAt: now,
  });

  // Update tag counts (decrement old, increment new)
  await decrementTagCounts(oldTags);
  await updateTagCounts(parsed.tags);

  // Reconcile tasks
  await reconcileTasks(noteId, parsed.tasks);
}

export async function getMostRecentNote(): Promise<Note | undefined> {
  const notes = await db.notes.orderBy('lastOpenedAt').reverse().toArray();
  return notes[0];
}

export async function updateNoteLastOpened(noteId: string): Promise<void> {
  await db.notes.update(noteId, { lastOpenedAt: new Date() });
}

async function createTask(
  noteId: string,
  title: string,
  completed: boolean,
  lineNumber: number,
  tags: string[]
): Promise<Task> {
  const now = new Date();
  const task: Task = {
    id: uuidv4(),
    title,
    completed,
    noteId,
    lineNumber,
    tags,
    createdAt: now,
    updatedAt: now,
  };

  await db.tasks.add(task);
  await updateTagCounts(tags);

  return task;
}

async function reconcileTasks(
  noteId: string,
  newTasks: Array<{ title: string; completed: boolean; lineNumber: number; tags: string[] }>
): Promise<void> {
  const existingTasks = await db.tasks.where({ noteId }).toArray();

  // Simple strategy: delete all old tasks, create new ones
  // TODO: Implement fuzzy matching for task identity preservation
  for (const task of existingTasks) {
    await db.tasks.delete(task.id);
    await decrementTagCounts(task.tags);
  }

  for (const taskData of newTasks) {
    await createTask(noteId, taskData.title, taskData.completed, taskData.lineNumber, taskData.tags);
  }
}

async function updateTagCounts(tags: string[]): Promise<void> {
  for (const tagName of tags) {
    const existing = await db.tags.get(tagName);
    if (existing) {
      await db.tags.update(tagName, {
        usageCount: existing.usageCount + 1,
        lastUsedAt: new Date(),
      });
    } else {
      await db.tags.add({
        name: tagName,
        usageCount: 1,
        lastUsedAt: new Date(),
      });
    }
  }
}

async function decrementTagCounts(tags: string[]): Promise<void> {
  for (const tagName of tags) {
    const existing = await db.tags.get(tagName);
    if (existing) {
      const newCount = existing.usageCount - 1;
      if (newCount <= 0) {
        await db.tags.delete(tagName);
      } else {
        await db.tags.update(tagName, { usageCount: newCount });
      }
    }
  }
}
