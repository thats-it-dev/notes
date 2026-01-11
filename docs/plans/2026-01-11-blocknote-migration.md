# BlockNote Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace custom block editor with BlockNote library to eliminate editing bugs and reduce maintenance burden.

**Architecture:** BlockNote stores notes as JSON, we extract tasks/tags via debounced parsing, generate markdown cache for search. Bi-directional sync between editor and task panel.

**Tech Stack:** BlockNote, React, TypeScript, Dexie, Tailwind

---

## Task 1: Install BlockNote Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install BlockNote packages**

Run:
```bash
pnpm add @blocknote/core @blocknote/react @blocknote/mantine
```

Expected: Packages installed successfully

**Step 2: Install BlockNote styles dependency**

BlockNote uses Mantine for styling, ensure CSS is available.

**Step 3: Verify installation**

Run:
```bash
pnpm list @blocknote/core @blocknote/react
```

Expected: Shows installed versions

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: add BlockNote editor library"
```

---

## Task 2: Update Dexie Schema and Types

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/db.ts`

**Step 1: Update Note interface**

In `src/lib/types.ts`, find the Note interface and update:

```typescript
export interface Note {
  id: string;
  title: string;
  content: any; // BlockNote JSON structure (use any for now)
  markdownCache: string; // Generated markdown for search
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  lastOpenedAt: Date;
}
```

**Step 2: Update Task interface**

In `src/lib/types.ts`, update the Task interface:

```typescript
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  noteId: string;
  blockId: string; // Changed from lineNumber
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

**Step 3: Update Dexie schema version**

In `src/lib/db.ts`, update the schema:

```typescript
this.version(2).stores({
  notes: 'id, title, *tags, lastOpenedAt, createdAt, updatedAt',
  tasks: 'id, noteId, completed, *tags, createdAt, updatedAt',
  tags: 'name, usageCount, lastUsedAt'
}).upgrade(tx => {
  // Clean slate migration - wipe all data
  return tx.table('notes').clear()
    .then(() => tx.table('tasks').clear())
    .then(() => tx.table('tags').clear());
});
```

**Step 4: Verify TypeScript compiles**

Run:
```bash
pnpm build
```

Expected: Build succeeds (ignore runtime warnings for now)

**Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/db.ts
git commit -m "refactor: update schema for BlockNote JSON storage"
```

---

## Task 3: Create BlockNote Converters - Part 1 (Helpers)

**Files:**
- Create: `src/lib/blockNoteConverters.ts`

**Step 1: Create file with basic types and helper**

Create `src/lib/blockNoteConverters.ts`:

```typescript
import type { Block, InlineContent, PartialBlock } from '@blocknote/core';

export interface ExtractedTask {
  blockId: string;
  title: string;
  completed: boolean;
  tags: string[];
}

// Helper to extract plain text from inline content
export function getPlainText(content: InlineContent[] | undefined): string {
  if (!content) return '';

  return content.map(item => {
    if (item.type === 'text') {
      return item.text || '';
    }
    if (item.type === 'link') {
      // Recursively get text from link content
      return getPlainText(item.content as InlineContent[]);
    }
    // Future: handle custom tag inline content
    return '';
  }).join('');
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
pnpm build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/blockNoteConverters.ts
git commit -m "feat: add BlockNote converters with plain text helper"
```

---

## Task 4: Create BlockNote Converters - Part 2 (Task Extraction)

**Files:**
- Modify: `src/lib/blockNoteConverters.ts`

**Step 1: Add task extraction function**

In `src/lib/blockNoteConverters.ts`, add after getPlainText:

```typescript
export function extractTasks(blocks: Block[]): ExtractedTask[] {
  const tasks: ExtractedTask[] = [];

  function traverse(block: Block) {
    // BlockNote uses different block types - check for checkListItem
    if (block.type === 'checkListItem') {
      const title = getPlainText(block.content);
      tasks.push({
        blockId: block.id,
        title,
        completed: (block.props?.checked as boolean) || false,
        tags: [] // Will extract tags later
      });
    }

    // Recursively check children
    if (block.children && Array.isArray(block.children)) {
      block.children.forEach(child => traverse(child as Block));
    }
  }

  blocks.forEach(traverse);
  return tasks;
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
pnpm build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/blockNoteConverters.ts
git commit -m "feat: add task extraction from BlockNote JSON"
```

---

## Task 5: Create BlockNote Converters - Part 3 (Markdown Generation)

**Files:**
- Modify: `src/lib/blockNoteConverters.ts`

**Step 1: Add markdown conversion functions**

In `src/lib/blockNoteConverters.ts`, add:

