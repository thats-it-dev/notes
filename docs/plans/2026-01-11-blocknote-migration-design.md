# BlockNote Migration Design

## Overview

Replace custom block editor implementation with BlockNote library to improve editing reliability and sustainability.

## Problem Statement

The current custom block editor has maintainability issues:
- Edge cases in continuous editing (backspace across blocks)
- Complex state management for focus/blur/merge
- Significant maintenance burden for basic editing features
- Each bug fix risks introducing new issues

BlockNote is a mature, battle-tested solution that handles these complexities.

## Architecture Changes

### Storage Model

**Before:**
- `Note.content: string` (markdown)
- Parse markdown → blocks on every render
- Tasks extracted from markdown by line number

**After:**
- `Note.content: BlockNoteContent` (JSON structure)
- `Note.markdownCache: string` (generated for search/export)
- Tasks extracted from JSON by block ID

### Component Structure

**Removed:**
- `BlocksManager.tsx` (220 lines)
- `BlockEditor.tsx` (100 lines)
- `BlockRenderer.tsx` (40 lines)
- `Block.tsx` (47 lines)
- `blocks/` directory (5 components, 150 lines)
- `blockParser.ts`, `blockTypes.ts`
- Custom SlashMenu (BlockNote has built-in)

**Added:**
- `blockNoteSchema.ts` - Custom schema with tag inline content
- `blockNoteConverters.ts` - Extraction and markdown generation
- Updated `NoteEditor.tsx` - Integrates `<BlockNoteView>`

**Unchanged:**
- `TaskPanel.tsx` - Still queries tasks table
- `CommandPalette.tsx`
- All Dexie operations

## Data Model

### Updated Interfaces

```typescript
export interface Note {
  id: string;
  title: string;
  content: BlockNoteContent; // BlockNote's JSON
  markdownCache: string; // Generated markdown
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
  blockId: string; // Changed from lineNumber
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Dexie Schema Migration

```typescript
this.version(2).stores({
  notes: 'id, title, *tags, lastOpenedAt, createdAt, updatedAt',
  tasks: 'id, noteId, completed, *tags, createdAt, updatedAt',
  tags: 'name, usageCount, lastUsedAt'
}).upgrade(tx => {
  // Clean slate migration - delete all existing data
  return tx.table('notes').clear()
    .then(() => tx.table('tasks').clear())
    .then(() => tx.table('tags').clear());
});
```

## BlockNote Integration

### Custom Schema

```typescript
// src/lib/blockNoteSchema.ts
import { defaultInlineContentSpecs, defaultBlockSpecs } from "@blocknote/core";

const Tag = {
  type: "tag" as const,
  propSchema: {
    name: { default: "" }
  },
  content: "none"
};

export const schema = {
  blockSpecs: {
    ...defaultBlockSpecs
    // Uses built-in: paragraph, heading, checkListItem, etc.
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    tag: Tag
  }
};
```

### Editor Setup

```typescript
// In NoteEditor.tsx
import { BlockNoteView } from "@blocknote/react";
import { useCreateBlockNote } from "@blocknote/react";
import { schema } from "../lib/blockNoteSchema";

const editor = useCreateBlockNote({
  schema,
  initialContent: note.content
});

return <BlockNoteView editor={editor} onChange={handleChange} />;
```

## Data Extraction & Sync

### Task Extraction

```typescript
// src/lib/blockNoteConverters.ts
interface ExtractedTask {
  blockId: string;
  title: string;
  completed: boolean;
  tags: string[];
}

