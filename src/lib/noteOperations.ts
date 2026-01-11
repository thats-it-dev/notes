import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import type { Note, Task } from './types';
import { extractTasks, blocksToMarkdown } from './blockNoteConverters';
import type { Block } from '@blocknote/core';

export async function createNote(initialBlocks: Block[] = []): Promise<Note> {
  const now = new Date();
  const markdownCache = blocksToMarkdown(initialBlocks);
  const title = extractTitle(markdownCache);

  const note: Note = {
    id: uuidv4(),
    title,
    content: initialBlocks,
    markdownCache,
    tags: [],
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
  };

  await db.notes.add(note);

  // Create tasks from blocks
  const tasks = extractTasks(initialBlocks);
  for (const taskData of tasks) {
    await createTask(
      note.id,
      taskData.title,
      taskData.completed,
      taskData.blockId,
      taskData.tags
    );
  }

  return note;
}

function extractTitle(markdown: string): string {
  const firstLine = markdown.split('\n')[0];
  if (firstLine?.startsWith('# ')) {
    return firstLine.substring(2).trim();
  }
  return 'Untitled';
}

export async function updateNoteContent(
  noteId: string,
  blocks: Block[]
): Promise<void> {
  const note = await db.notes.get(noteId);
  if (!note) return;

  const oldTags = note.tags;
  const markdownCache = blocksToMarkdown(blocks);
  const title = extractTitle(markdownCache);
  const tasks = extractTasks(blocks);

  // Extract tags (for now, empty - we'll add tag extraction later)
  const newTags: string[] = [];

  const now = new Date();

  // Update note
  await db.notes.update(noteId, {
    title,
    content: blocks,
    markdownCache,
    tags: newTags,
    updatedAt: now,
  });

  // Update tag counts
  await decrementTagCounts(oldTags);
  await updateTagCounts(newTags);

  // Reconcile tasks
  await reconcileTasks(noteId, tasks);
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
  blockId: string,
  tags: string[]
): Promise<Task> {
  const now = new Date();
  const task: Task = {
    id: uuidv4(),
    title,
    completed,
    noteId,
    blockId,
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
  newTasks: Array<{ title: string; completed: boolean; blockId: string; tags: string[] }>
): Promise<void> {
  const existingTasks = await db.tasks.where({ noteId }).toArray();

  // Simple strategy: delete all old tasks, create new ones
  for (const task of existingTasks) {
    await db.tasks.delete(task.id);
    await decrementTagCounts(task.tags);
  }

  for (const taskData of newTasks) {
    await createTask(noteId, taskData.title, taskData.completed, taskData.blockId, taskData.tags);
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
