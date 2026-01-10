import { db } from './db';

export async function toggleTask(taskId: string): Promise<void> {
  const task = await db.tasks.get(taskId);
  if (!task) return;

  const newCompleted = !task.completed;

  // Update task entity
  await db.tasks.update(taskId, {
    completed: newCompleted,
    updatedAt: new Date()
  });

  // Update note content
  const note = await db.notes.get(task.noteId);
  if (!note) return;

  const lines = note.content.split('\n');
  const line = lines[task.lineNumber];

  if (line) {
    // Replace [ ] with [x] or vice versa
    const updatedLine = newCompleted
      ? line.replace(/\[\s\]/, '[x]')
      : line.replace(/\[x\]/i, '[ ]');

    lines[task.lineNumber] = updatedLine;
    const updatedContent = lines.join('\n');

    await db.notes.update(task.noteId, {
      content: updatedContent,
      updatedAt: new Date()
    });
  }
}