function extractTasks(blocks: Block[]): ExtractedTask[] {
  const tasks: ExtractedTask[] = [];

  function traverse(block: Block) {
    if (block.type === "checkListItem") {
      tasks.push({
        blockId: block.id,
        title: getPlainText(block.content),
        completed: block.props.checked || false,
        tags: extractTagsFromContent(block.content)
      });
    }

    if (block.children) {
      block.children.forEach(traverse);
    }
  }

  blocks.forEach(traverse);
  return tasks;
}
```

### Tag Extraction

```typescript
function extractTags(blocks: Block[]): string[] {
  const tags = new Set<string>();

  function traverse(block: Block) {
    if (block.content) {
      block.content.forEach(content => {
        if (content.type === "tag") {
          tags.add(content.props.name);
        }
      });
    }

    if (block.children) {
      block.children.forEach(traverse);
    }
  }

  blocks.forEach(traverse);
  return Array.from(tags);
}
```

### Debounced Update Flow

```typescript
// In NoteEditor.tsx
const debouncedUpdate = useMemo(
  () => debounce(async (blocks: Block[], noteId: string) => {
    const tasks = extractTasks(blocks);
    const tags = extractTags(blocks);
    const markdownCache = blocksToMarkdown(blocks);

    await reconcileTasks(noteId, tasks);
    await updateNoteTags(noteId, tags);
    await updateNoteContent(noteId, blocks, markdownCache);
  }, 300),
  []
);
```

**Trigger:** 300ms after user stops typing
**Updates:** Tasks table, tags table, note content + markdown cache

## Bi-Directional Sync

### Note → TaskPanel

1. User edits task in BlockNote editor
2. Debounced handler extracts tasks from JSON
3. Reconciles with tasks table
4. TaskPanel auto-updates via `useLiveQuery`

### TaskPanel → Note

```typescript
// Updated toggleTask
export async function toggleTask(taskId: string): Promise<void> {
  const task = await db.tasks.get(taskId);
  if (!task) return;

  const note = await db.notes.get(task.noteId);
  if (!note) return;

  const newCompleted = !task.completed;

  // 1. Update task entity
  await db.tasks.update(taskId, {
    completed: newCompleted,
    updatedAt: new Date()
  });

  // 2. Update BlockNote JSON - find block by ID
  const updatedContent = updateTaskInBlocks(
    note.content,
    task.blockId,
    newCompleted
  );

  // 3. Update note
  await db.notes.update(task.noteId, {
    content: updatedContent,
    updatedAt: new Date()
  });
}
```

**If note is open:** Editor detects Dexie update and re-renders with updated content.

## Markdown Cache Generation

### Purpose

- Enable text search (search markdown, not JSON)
- Provide export capability
- Extract note titles (first H1)

### Conversion Logic

```typescript
function blocksToMarkdown(blocks: Block[]): string {
  return blocks.map(blockToMarkdown).join('\n\n');
}

function blockToMarkdown(block: Block): string {
  const content = getPlainText(block.content);

  switch (block.type) {
    case 'heading':
      const level = block.props.level || 1;
      return `${'#'.repeat(level)} ${content}`;

    case 'checkListItem':
      const checked = block.props.checked ? 'x' : ' ';
      return `- [${checked}] ${content}`;

    case 'bulletListItem':
      return `- ${content}`;

    case 'numberedListItem':
      return `1. ${content}`;

    case 'paragraph':
    default:
      return content;
  }
}

function getPlainText(content: InlineContent[]): string {
  return content.map(item => {
    if (item.type === 'text') return item.text;
    if (item.type === 'tag') return `#${item.props.name}`;
    if (item.type === 'link') return item.content.map(c => c.text).join('');
    return '';
  }).join('');
}
```

**Generated on:** Every debounced save
**Stored in:** `Note.markdownCache`

## Tag Input & Rendering

### Input Rule

User types `#tagname` → BlockNote input rule converts to structured tag inline content (similar to @mention pattern).

### Rendering

Custom React component renders tag inline content:
- Styled with Tailwind (badge appearance)
- Clickable (filters notes by tag)
- Appears inline within text

## Implementation Plan

### Phase 1: Setup & Dependencies
1. `pnpm add @blocknote/core @blocknote/react`
2. Update Dexie schema version 2 (wipe data)
3. Create custom schema with tag inline content

### Phase 2: Core Integration
1. Create `blockNoteSchema.ts`
2. Create `blockNoteConverters.ts` (extraction, markdown)
3. Update `noteOperations.ts` for BlockNote JSON
4. Update `taskOperations.ts` for bi-directional sync

### Phase 3: Component Replacement
1. Replace `NoteEditor` with `<BlockNoteView>`
2. Remove custom block components:
   - `BlocksManager.tsx`
   - `BlockEditor.tsx`
   - `BlockRenderer.tsx`
   - `Block.tsx`
   - `blocks/` directory
   - `blockParser.ts`
   - `blockTypes.ts`
3. Update welcome note to BlockNote JSON

### Phase 4: Tag Implementation
1. Add BlockNote input rule for `#` trigger
2. Create custom render component for tags
3. Add click handler for tag filtering

### Phase 5: Testing
1. Task extraction (create/toggle)
2. Bi-directional sync (TaskPanel ↔ Note)
3. Tag extraction and rendering
4. Markdown cache generation
5. Search functionality

## Benefits

### Immediate
- ✅ Eliminates editing bugs (backspace, focus, merge issues)
- ✅ Professional editing UX out of the box
- ✅ Built-in slash commands, keyboard shortcuts
- ✅ Reduced maintenance burden (500+ lines removed)

### Future
- ✅ Rich text editing available (bold, italic, links)
- ✅ Collaborative editing possible (BlockNote supports)
- ✅ Extensible with custom blocks
- ✅ Active community and updates

## Trade-offs

### Pros
- Mature, battle-tested editor
- Handles complex editing scenarios
- Active development and community
- Extensible architecture

### Cons
- Larger bundle size (~200kb vs custom ~50kb)
- Learning BlockNote's API
- Less control over exact behavior
- Migration effort (though clean slate helps)

## Migration Strategy

**Clean slate approach:**
- Wipe all existing notes/tasks/tags on schema upgrade
- Not production yet, so acceptable
- Simpler than data migration
- Fresh start with new architecture
