# Notes App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a minimal, local-first note-taking app with markdown editing, inline tasks, and tag-based organization.

**Architecture:** Milkdown for hybrid markdown editing, Dexie for IndexedDB storage, Zustand for UI state, content parser extracts tasks/tags from markdown, reactive queries bridge database to UI.

**Tech Stack:** React 19, TypeScript, Milkdown, Dexie, Zustand, @thatsit/ui, Vite

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install Milkdown dependencies**

```bash
pnpm add @milkdown/core @milkdown/ctx @milkdown/prose @milkdown/react @milkdown/preset-commonmark @milkdown/plugin-listener @milkdown/plugin-history @milkdown/theme-nord
```

**Step 2: Install command palette library**

```bash
pnpm add cmdk
```

**Step 3: Install utility libraries**

```bash
pnpm add uuid fuse.js
pnpm add -D @types/uuid
```

**Step 4: Verify installation**

Run: `pnpm install`
Expected: All dependencies installed successfully

---

## Task 2: Database Setup

**Files:**
- Create: `src/lib/db.ts`
- Create: `src/lib/types.ts`

**Step 1: Create TypeScript types**

In `src/lib/types.ts`:

```typescript
export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  lastOpenedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  noteId: string;
  lineNumber: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  name: string;
  usageCount: number;
  lastUsedAt: Date;
}

export interface ParsedContent {
  title: string;
  tags: string[];
  tasks: Array<{
    title: string;
    completed: boolean;
    lineNumber: number;
    tags: string[];
  }>;
}
```

**Step 2: Create Dexie database schema**

In `src/lib/db.ts`:

```typescript
import Dexie, { Table } from 'dexie';
import { Note, Task, Tag } from './types';

export class NotesDatabase extends Dexie {
  notes!: Table<Note, string>;
  tasks!: Table<Task, string>;
  tags!: Table<Tag, string>;

  constructor() {
    super('NotesDatabase');

    this.version(1).stores({
      notes: 'id, title, *tags, lastOpenedAt, createdAt, updatedAt',
      tasks: 'id, noteId, completed, *tags, createdAt, updatedAt',
      tags: 'name, usageCount, lastUsedAt'
    });
  }
}

export const db = new NotesDatabase();
```

**Step 3: Verify database setup**

Create test file `src/lib/db.test.ts`:

```typescript
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
      content: '# Test\nContent here',
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
```

**Step 4: Install Vitest**

```bash
pnpm add -D vitest
```

**Step 5: Add test script to package.json**

In `package.json`, add to scripts:

```json
"test": "vitest"
```

**Step 6: Run test**

Run: `pnpm test`
Expected: Test passes

**Step 7: Commit**

```bash
git add src/lib/db.ts src/lib/types.ts src/lib/db.test.ts package.json pnpm-lock.yaml
git commit -m "feat: add database schema and types"
```

---

## Task 3: Content Parser

**Files:**
- Create: `src/lib/parser.ts`
- Create: `src/lib/parser.test.ts`

**Step 1: Write failing parser tests**