```typescript
export function blocksToMarkdown(blocks: Block[]): string {
  return blocks.map(blockToMarkdown).filter(Boolean).join('\n\n');
}

function blockToMarkdown(block: Block): string {
  const content = getPlainText(block.content);

  switch (block.type) {
    case 'heading': {
      const level = (block.props?.level as number) || 1;
      return `${'#'.repeat(level)} ${content}`;
    }

    case 'checkListItem': {
      const checked = block.props?.checked ? 'x' : ' ';
      return `- [${checked}] ${content}`;
    }

    case 'bulletListItem':
      return `- ${content}`;

    case 'numberedListItem':
      return `1. ${content}`;

    case 'paragraph':
      return content;

    default:
      return content;
  }
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
pnpm build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/blockNoteConverters.ts
git commit -m "feat: add markdown generation from BlockNote JSON"
```

---

## Task 6: Create BlockNote Converters - Part 4 (Update Task in Blocks)

**Files:**
- Modify: `src/lib/blockNoteConverters.ts`

**Step 1: Add function to update task completion in blocks**

In `src/lib/blockNoteConverters.ts`, add:

```typescript
export function updateTaskInBlocks(
  blocks: Block[],
  blockId: string,
  completed: boolean
): Block[] {
  function updateBlock(block: Block): Block {
    if (block.id === blockId && block.type === 'checkListItem') {
      return {
        ...block,
        props: {
          ...block.props,
          checked: completed
        }
      };
    }

    if (block.children && Array.isArray(block.children)) {
      return {
        ...block,
        children: block.children.map(child => updateBlock(child as Block))
      };
    }

    return block;
  }

  return blocks.map(updateBlock);
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
pnpm build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/blockNoteConverters.ts
git commit -m "feat: add function to update task completion in blocks"
```

---

## Task 7: Update Task Operations for Bi-Directional Sync

**Files:**
- Modify: `src/lib/taskOperations.ts`

**Step 1: Import BlockNote converter**

In `src/lib/taskOperations.ts`, add import at top:

```typescript
import { updateTaskInBlocks } from './blockNoteConverters';
```

**Step 2: Update toggleTask function**

Replace the entire `toggleTask` function:

```typescript
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
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
pnpm build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/lib/taskOperations.ts
git commit -m "refactor: update toggleTask for BlockNote bi-directional sync"
```

---

## Task 8: Update Note Operations for BlockNote Content

**Files:**
- Modify: `src/lib/noteOperations.ts`

**Step 1: Import BlockNote converters**

In `src/lib/noteOperations.ts`, add imports:

```typescript
import { extractTasks, blocksToMarkdown } from './blockNoteConverters';
import type { Block } from '@blocknote/core';
```

**Step 2: Update createNote function**

Replace `createNote` function:

```typescript
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
```

**Step 3: Update createTask signature**

Update the `createTask` function signature to use `blockId` instead of `lineNumber`:

```typescript
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
```

**Step 4: Add updateNoteContent function**

Add new function to update note with BlockNote content:

```typescript
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
```

**Step 5: Remove old updateNoteContent function**

Delete the old `updateNoteContent` function that parsed markdown.

**Step 6: Verify TypeScript compiles**

Run:
```bash
pnpm build
```

Expected: Build succeeds (may have some errors from other files not yet updated)

**Step 7: Commit**

```bash
git add src/lib/noteOperations.ts
git commit -m "refactor: update note operations for BlockNote content"
```

---

## Task 9: Create Basic BlockNote Schema

**Files:**
- Create: `src/lib/blockNoteSchema.ts`

**Step 1: Create schema file**

Create `src/lib/blockNoteSchema.ts`:

```typescript
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';

// Use default schema for now
// We'll add custom tag inline content later
export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
  },
});

export type CustomSchema = typeof schema;
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
pnpm build
```

Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/blockNoteSchema.ts
git commit -m "feat: create BlockNote schema configuration"
```

---

## Task 10: Replace NoteEditor with BlockNoteView

**Files:**
- Modify: `src/components/NoteEditor.tsx`

**Step 1: Update imports**

Replace all imports in `src/components/NoteEditor.tsx`:

```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { updateNoteContent } from '../lib/noteOperations';
import { useMemo } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import type { Block } from '@blocknote/core';
import { schema } from '../lib/blockNoteSchema';
```

**Step 2: Replace component implementation**

Replace the entire component:

```typescript
interface NoteEditorProps {
  noteId: string;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const note = useLiveQuery(() => db.notes.get(noteId), [noteId]);

  const editor = useCreateBlockNote({
    schema,
    initialContent: note?.content,
  });

