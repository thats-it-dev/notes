import { db } from './db';
import { updateTaskInBlocks } from './blockNoteConverters';

export async function toggleTask(taskId: string): Promise<void> {
  const task = await db.tasks.get(taskId);
  if (!task) return;

  const newCompleted = !task.completed;

  // Update task entity
  await db.tasks.update(taskId, {
    completed: newCompleted,
    updatedAt: new Date()
  });

  // Update note content - find and update the block
  const note = await db.notes.get(task.noteId);
  if (!note) return;

  const updatedContent = updateTaskInBlocks(
    note.content,
    task.blockId,
    newCompleted
  );

  await db.notes.update(task.noteId, {
    content: updatedContent,
    updatedAt: new Date()
  });
}