In `src/lib/parser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseContent } from './parser';

describe('Content Parser', () => {
  it('should extract title from first heading', () => {
    const content = '# My Note\nContent here';
    const result = parseContent(content);
    expect(result.title).toBe('My Note');
  });

  it('should extract title from first line if no heading', () => {
    const content = 'This is my note\nMore content';
    const result = parseContent(content);
    expect(result.title).toBe('This is my note');
  });

  it('should truncate long titles', () => {
    const content = 'a'.repeat(600);
    const result = parseContent(content);
    expect(result.title.length).toBeLessThanOrEqual(500);
  });

  it('should extract hashtags', () => {
    const content = 'Note with #work and #urgent tags';
    const result = parseContent(content);
    expect(result.tags).toEqual(['work', 'urgent']);
  });

  it('should deduplicate hashtags', () => {
    const content = '#work is #work and #work again';
    const result = parseContent(content);
    expect(result.tags).toEqual(['work']);
  });

  it('should extract unchecked tasks', () => {
    const content = '[ ] Do something #work\n[ ] Another task';
    const result = parseContent(content);
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0].title).toBe('Do something #work');
    expect(result.tasks[0].completed).toBe(false);
    expect(result.tasks[0].tags).toEqual(['work']);
  });

  it('should extract checked tasks', () => {
    const content = '[x] Done task\n[X] Also done';
    const result = parseContent(content);
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0].completed).toBe(true);
    expect(result.tasks[1].completed).toBe(true);
  });

  it('should extract task line numbers', () => {
    const content = 'Line 1\nLine 2\n[ ] Task on line 3\nLine 4';
    const result = parseContent(content);
    expect(result.tasks[0].lineNumber).toBe(2); // 0-indexed
  });

  it('should handle tasks with indentation', () => {
    const content = '  [ ] Indented task\n\t[ ] Tab indented';
    const result = parseContent(content);
    expect(result.tasks).toHaveLength(2);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test parser`
Expected: All tests FAIL (parseContent not defined)

**Step 3: Implement parser**

In `src/lib/parser.ts`:

```typescript
import { ParsedContent } from './types';

const HASHTAG_REGEX = /#[\w-]+/g;
const TASK_REGEX = /^[\s-]*\[( |x|X)\]\s+(.+)$/;
const HEADING_REGEX = /^#+\s+(.+)$/;

export function parseContent(content: string): ParsedContent {
  const lines = content.split('\n');

  // Extract title
  let title = 'Untitled';
  const firstLine = lines[0]?.trim();
  if (firstLine) {
    const headingMatch = firstLine.match(HEADING_REGEX);
    if (headingMatch) {
      title = headingMatch[1];
    } else {
      title = firstLine;
    }
    // Truncate to 500 chars
    if (title.length > 500) {
      title = title.substring(0, 500);
    }
  }

  // Extract all hashtags
  const allHashtags = content.match(HASHTAG_REGEX) || [];
  const uniqueTags = [...new Set(allHashtags.map(tag => tag.substring(1)))];

  // Extract tasks
  const tasks = lines
    .map((line, index) => {
      const match = line.match(TASK_REGEX);
      if (!match) return null;

      const [, checkbox, taskText] = match;
      const completed = checkbox.toLowerCase() === 'x';

      // Extract hashtags from this line
      const taskHashtags = taskText.match(HASHTAG_REGEX) || [];
      const taskTags = taskHashtags.map(tag => tag.substring(1));

      return {
        title: taskText,
        completed,
        lineNumber: index,
        tags: taskTags,
      };
    })
    .filter((task): task is NonNullable<typeof task> => task !== null);

  return {
    title,
    tags: uniqueTags,
    tasks,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test parser`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/parser.ts src/lib/parser.test.ts
git commit -m "feat: add content parser for tags and tasks"
```

---

## Task 4: Zustand Store

**Files:**
- Create: `src/store/appStore.ts`

**Step 1: Create Zustand store**

In `src/store/appStore.ts`:

```typescript
import { create } from 'zustand';

interface AppStore {
  currentNoteId: string | null;
  taskPanelOpen: boolean;
  commandPaletteOpen: boolean;
  selectedTags: string[];
  taskFilter: 'all' | 'active' | 'completed';

  setCurrentNote: (id: string | null) => void;
  toggleTaskPanel: () => void;
  setTaskPanelOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  addTagFilter: (tag: string) => void;
  removeTagFilter: (tag: string) => void;
  clearTagFilters: () => void;
  setTaskFilter: (filter: 'all' | 'active' | 'completed') => void;
}