  const debouncedUpdate = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (blocks: Block[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        updateNoteContent(noteId, blocks);
      }, 300);
    };
  }, [noteId]);

  if (!note) {
    return <div>Loading note...</div>;
  }

  return (
    <BlockNoteView
      editor={editor}
      onChange={() => {
        const blocks = editor.document;
        debouncedUpdate(blocks);
      }}
    />
  );
}
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
pnpm build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/NoteEditor.tsx
git commit -m "refactor: replace custom editor with BlockNoteView"
```

---

## Task 11: Update App.tsx Welcome Note

**Files:**
- Modify: `src/App.tsx`

**Step 1: Import Block type**

In `src/App.tsx`, add import:

```typescript
import type { Block } from '@blocknote/core';
```

**Step 2: Update welcome note content**

Replace the `createNote` call in `App.tsx`:

```typescript
const welcomeBlocks: Block[] = [
  {
    id: '1',
    type: 'heading',
    props: { level: 1 },
    content: [{ type: 'text', text: 'Welcome to Notes', styles: {} }],
    children: [],
  },
  {
    id: '2',
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text: 'Start typing to create your first note.', styles: {} }],
    children: [],
  },
  {
    id: '3',
    type: 'heading',
    props: { level: 2 },
    content: [{ type: 'text', text: 'Features', styles: {} }],
    children: [],
  },
  {
    id: '4',
    type: 'bulletListItem',
    props: {},
    content: [{ type: 'text', text: 'Block-based editing', styles: {} }],
    children: [],
  },
  {
    id: '5',
    type: 'checkListItem',
    props: { checked: false },
    content: [{ type: 'text', text: 'Create tasks with checkboxes', styles: {} }],
    children: [],
  },
  {
    id: '6',
    type: 'paragraph',
    props: {},
    content: [{ type: 'text', text: 'Use Cmd+K to search', styles: {} }],
    children: [],
  },
];

const welcomeNote = await createNote(welcomeBlocks);
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
pnpm build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: update welcome note to BlockNote format"
```

---

## Task 12: Remove Old Custom Components

**Files:**
- Delete: `src/components/BlocksManager.tsx`
- Delete: `src/components/BlockEditor.tsx`
- Delete: `src/components/BlockRenderer.tsx`
- Delete: `src/components/Block.tsx`
- Delete: `src/components/blocks/` (entire directory)
- Delete: `src/lib/blockParser.ts`
- Delete: `src/lib/blockTypes.ts`

**Step 1: Delete component files**

Run:
```bash
rm src/components/BlocksManager.tsx
rm src/components/BlockEditor.tsx
rm src/components/BlockRenderer.tsx
rm src/components/Block.tsx
rm -rf src/components/blocks
```

**Step 2: Delete lib files**

Run:
```bash
rm src/lib/blockParser.ts
rm src/lib/blockTypes.ts
```

**Step 3: Delete test files if they exist**

Run:
```bash
rm src/lib/blockParser.test.ts 2>/dev/null || true
```

**Step 4: Verify build works**

Run:
```bash
pnpm build
```

Expected: Build succeeds

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove old custom block editor components"
```

---

## Task 13: Manual Testing - Basic Functionality

**No files modified - testing only**

**Step 1: Clear browser data**

Open browser DevTools → Application → IndexedDB → Right-click NotesDatabase → Delete

This ensures schema v2 migration runs.

**Step 2: Start dev server**

Run:
```bash
pnpm dev
```

**Step 3: Test basic editing**

- App should load with welcome note
- Click into editor - should be able to type
- Type "/" - slash menu should appear
- Create a heading, paragraph, task
- Verify text appears correctly

**Step 4: Test task creation**

- Type a task: `- [ ] Test task`
- Should render as checkbox when not focused
- Click checkbox - should toggle

**Step 5: Test task panel**

- Open task panel (Cmd+K → Toggle Tasks)
- Verify task appears in panel
- Toggle task in panel
- Verify it toggles in note editor

**Step 6: Test persistence**

- Refresh page
- Verify note content persists
- Verify tasks persist

**Step 7: Document any issues**

If issues found, note them for fixes. Otherwise, ready to commit.

**Step 8: Create summary commit if needed**

If any small fixes were made during testing:

```bash
git add .
git commit -m "fix: address minor issues from manual testing"
```

---

## Summary

**What we built:**
- Migrated from custom block editor to BlockNote
- Implemented bi-directional task sync (editor ↔ task panel)
- Generated markdown cache for search/export
- Removed 500+ lines of complex editor code

**Architecture:**
- BlockNote handles all editing UX
- Debounced extraction updates tasks/tags tables
- Task panel toggles update BlockNote JSON
- Clean separation of concerns

**Next steps (future work):**
- Add custom tag inline content type
- Implement tag input rules (#tagname)
- Add tag filtering in CommandPalette
- Enhance markdown export
