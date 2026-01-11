# Block Component Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor Block component to eliminate re-renders during typing and improve maintainability through component separation.

**Architecture:** Split Block into focused components - BlockEditor for editing with local state, BlockRenderer delegating to type-specific components, and Block as thin coordinator.

**Tech Stack:** React, TypeScript, Tailwind CSS

---

## Task 1: Resolve Naming Conflict

**Problem:** Current `BlockEditor.tsx` manages multiple blocks, conflicts with our new single-block editor component name.

**Files:**
- Rename: `src/components/BlockEditor.tsx` → `src/components/BlocksManager.tsx`
- Modify: `src/components/NoteEditor.tsx:5,33`

**Step 1: Rename BlockEditor to BlocksManager**

```bash
git mv src/components/BlockEditor.tsx src/components/BlocksManager.tsx
```

**Step 2: Update import in NoteEditor.tsx**

Find line 5:
```typescript
import { BlockEditor } from './BlockEditor';
```

Replace with:
```typescript
import { BlocksManager } from './BlocksManager';
```

Find line 34:
```typescript
<BlockEditor
```

Replace with:
```typescript
<BlocksManager
```

**Step 3: Update export in BlocksManager.tsx**

In `src/components/BlocksManager.tsx`, find line 11:
```typescript
export function BlockEditor({ content, onChange }: BlockEditorProps) {
```

Replace with:
```typescript
export function BlocksManager({ content, onChange }: BlockEditorProps) {
```

Also update the interface name for clarity:
```typescript
interface BlockEditorProps {
```

Replace with:
```typescript
interface BlocksManagerProps {
```

And update the function signature:
```typescript
export function BlocksManager({ content, onChange }: BlocksManagerProps) {
```

**Step 4: Verify changes work**

Run: `pnpm dev`
Expected: App loads without errors, editing still works

**Step 5: Commit**

```bash
git add src/components/BlocksManager.tsx src/components/NoteEditor.tsx
git commit -m "refactor: rename BlockEditor to BlocksManager for clarity"
```

---

## Task 2: Create Individual Block Components - Headings

**Files:**
- Create: `src/components/blocks/HeadingBlock.tsx`

**Step 1: Create blocks directory**

```bash
mkdir -p src/components/blocks
```

**Step 2: Create HeadingBlock.tsx**

Create `src/components/blocks/HeadingBlock.tsx`:

```typescript
interface HeadingBlockProps {
  content: string;
  type: 'heading1' | 'heading2' | 'heading3';
  onClick: () => void;
}

export function HeadingBlock({ content, type, onClick }: HeadingBlockProps) {
  const cleanContent = content.replace(/^#{1,3} /, '');

  const baseClasses = 'font-bold cursor-pointer';

  if (type === 'heading1') {
    return (
      <h1 className={`${baseClasses} text-2xl`} onClick={onClick}>
        {cleanContent}
      </h1>
    );
  }

  if (type === 'heading2') {
    return (
      <h2 className={`${baseClasses} text-xl`} onClick={onClick}>
        {cleanContent}
      </h2>
    );
  }

  return (
    <h3 className={`${baseClasses} text-lg`} onClick={onClick}>
      {cleanContent}
    </h3>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/blocks/HeadingBlock.tsx
git commit -m "feat: add HeadingBlock component with Tailwind styling"
```

---

## Task 3: Create TaskBlock Component

**Files:**
- Create: `src/components/blocks/TaskBlock.tsx`

**Step 1: Create TaskBlock.tsx**

Create `src/components/blocks/TaskBlock.tsx`:

```typescript
interface TaskBlockProps {
  content: string;
  onClick: () => void;
  onToggle: () => void;
}

export function TaskBlock({ content, onClick, onToggle }: TaskBlockProps) {
  const isCompleted = /^- \[x\]/i.test(content);
  const taskText = content.replace(/^- \[(x| )\] /i, '');

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

  return (
    <div onClick={onClick} className="flex gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={handleCheckboxClick}
        className="mt-1 cursor-pointer"
      />
      <span className={isCompleted ? 'line-through' : ''}>
        {taskText}
      </span>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/blocks/TaskBlock.tsx
git commit -m "feat: add TaskBlock with clickable checkbox"
```