export const useAppStore = create<AppStore>((set) => ({
  currentNoteId: null,
  taskPanelOpen: false,
  commandPaletteOpen: false,
  selectedTags: [],
  taskFilter: 'all',

  setCurrentNote: (id) => set({ currentNoteId: id }),

  toggleTaskPanel: () => set((state) => ({ taskPanelOpen: !state.taskPanelOpen })),

  setTaskPanelOpen: (open) => set({ taskPanelOpen: open }),

  toggleCommandPalette: () => set((state) => ({
    commandPaletteOpen: !state.commandPaletteOpen
  })),

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  addTagFilter: (tag) => set((state) => ({
    selectedTags: [...state.selectedTags, tag]
  })),

  removeTagFilter: (tag) => set((state) => ({
    selectedTags: state.selectedTags.filter(t => t !== tag)
  })),

  clearTagFilters: () => set({ selectedTags: [] }),

  setTaskFilter: (filter) => set({ taskFilter: filter }),
}));
```

**Step 2: Verify store compiles**

Run: `pnpm build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/store/appStore.ts
git commit -m "feat: add Zustand store for app state"
```

---

## Task 5: Database Operations

**Files:**
- Create: `src/lib/noteOperations.ts`
- Create: `src/lib/noteOperations.test.ts`

**Step 1: Write tests for note operations**

In `src/lib/noteOperations.test.ts`:

```typescript
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
    const note1 = await createNote('First');
    await new Promise(resolve => setTimeout(resolve, 10));
    const note2 = await createNote('Second');

    const recent = await getMostRecentNote();
    expect(recent?.id).toBe(note2.id);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test noteOperations`
Expected: Tests FAIL

**Step 3: Implement note operations**

In `src/lib/noteOperations.ts`:

```typescript
import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { Note, Task } from './types';
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
```

**Step 4: Run tests**

Run: `pnpm test noteOperations`
Expected: Tests PASS

**Step 5: Commit**

```bash
git add src/lib/noteOperations.ts src/lib/noteOperations.test.ts
git commit -m "feat: add note CRUD operations with task/tag sync"
```

---

## Task 6: Basic App Shell

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Delete: `src/App.css`

**Step 1: Update global styles**

In `src/index.css`:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.5;
  margin: 0;
  min-height: 100vh;
  background: #fafafa;
  color: #1a1a1a;
}

#root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
```

**Step 2: Create basic app shell**

In `src/App.tsx`:

```tsx
import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { getMostRecentNote, createNote } from './lib/noteOperations';
import '@thatsit/ui/index.css';

function App() {
  const { currentNoteId, setCurrentNote } = useAppStore();

  useEffect(() => {
    async function initializeApp() {
      const recentNote = await getMostRecentNote();

      if (recentNote) {
        setCurrentNote(recentNote.id);
      } else {
        // Create welcome note
        const welcomeNote = await createNote(
          '# Welcome to Notes\n\nStart typing to create your first note.\n\n## Features\n\n- Markdown support\n- [ ] Create tasks with checkboxes\n- Add #tags anywhere\n- Use Cmd+K to search'
        );
        setCurrentNote(welcomeNote.id);
      }
    }

    initializeApp();
  }, [setCurrentNote]);

  if (!currentNoteId) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Notes App</h1>
      <p>Current note: {currentNoteId}</p>
    </div>
  );
}

export default App;
```

**Step 3: Delete unused file**

```bash
rm src/App.css
```

**Step 4: Test app loads**

Run: `pnpm dev`
Expected: App loads, shows welcome note created

**Step 5: Commit**

```bash
git add src/App.tsx src/index.css
git add -u src/App.css
git commit -m "feat: add basic app shell with initialization"
```

---

## Task 7: Note Editor Component (Basic)

**Files:**
- Create: `src/components/NoteEditor.tsx`
- Modify: `src/App.tsx`

**Step 1: Create basic note editor**

In `src/components/NoteEditor.tsx`:

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { updateNoteContent } from '../lib/noteOperations';
import { useState, useEffect } from 'react';

