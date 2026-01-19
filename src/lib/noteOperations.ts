import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import type { Note, Task } from './types';
import { extractTasks, blocksToMarkdown, extractTags } from './blockNoteConverters';
import type { Block } from '@blocknote/core';

// Fixed UUID for welcome note - same across all devices
const WELCOME_NOTE_ID = '00000000-0000-0000-0000-000000000001';

export async function createNote(initialBlocks?: Block[], options?: { isWelcomeNote?: boolean }): Promise<Note> {
  const now = new Date();
  const blocks = initialBlocks || [];
  const markdownCache = blocksToMarkdown(blocks);
  const title = extractTitle(markdownCache);
  const tags = extractTags(markdownCache);

  // Use fixed ID for welcome note, random for others
  const noteId = options?.isWelcomeNote ? WELCOME_NOTE_ID : uuidv4();

  // For welcome note, check if it already exists (from sync)
  if (options?.isWelcomeNote) {
    const existing = await db.notes.get(noteId);
    if (existing) {
      // Welcome note already exists, just return it
      return existing;
    }
  }

  const note: Note = {
    id: noteId,
    title,
    content: blocks,
    markdownCache,
    tags,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    // Sync tracking - welcome note doesn't need to sync, others do
    _syncStatus: options?.isWelcomeNote ? 'synced' : 'pending',
    _localUpdatedAt: now,
  };

  await db.notes.add(note);

  // Update tag counts
  await updateTagCounts(tags);

  // Create tasks from blocks
  const tasks = extractTasks(blocks);
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

  // Extract #hashtags from content
  const newTags = extractTags(markdownCache);

  const now = new Date();

  // Update note and mark as pending sync
  await db.notes.update(noteId, {
    title,
    content: blocks,
    markdownCache,
    tags: newTags,
    updatedAt: now,
    _syncStatus: 'pending',
    _localUpdatedAt: now,
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
      await db.tags.put({
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

// Soft delete a note (marks as deleted for sync, then removes from local view)
export async function deleteNote(noteId: string): Promise<void> {
  const note = await db.notes.get(noteId);
  if (!note) return;

  const now = new Date();

  // Soft delete by setting deletedAt
  await db.notes.update(noteId, {
    deletedAt: now,
    updatedAt: now,
    _syncStatus: 'pending',
    _localUpdatedAt: now,
  });

  // Clean up related tasks
  const tasks = await db.tasks.where({ noteId }).toArray();
  for (const task of tasks) {
    await db.tasks.delete(task.id);
    await decrementTagCounts(task.tags);
  }

  // Decrement tag counts
  await decrementTagCounts(note.tags);
}

// Get all notes that need to be synced
export async function getPendingNotes(): Promise<Note[]> {
  return db.notes.where('_syncStatus').equals('pending').toArray();
}

// Mark notes as synced after successful push
export async function markNotesSynced(noteIds: string[]): Promise<void> {
  await db.notes.where('id').anyOf(noteIds).modify({ _syncStatus: 'synced' });
}

// Mark a note as having a conflict
export async function markNoteConflict(noteId: string): Promise<void> {
  await db.notes.update(noteId, { _syncStatus: 'conflict' });
}