---

## Task 4: Create ListBlock Component

**Files:**
- Create: `src/components/blocks/ListBlock.tsx`

**Step 1: Create ListBlock.tsx**

Create `src/components/blocks/ListBlock.tsx`:

```typescript
interface ListBlockProps {
  content: string;
  type: 'bulletList' | 'numberedList';
  onClick: () => void;
}

export function ListBlock({ content, type, onClick }: ListBlockProps) {
  const cleanContent = type === 'bulletList'
    ? content.replace(/^- /, '')
    : content.replace(/^\d+\. /, '');

  if (type === 'bulletList') {
    return (
      <ul onClick={onClick} className="ml-6 cursor-pointer">
        <li>{cleanContent}</li>
      </ul>
    );
  }

  return (
    <ol onClick={onClick} className="ml-6 cursor-pointer">
      <li>{cleanContent}</li>
    </ol>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/blocks/ListBlock.tsx
git commit -m "feat: add ListBlock for bullet and numbered lists"
```

---

## Task 5: Create CodeBlock and ParagraphBlock Components

**Files:**
- Create: `src/components/blocks/CodeBlock.tsx`
- Create: `src/components/blocks/ParagraphBlock.tsx`

**Step 1: Create CodeBlock.tsx**

Create `src/components/blocks/CodeBlock.tsx`:

```typescript
interface CodeBlockProps {
  content: string;
  onClick: () => void;
}

export function CodeBlock({ content, onClick }: CodeBlockProps) {
  return (
    <pre
      onClick={onClick}
      className="bg-gray-100 p-4 h-screen cursor-pointer"
    >
      <code>{content}</code>
    </pre>
  );
}
```

**Step 2: Create ParagraphBlock.tsx**

Create `src/components/blocks/ParagraphBlock.tsx`:

```typescript
interface ParagraphBlockProps {
  content: string;
  onClick: () => void;
}

export function ParagraphBlock({ content, onClick }: ParagraphBlockProps) {
  return (
    <p onClick={onClick} className="min-h-[1.5em] cursor-pointer">
      {content || '\u00A0'}
    </p>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/blocks/CodeBlock.tsx src/components/blocks/ParagraphBlock.tsx
git commit -m "feat: add CodeBlock and ParagraphBlock components"
```

---

## Task 6: Create BlockRenderer Component

**Files:**
- Create: `src/components/BlockRenderer.tsx`

**Step 1: Create BlockRenderer.tsx**

Create `src/components/BlockRenderer.tsx`:

```typescript
import type { Block as BlockType } from '../lib/blockTypes';
import { HeadingBlock } from './blocks/HeadingBlock';
import { TaskBlock } from './blocks/TaskBlock';
import { ListBlock } from './blocks/ListBlock';
import { CodeBlock } from './blocks/CodeBlock';
import { ParagraphBlock } from './blocks/ParagraphBlock';

interface BlockRendererProps {
  block: BlockType;
  onActivate: () => void;
  onToggleTask?: () => void;
}

export function BlockRenderer({ block, onActivate, onToggleTask }: BlockRendererProps) {
  switch (block.type) {
    case 'heading1':
    case 'heading2':
    case 'heading3':
      return <HeadingBlock content={block.content} type={block.type} onClick={onActivate} />;

    case 'task':
      return (
        <TaskBlock
          content={block.content}
          onClick={onActivate}
          onToggle={onToggleTask || (() => {})}
        />
      );

    case 'bulletList':
    case 'numberedList':
      return <ListBlock content={block.content} type={block.type} onClick={onActivate} />;

    case 'code':
      return <CodeBlock content={block.content} onClick={onActivate} />;

    case 'paragraph':
    default:
      return <ParagraphBlock content={block.content} onClick={onActivate} />;
  }
}
```

**Step 2: Commit**

```bash
git add src/components/BlockRenderer.tsx
git commit -m "feat: add BlockRenderer to delegate to block type components"
```

---

## Task 7: Create New BlockEditor Component (Single Block Editor)

**Files:**
- Create: `src/components/BlockEditor.tsx`

**Step 1: Create BlockEditor.tsx**