interface NoteEditorProps {
  noteId: string;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const note = useLiveQuery(() => db.notes.get(noteId), [noteId]);
  const [content, setContent] = useState('');
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (note) {
      setContent(note.content);
    }
  }, [note]);

  const handleChange = (newContent: string) => {
    setContent(newContent);

    // Debounced save
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    const timeout = setTimeout(() => {
      updateNoteContent(noteId, newContent);
    }, 300);

    setSaveTimeout(timeout);
  };

  if (!note) {
    return <div>Loading note...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2>{note.title}</h2>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        style={{
          width: '100%',
          minHeight: '400px',
          padding: '1rem',
          fontSize: '1rem',
          fontFamily: 'monospace',
          border: '1px solid #ddd',
          borderRadius: '4px',
        }}
      />
      {note.tags.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <strong>Tags:</strong> {note.tags.map(tag => `#${tag}`).join(', ')}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Update App.tsx to use NoteEditor**

In `src/App.tsx`, replace the content:

```tsx
import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { getMostRecentNote, createNote } from './lib/noteOperations';
import { NoteEditor } from './components/NoteEditor';
import '@thatsit/ui/index.css';

function App() {
  const { currentNoteId, setCurrentNote } = useAppStore();

  useEffect(() => {
    async function initializeApp() {
      const recentNote = await getMostRecentNote();

      if (recentNote) {
        setCurrentNote(recentNote.id);
      } else {
        const welcomeNote = await createNote(
          '# Welcome to Notes\n\nStart typing to create your first note.\n\n## Features\n\n- Markdown support\n- [ ] Create tasks with checkboxes\n- Add #tags anywhere\n- Use Cmd+K to search'
        );
        setCurrentNote(welcomeNote.id);
      }
    }

    initializeApp();
  }, [setCurrentNote]);

  if (!currentNoteId) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <NoteEditor noteId={currentNoteId} />
    </div>
  );
}

export default App;
```

**Step 3: Test editor**

Run: `pnpm dev`
Expected: Can type in textarea, auto-saves, tags update

**Step 4: Commit**

```bash
git add src/components/NoteEditor.tsx src/App.tsx
git commit -m "feat: add basic note editor with auto-save"
```

---

## Task 8: Integrate Milkdown

**Files:**
- Modify: `src/components/NoteEditor.tsx`
- Create: `src/components/MilkdownEditor.tsx`

**Step 1: Create Milkdown editor component**

In `src/components/MilkdownEditor.tsx`:

```tsx
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { commonmark } from '@milkdown/preset-commonmark';
import { nord } from '@milkdown/theme-nord';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { history } from '@milkdown/plugin-history';
import '@milkdown/theme-nord/style.css';
import { useEffect } from 'react';

interface MilkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
}

function MilkdownEditorInner({ content, onChange }: MilkdownEditorProps) {
  const { get } = useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, content);
        ctx.get(listenerCtx).markdownUpdated((ctx, markdown) => {
          onChange(markdown);
        });
      })
      .use(nord)
      .use(commonmark)
      .use(listener)
      .use(history)
  );

  return <Milkdown />;
}

export function MilkdownEditor({ content, onChange }: MilkdownEditorProps) {
  return (
    <MilkdownProvider>
      <div style={{
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '1rem',
        minHeight: '400px'
      }}>
        <MilkdownEditorInner content={content} onChange={onChange} />
      </div>
    </MilkdownProvider>
  );
}
```

**Step 2: Update NoteEditor to use Milkdown**

In `src/components/NoteEditor.tsx`:

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { updateNoteContent } from '../lib/noteOperations';
import { useState, useEffect } from 'react';
import { MilkdownEditor } from './MilkdownEditor';

interface NoteEditorProps {
  noteId: string;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const note = useLiveQuery(() => db.notes.get(noteId), [noteId]);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleChange = (newContent: string) => {
    // Debounced save
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    const timeout = setTimeout(() => {
      updateNoteContent(noteId, newContent);
    }, 300);

    setSaveTimeout(timeout);
  };

  if (!note) {
    return <div>Loading note...</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1rem' }}>{note.title}</h2>
      <MilkdownEditor
        content={note.content}
        onChange={handleChange}
      />
      {note.tags.length > 0 && (
        <div style={{ marginTop: '1rem', color: '#666' }}>
          {note.tags.map(tag => (
            <span
              key={tag}
              style={{
                display: 'inline-block',
                padding: '0.25rem 0.5rem',
                margin: '0 0.25rem',
                background: '#e0e0e0',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Test Milkdown editor**

Run: `pnpm dev`
Expected: Editor loads with Milkdown, can type markdown, renders properly

**Step 4: Commit**

```bash
git add src/components/MilkdownEditor.tsx src/components/NoteEditor.tsx
git commit -m "feat: integrate Milkdown editor"
```

---

## Task 9: Task Panel Component

**Files:**
- Create: `src/components/TaskPanel.tsx`
- Modify: `src/App.tsx`

**Step 1: Create TaskPanel component**

In `src/components/TaskPanel.tsx`:

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAppStore } from '../store/appStore';
import { Task } from '../lib/types';

export function TaskPanel() {
  const { taskPanelOpen, setTaskPanelOpen, selectedTags, taskFilter } = useAppStore();

  const tasks = useLiveQuery(async () => {
    let query = db.tasks.toCollection();

    // Filter by completion status
    if (taskFilter === 'active') {
      query = db.tasks.where('completed').equals(false);
    } else if (taskFilter === 'completed') {
      query = db.tasks.where('completed').equals(true);
    }

    const allTasks = await query.toArray();

    // Filter by selected tags
    if (selectedTags.length > 0) {
      return allTasks.filter(task =>
        task.tags.some(tag => selectedTags.includes(tag))
      );
    }

    return allTasks;
  }, [taskFilter, selectedTags]);

  const handleToggleTask = async (task: Task) => {
    await db.tasks.update(task.id, {
      completed: !task.completed,
      updatedAt: new Date()
    });

    // TODO: Update note content to reflect checkbox change
  };

  if (!taskPanelOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: '400px',
      background: 'white',
      borderLeft: '1px solid #ddd',
      padding: '2rem',
      overflowY: 'auto',
      boxShadow: '-2px 0 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Tasks</h2>
        <button onClick={() => setTaskPanelOpen(false)}>Close</button>
      </div>

      {!tasks || tasks.length === 0 ? (
        <p style={{ color: '#666' }}>No tasks yet</p>
      ) : (
        <div>
          {tasks.map(task => (
            <div
              key={task.id}
              style={{
                padding: '0.75rem',
                borderBottom: '1px solid #eee',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggleTask(task)}
              />
              <span style={{
                flex: 1,
                textDecoration: task.completed ? 'line-through' : 'none',
                color: task.completed ? '#999' : '#1a1a1a'
              }}>
                {task.title}
              </span>
              {task.tags.length > 0 && (
                <div>
                  {task.tags.map(tag => (
                    <span
                      key={tag}
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.125rem 0.375rem',
                        background: '#e0e0e0',
                        borderRadius: '3px',
                        marginLeft: '0.25rem'
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Add TaskPanel to App**

In `src/App.tsx`:

```tsx
import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { getMostRecentNote, createNote } from './lib/noteOperations';
import { NoteEditor } from './components/NoteEditor';
import { TaskPanel } from './components/TaskPanel';
import '@thatsit/ui/index.css';

function App() {
  const { currentNoteId, setCurrentNote, toggleTaskPanel } = useAppStore();

  useEffect(() => {
    async function initializeApp() {
      const recentNote = await getMostRecentNote();

      if (recentNote) {
        setCurrentNote(recentNote.id);
      } else {
        const welcomeNote = await createNote(
          '# Welcome to Notes\n\nStart typing to create your first note.\n\n## Features\n\n- Markdown support\n- [ ] Create tasks with checkboxes\n- Add #tags anywhere\n- Use Cmd+K to search'
        );
        setCurrentNote(welcomeNote.id);
      }
    }

    initializeApp();
  }, [setCurrentNote]);

  if (!currentNoteId) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <>
      <div style={{ padding: '2rem' }}>
        <button
          onClick={toggleTaskPanel}
          style={{ marginBottom: '1rem' }}
        >
          Toggle Tasks
        </button>
        <NoteEditor noteId={currentNoteId} />
      </div>
      <TaskPanel />
    </>
  );
}

export default App;
```

**Step 3: Test task panel**

Run: `pnpm dev`
Expected: Can toggle task panel, see tasks from note, check/uncheck them

**Step 4: Commit**

```bash
git add src/components/TaskPanel.tsx src/App.tsx
git commit -m "feat: add task panel with filtering"
```

---

## Task 10: Command Palette

**Files:**
- Create: `src/components/CommandPalette.tsx`
- Modify: `src/App.tsx`

**Step 1: Create CommandPalette component**

In `src/components/CommandPalette.tsx`:

```tsx
import { Command } from 'cmdk';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAppStore } from '../store/appStore';
import { createNote, updateNoteLastOpened } from '../lib/noteOperations';
import { useEffect } from 'react';
import './CommandPalette.css';

export function CommandPalette() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setCurrentNote,
    toggleTaskPanel
  } = useAppStore();

  const notes = useLiveQuery(() =>
    db.notes.orderBy('lastOpenedAt').reverse().toArray()
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const handleNewNote = async () => {
    const note = await createNote('# Untitled\n\n');
    setCurrentNote(note.id);
    setCommandPaletteOpen(false);
  };

  const handleSelectNote = async (noteId: string) => {
    await updateNoteLastOpened(noteId);
    setCurrentNote(noteId);
    setCommandPaletteOpen(false);
  };

  if (!commandPaletteOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '20vh',
        zIndex: 100
      }}
      onClick={() => setCommandPaletteOpen(false)}
    >
      <Command.Dialog
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        label="Command Menu"
        style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
          width: '640px',
          maxHeight: '400px',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Command.Input
          placeholder="Search notes or run command..."
          style={{
            width: '100%',
            padding: '1rem',
            border: 'none',
            borderBottom: '1px solid #eee',
            fontSize: '1rem',
            outline: 'none'
          }}
        />
        <Command.List style={{ padding: '0.5rem', maxHeight: '300px', overflow: 'auto' }}>
          <Command.Empty style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
            No results found
          </Command.Empty>

          <Command.Group heading="Commands">
            <Command.Item
              onSelect={handleNewNote}
              style={{ padding: '0.75rem', cursor: 'pointer', borderRadius: '4px' }}
            >
              📝 New Note
            </Command.Item>
            <Command.Item
              onSelect={toggleTaskPanel}
              style={{ padding: '0.75rem', cursor: 'pointer', borderRadius: '4px' }}
            >
              ✓ Toggle Tasks
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Recent Notes">
            {notes?.map(note => (
              <Command.Item
                key={note.id}
                value={note.title}
                onSelect={() => handleSelectNote(note.id)}
                style={{ padding: '0.75rem', cursor: 'pointer', borderRadius: '4px' }}
              >
                {note.title}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </div>
  );
}
```

**Step 2: Create CommandPalette styles**

In `src/components/CommandPalette.css`:

```css
[cmdk-root] {
  background: white;
}

[cmdk-item] {
  cursor: pointer;
  transition: background 0.1s;
}

[cmdk-item]:hover,
[cmdk-item][aria-selected="true"] {
  background: #f0f0f0;
}

[cmdk-group-heading] {
  font-size: 0.75rem;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  padding: 0.5rem 0.75rem 0.25rem;
  letter-spacing: 0.05em;
}

[cmdk-separator] {
  height: 1px;
  background: #eee;
  margin: 0.5rem 0;
}
```

**Step 3: Add CommandPalette to App**

In `src/App.tsx`:

```tsx
import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { getMostRecentNote, createNote } from './lib/noteOperations';
import { NoteEditor } from './components/NoteEditor';
import { TaskPanel } from './components/TaskPanel';
import { CommandPalette } from './components/CommandPalette';
import '@thatsit/ui/index.css';

function App() {
  const { currentNoteId, setCurrentNote, toggleTaskPanel } = useAppStore();

  useEffect(() => {
    async function initializeApp() {
      const recentNote = await getMostRecentNote();

      if (recentNote) {
        setCurrentNote(recentNote.id);
      } else {
        const welcomeNote = await createNote(
          '# Welcome to Notes\n\nStart typing to create your first note.\n\n## Features\n\n- Markdown support\n- [ ] Create tasks with checkboxes\n- Add #tags anywhere\n- Use Cmd+K to search'
        );
        setCurrentNote(welcomeNote.id);
      }
    }

    initializeApp();
  }, [setCurrentNote]);

  if (!currentNoteId) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  return (
    <>
      <div style={{ padding: '2rem' }}>
        <button
          onClick={toggleTaskPanel}
          style={{ marginBottom: '1rem' }}
        >
          Toggle Tasks
        </button>
        <NoteEditor noteId={currentNoteId} />
      </div>
      <TaskPanel />
      <CommandPalette />
    </>
  );
}

export default App;
```

**Step 4: Test command palette**

Run: `pnpm dev`
Expected: Cmd+K opens palette, can create notes, switch notes, toggle tasks

**Step 5: Commit**

```bash
git add src/components/CommandPalette.tsx src/components/CommandPalette.css src/App.tsx
git commit -m "feat: add command palette with Cmd+K shortcut"
```

---

## Task 11: Sync Task Checkboxes to Note Content

**Files:**
- Modify: `src/lib/noteOperations.ts`
- Create: `src/lib/taskOperations.ts`

**Step 1: Create task operations**

In `src/lib/taskOperations.ts`:

```typescript
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
```

**Step 2: Update TaskPanel to use toggleTask**

In `src/components/TaskPanel.tsx`, update the import and handleToggleTask:

```tsx
import { toggleTask } from '../lib/taskOperations';

// Replace handleToggleTask with:
const handleToggleTask = async (task: Task) => {
  await toggleTask(task.id);
};
```

**Step 3: Test task syncing**

Run: `pnpm dev`
Expected: Checking task in panel updates checkbox in note content

**Step 4: Commit**

```bash
git add src/lib/taskOperations.ts src/components/TaskPanel.tsx
git commit -m "feat: sync task checkboxes between panel and note content"
```

---

## Task 12: Polish and Cleanup

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Create: `src/components/Layout.tsx`

**Step 1: Create Layout component**

In `src/components/Layout.tsx`:

```tsx
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#fafafa'
    }}>
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        {children}
      </main>
    </div>
  );
}
```

**Step 2: Refactor App.tsx**

In `src/App.tsx`:

```tsx
import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { getMostRecentNote, createNote } from './lib/noteOperations';
import { NoteEditor } from './components/NoteEditor';
import { TaskPanel } from './components/TaskPanel';
import { CommandPalette } from './components/CommandPalette';
import { Layout } from './components/Layout';
import '@thatsit/ui/index.css';

function App() {
  const { currentNoteId, setCurrentNote } = useAppStore();

  useEffect(() => {
    async function initializeApp() {
      const recentNote = await getMostRecentNote();

      if (recentNote) {
        setCurrentNote(recentNote.id);
      } else {
        const welcomeNote = await createNote(
          '# Welcome to Notes\n\nStart typing to create your first note.\n\n## Features\n\n- Markdown support\n- [ ] Create tasks with checkboxes\n- Add #tags anywhere\n- Use Cmd+K to search'
        );
        setCurrentNote(welcomeNote.id);
      }
    }

    initializeApp();
  }, [setCurrentNote]);

  if (!currentNoteId) {
    return (
      <Layout>
        <div>Loading...</div>
      </Layout>
    );
  }

  return (
    <>
      <Layout>
        <NoteEditor noteId={currentNoteId} />
      </Layout>
      <TaskPanel />
      <CommandPalette />
    </>
  );
}

export default App;
```

**Step 3: Update global styles**

In `src/index.css`:

```css
@import '@thatsit/ui/index.css';

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
  margin: 0;
  min-height: 100vh;
  background: #fafafa;
  color: #1a1a1a;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  min-height: 100vh;
}

button {
  font-family: inherit;
  cursor: pointer;
}
```

**Step 4: Test final app**

Run: `pnpm dev`
Expected: Clean, minimal UI with all features working

**Step 5: Commit**

```bash
git add src/components/Layout.tsx src/App.tsx src/index.css
git commit -m "refactor: add layout component and polish styling"
```

---

## Task 13: Manual Testing

**Manual Testing Checklist:**

1. **Note creation and editing**
   - [ ] App opens to welcome note
   - [ ] Can type and see changes auto-save
   - [ ] Title updates based on first line

2. **Tasks**
   - [ ] Create task with `[ ]` in note
   - [ ] Task appears in task panel (toggle with button)
   - [ ] Check task in panel → checkbox updates in note
   - [ ] Check task in note editor → task updates in panel

3. **Tags**
   - [ ] Add `#hashtag` in note → appears in tags below editor
   - [ ] Tags update as you type

4. **Command Palette**
   - [ ] Cmd+K opens palette
   - [ ] Can create new note
   - [ ] Can switch between notes
   - [ ] Can toggle task panel
   - [ ] Recent notes appear in list

5. **Persistence**
   - [ ] Close browser tab
   - [ ] Reopen app → last note loaded
   - [ ] All data persisted

**Step 1: Run through checklist**

Run: `pnpm dev`
Test each item above

**Step 2: Fix any issues found**

(Address bugs as needed)

**Step 3: Final commit**

```bash
git add .
git commit -m "test: verify all manual testing checklist items"
```

---

## Task 14: Documentation

**Files:**
- Create: `docs/ARCHITECTURE.md`

**Step 1: Create architecture documentation**

In `docs/ARCHITECTURE.md`:

```markdown
# Architecture Documentation

## Overview

Notes app built with React, TypeScript, Dexie (IndexedDB), and Milkdown editor.

## Key Components

### Database (Dexie)
- `notes` - Store note content, metadata, tags
- `tasks` - Store tasks extracted from note checkboxes
- `tags` - Track tag usage across notes/tasks

### State Management (Zustand)
- UI state only (current note, panel visibility, filters)
- Database is source of truth for data

### Components
- `NoteEditor` - Main editing interface with Milkdown
- `TaskPanel` - Slide-out panel showing all tasks
- `CommandPalette` - Cmd+K quick switcher
- `MilkdownEditor` - Wrapper for Milkdown editor

## Data Flow

1. User types in editor
2. Content saved to Dexie (debounced 300ms)
3. Parser extracts tasks, tags, title
4. Tasks/tags tables updated
5. Reactive queries (`useLiveQuery`) update UI

## Future Enhancements

- Custom Milkdown plugins (hashtag click, task rendering)
- Slash commands for inserting markdown
- Better task identity tracking across edits
- Sync integration with backend
```

**Step 2: Commit**

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: add architecture documentation"
```

---

## Next Steps

**Phase 1 (MVP) is now complete!**

Core features implemented:
- ✅ Database with notes, tasks, tags
- ✅ Content parser
- ✅ Milkdown editor
- ✅ Task panel
- ✅ Command palette
- ✅ Auto-save
- ✅ Tag extraction

**Phase 2 (Enhancements):**
1. Custom Milkdown plugins for hashtags and tasks
2. Slash commands (/ to insert markdown)
3. Better task identity preservation
4. Fuzzy search in command palette
5. Tag autocomplete
6. Note deletion
7. Export/import

**Phase 3 (Sync):**
1. Backend integration
2. User authentication
3. Conflict resolution
4. @-mentions for collaboration