Create `src/components/BlockEditor.tsx`:

```typescript
import { useState, useEffect, useRef } from 'react';
import type { Block as BlockType } from '../lib/blockTypes';
import { detectBlockType } from '../lib/blockParser';
import { SlashMenu } from './SlashMenu';

interface BlockEditorProps {
  initialContent: string;
  blockType: BlockType['type'];
  onBlur: (finalContent: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  onTypeChange: (newType: string) => void;
}

export function BlockEditor({
  initialContent,
  blockType,
  onBlur,
  onEnter,
  onBackspace,
  onTypeChange,
}: BlockEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus and position cursor on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      setTimeout(() => {
        if (textareaRef.current) {
          const length = textareaRef.current.value.length;
          textareaRef.current.selectionStart = length;
          textareaRef.current.selectionEnd = length;
        }
      }, 0);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Show slash menu if content is '/'
    if (newContent === '/') {
      const rect = e.target.getBoundingClientRect();
      setSlashMenuPosition({
        top: rect.bottom,
        left: rect.left,
      });
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);

      // Auto-detect block type changes
      const detectedType = detectBlockType(newContent);
      if (detectedType !== blockType) {
        onTypeChange(detectedType);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter();
    } else if (e.key === 'Backspace' && e.currentTarget.value === '') {
      e.preventDefault();
      onBackspace();
    }
  };

  const handleBlur = () => {
    onBlur(content);
  };

  const handleSelectBlockType = (newType: BlockType['type']) => {
    setShowSlashMenu(false);
    setContent('');
    onTypeChange(newType);
  };

  return (
    <>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full border-none outline-none resize-none min-h-[1.5em] font-mono bg-transparent p-0"
        rows={1}
      />
      <SlashMenu
        isOpen={showSlashMenu}
        position={slashMenuPosition}
        onSelectType={handleSelectBlockType}
        onClose={() => setShowSlashMenu(false)}
      />
    </>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/BlockEditor.tsx
git commit -m "feat: add BlockEditor for editing single block with local state"
```

---

## Task 8: Update Block Coordinator Component

**Files:**
- Modify: `src/components/Block.tsx`

**Step 1: Replace entire Block.tsx contents**

Replace the entire file `src/components/Block.tsx` with:

```typescript
import type { Block as BlockType } from '../lib/blockTypes';
import { BlockEditor } from './BlockEditor';
import { BlockRenderer } from './BlockRenderer';

interface BlockProps {
  block: BlockType;
  isActive: boolean;
  onActivate: () => void;
  onBlur: (content: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  onTypeChange: (newType: string) => void;
  onToggleTask: () => void;
}

export function Block({
  block,
  isActive,
  onActivate,
  onBlur,
  onEnter,
  onBackspace,
  onTypeChange,
  onToggleTask,
}: BlockProps) {
  return (
    <div className="mb-2">
      {isActive ? (
        <BlockEditor
          initialContent={block.content}
          blockType={block.type}
          onBlur={onBlur}
          onEnter={onEnter}
          onBackspace={onBackspace}
          onTypeChange={onTypeChange}
        />
      ) : (
        <BlockRenderer
          block={block}
          onActivate={onActivate}
          onToggleTask={onToggleTask}
        />
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/Block.tsx
git commit -m "refactor: simplify Block to thin coordinator"
```

---

## Task 9: Update BlocksManager to Support New Block Interface

**Files:**
- Modify: `src/components/BlocksManager.tsx`

**Step 1: Update handleBlockChange to accept content directly**

Find the `handleBlockChange` function (around line 36):

```typescript
const handleBlockChange = (blockId: string, newContent: string) => {
  const updatedBlocks = blocks.map((b) =>
    b.id === blockId ? { ...b, content: newContent } : b
  );
  setBlocks(updatedBlocks);
  syncToMarkdown(updatedBlocks);
};
```

This stays the same - it already accepts content directly.

**Step 2: Add handleToggleTask function**

After the `handleBlockTypeChange` function (after line 50), add:

```typescript
const handleToggleTask = (blockId: string) => {
  const updatedBlocks = blocks.map((b) => {
    if (b.id === blockId && b.type === 'task') {
      const isCompleted = /^- \[x\]/i.test(b.content);
      const taskText = b.content.replace(/^- \[(x| )\] /i, '');
      const newContent = isCompleted
        ? `- [ ] ${taskText}`
        : `- [x] ${taskText}`;
      return { ...b, content: newContent };
    }
    return b;
  });
  setBlocks(updatedBlocks);
  syncToMarkdown(updatedBlocks);
};
```

**Step 3: Update Block component usage**

Find the Block component usage (around line 97-107). Replace with:

```typescript
{blocks.map((block) => (
  <Block
    key={block.id}
    block={block}
    isActive={activeBlockId === block.id}
    onActivate={() => setActiveBlockId(block.id)}
    onBlur={(content) => handleBlockChange(block.id, content)}
    onEnter={() => handleEnter(block.id)}
    onBackspace={() => handleBackspace(block.id)}
    onTypeChange={(newType) => handleBlockTypeChange(block.id, newType)}
    onToggleTask={() => handleToggleTask(block.id)}
  />
))}
```

**Step 4: Remove old onFocus and onChange handlers**

The changes above replace:
- `onFocus` with `onActivate`
- `onChange` is removed (content comes via `onBlur` now)

**Step 5: Convert inline styles to Tailwind**

Find the div with inline styles (around line 89-95):

```typescript
<div
  style={{
    padding: '1rem',
    minHeight: '400px',
    fontFamily: 'system-ui, sans-serif',
  }}
>
```

Replace with:

```typescript
<div className="p-4 min-h-[400px] font-sans">
```

**Step 6: Verify changes work**

Run: `pnpm dev`
Expected:
- App loads without errors
- Clicking block enters edit mode
- Typing doesn't cause re-renders of parent
- Clicking away saves content
- Task checkboxes toggle without entering edit mode

**Step 7: Commit**

```bash
git add src/components/BlocksManager.tsx
git commit -m "refactor: update BlocksManager for new Block interface with task toggle"
```

---

## Task 10: Clean Up and Final Testing

**Step 1: Remove unused SlashMenu.css if inline styles were used**

Check if `src/components/SlashMenu.css` contains only inline-replaced styles:

```bash
cat src/components/SlashMenu.css
```

If it only has basic styles that should be in Tailwind, we can address it later. For now, leave it.

**Step 2: Test all block types**

Manual testing checklist:
- [ ] Create heading1 with `# Title` - formats correctly
- [ ] Create heading2 with `## Title` - formats correctly
- [ ] Create heading3 with `### Title` - formats correctly
- [ ] Create task with `- [ ] Task` - shows checkbox
- [ ] Click task checkbox - toggles without edit mode
- [ ] Create bullet list with `- Item` - formats correctly
- [ ] Create numbered list with `1. Item` - formats correctly
- [ ] Type `/` - slash menu appears
- [ ] Select block type from slash menu - changes type
- [ ] Press Enter - creates new block
- [ ] Press Backspace on empty block - deletes block
- [ ] Type continuously - no visible re-renders

**Step 3: Build for production**

Run: `pnpm build`
Expected: Build succeeds without errors or warnings

**Step 4: Final commit**

```bash
git add .
git commit -m "refactor: complete Block component refactor

- Split Block into BlockEditor (editing) and BlockRenderer (viewing)
- Extract individual block type components
- Eliminate re-renders during typing via local state
- Convert all inline styles to Tailwind
- Add task checkbox toggle without entering edit mode"
```

---

## Summary

**What we built:**
- Separated concerns: editing vs rendering vs coordination
- Eliminated re-renders during active typing
- Made each block type independently maintainable
- Converted all inline styles to Tailwind
- Added proper task checkbox interaction

**Architecture:**
- `Block.tsx` - 30 lines, thin coordinator
- `BlockEditor.tsx` - Manages editing with local state
- `BlockRenderer.tsx` - Routes to type-specific renderers
- `blocks/*.tsx` - 5 focused components (10-30 lines each)
- `BlocksManager.tsx` - Updated to support new interface

**Performance improvement:**
- Before: Parent re-renders on every keystroke
- After: Only BlockEditor re-renders during typing, parent updates on blur only
