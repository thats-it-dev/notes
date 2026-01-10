# Block-Based Markdown Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Milkdown with a custom block-based editor where each line is an editable block showing markdown syntax when focused and rendered view when unfocused.

**Architecture:** Each block is a React component with edit/view states. Blocks parse their own markdown and render appropriately. Slash commands create new block types. Enter key creates new blocks. All blocks sync to a single note content string.

**Tech Stack:** React, TypeScript, ContentEditable, remark (markdown parsing), Custom block components

---

## Task 1: Create Block Type System

**Files:**
- Create: `src/lib/blockTypes.ts`
- Create: `src/lib/blockParser.ts`
- Create: `src/lib/blockParser.test.ts`

**Step 1: Define block types**

In `src/lib/blockTypes.ts`:

```typescript
export type BlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'task'
  | 'bulletList'
  | 'numberedList'
  | 'code';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  metadata?: {
    completed?: boolean; // for tasks
    language?: string; // for code blocks
  };
}

export interface BlockTypeConfig {
  type: BlockType;
  pattern: RegExp;
  render: (content: string, metadata?: any) => string;
  toMarkdown: (content: string, metadata?: any) => string;
}
```

**Step 2: Write block parser tests**

In `src/lib/blockParser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseMarkdownToBlocks, blocksToMarkdown } from './blockParser';

describe('Block Parser', () => {
  it('should parse heading1', () => {
    const blocks = parseMarkdownToBlocks('# Hello');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('heading1');
    expect(blocks[0].content).toBe('Hello');
  });

  it('should parse task', () => {
    const blocks = parseMarkdownToBlocks('[ ] Todo item');
    expect(blocks[0].type).toBe('task');
    expect(blocks[0].content).toBe('Todo item');
    expect(blocks[0].metadata?.completed).toBe(false);
  });

  it('should parse completed task', () => {
    const blocks = parseMarkdownToBlocks('[x] Done item');
    expect(blocks[0].type).toBe('task');
    expect(blocks[0].metadata?.completed).toBe(true);
  });

  it('should parse multiple blocks', () => {
    const markdown = '# Title\n\nParagraph text\n\n[ ] Task';
    const blocks = parseMarkdownToBlocks(markdown);
    expect(blocks).toHaveLength(3);
  });

  it('should convert blocks back to markdown', () => {
    const blocks = [
      { id: '1', type: 'heading1' as const, content: 'Title' },
      { id: '2', type: 'paragraph' as const, content: 'Text' },
      { id: '3', type: 'task' as const, content: 'Todo', metadata: { completed: false } }
    ];
    const markdown = blocksToMarkdown(blocks);
    expect(markdown).toBe('# Title\n\nText\n\n[ ] Todo');
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `pnpm test blockParser -- --run`
Expected: Tests FAIL (parseMarkdownToBlocks not defined)

**Step 4: Implement block parser**

In `src/lib/blockParser.ts`:

```typescript
import { v4 as uuidv4 } from 'uuid';
import type { Block, BlockType } from './blockTypes';

const BLOCK_PATTERNS: Record<BlockType, RegExp> = {
  heading1: /^#\s+(.+)$/,
  heading2: /^##\s+(.+)$/,
  heading3: /^###\s+(.+)$/,
  task: /^\[([ xX])\]\s+(.+)$/,
  bulletList: /^[-*]\s+(.+)$/,
  numberedList: /^\d+\.\s+(.+)$/,
  code: /^```(\w*)\n([\s\S]*?)```$/,
  paragraph: /.+/
};

export function parseMarkdownToBlocks(markdown: string): Block[] {
  const lines = markdown.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Check for code block
    if (line.startsWith('```')) {
      const languageMatch = line.match(/^```(\w*)$/);
      const language = languageMatch?.[1] || '';
      const codeLines: string[] = [];
      i++;

      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }

      blocks.push({
        id: uuidv4(),
        type: 'code',
        content: codeLines.join('\n'),
        metadata: { language }
      });
      i++; // skip closing ```
      continue;
    }

    // Check other block types
    let matched = false;
    for (const [type, pattern] of Object.entries(BLOCK_PATTERNS)) {
      if (type === 'code' || type === 'paragraph') continue;

      const match = line.match(pattern);
      if (match) {
        const block: Block = {
          id: uuidv4(),
          type: type as BlockType,
          content: ''
        };

        if (type === 'task') {
          block.content = match[2];
          block.metadata = { completed: match[1].toLowerCase() === 'x' };
        } else if (type.startsWith('heading')) {
          block.content = match[1];
        } else {
          block.content = match[1];
        }

        blocks.push(block);
        matched = true;
        break;
      }
    }

    // Default to paragraph
    if (!matched) {
      blocks.push({
        id: uuidv4(),
        type: 'paragraph',
        content: line
      });
    }

    i++;
  }

  return blocks;
}

export function blocksToMarkdown(blocks: Block[]): string {
  return blocks.map(block => {
    switch (block.type) {
      case 'heading1':
        return `# ${block.content}`;
      case 'heading2':
        return `## ${block.content}`;
      case 'heading3':
        return `### ${block.content}`;
      case 'task':
        const checkbox = block.metadata?.completed ? '[x]' : '[ ]';
        return `${checkbox} ${block.content}`;
      case 'bulletList':
        return `- ${block.content}`;
      case 'numberedList':
        return `1. ${block.content}`;
      case 'code':
        const lang = block.metadata?.language || '';
        return `\`\`\`${lang}\n${block.content}\n\`\`\``;
      case 'paragraph':
      default:
        return block.content;
    }
  }).join('\n\n');
}
```

**Step 5: Run tests to verify they pass**

Run: `pnpm test blockParser -- --run`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/lib/blockTypes.ts src/lib/blockParser.ts src/lib/blockParser.test.ts
git commit -m "feat: add block type system and markdown parser"
```

---

## Task 2: Create Block Component

**Files:**
- Create: `src/components/Block.tsx`
- Create: `src/components/Block.css`

**Step 1: Create Block component with edit/view modes**

In `src/components/Block.tsx`:

```typescript
import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import type { Block as BlockType } from '../lib/blockTypes';
import './Block.css';

interface BlockProps {
  block: BlockType;
  isActive: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onChange: (content: string) => void;
  onEnter: () => void;
  onBackspace: (isEmpty: boolean) => void;
  onToggleTask?: () => void;
}

export function Block({
  block,
  isActive,
  onFocus,
  onBlur,
  onChange,
  onEnter,
  onBackspace,
  onToggleTask
}: BlockProps) {
  const [editContent, setEditContent] = useState(block.content);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditContent(block.content);
  }, [block.content]);

  useEffect(() => {
    if (isActive && contentRef.current) {
      contentRef.current.focus();
    }
  }, [isActive]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onEnter();
    } else if (e.key === 'Backspace' && editContent === '') {
      e.preventDefault();
      onBackspace(true);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.textContent || '';
    setEditContent(newContent);
    onChange(newContent);
  };

  const renderViewMode = () => {
    switch (block.type) {
      case 'heading1':
        return <h1 onClick={onFocus}>{block.content}</h1>;
      case 'heading2':
        return <h2 onClick={onFocus}>{block.content}</h2>;
      case 'heading3':
        return <h3 onClick={onFocus}>{block.content}</h3>;
      case 'task':
        return (
          <div className="task-block" onClick={onFocus}>
            <input
              type="checkbox"
              checked={block.metadata?.completed || false}
              onChange={(e) => {
                e.stopPropagation();
                onToggleTask?.();
              }}
            />
            <span
              className={block.metadata?.completed ? 'completed' : ''}
            >
              {block.content}
            </span>
          </div>
        );
      case 'bulletList':
        return (
          <ul onClick={onFocus}>
            <li>{block.content}</li>
          </ul>
        );
      case 'numberedList':
        return (
          <ol onClick={onFocus}>
            <li>{block.content}</li>
          </ol>
        );
      case 'code':
        return (
          <pre onClick={onFocus}>
            <code>{block.content}</code>
          </pre>
        );
      default:
        return <p onClick={onFocus}>{block.content || '\u00A0'}</p>;
    }
  };

  const getEditPrefix = () => {
    switch (block.type) {
      case 'heading1': return '# ';
      case 'heading2': return '## ';
      case 'heading3': return '### ';
      case 'task': return `[${block.metadata?.completed ? 'x' : ' '}] `;
      case 'bulletList': return '- ';
      case 'numberedList': return '1. ';
      default: return '';
    }
  };

  if (isActive) {
    return (
      <div className={`block block-${block.type} block-active`}>
        <span className="block-prefix">{getEditPrefix()}</span>
        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          className="block-content-editable"
        >
          {editContent}
        </div>
      </div>
    );
  }

  return (
    <div className={`block block-${block.type}`}>
      {renderViewMode()}
    </div>
  );
}
```

**Step 2: Create Block styles**

In `src/components/Block.css`:

```css
.block {
  margin: 0.5rem 0;
  min-height: 1.5rem;
  transition: background 0.1s;
}

.block:hover {
  background: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
}

.block-active {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  display: flex;
  align-items: center;
}

.block-prefix {
  color: #999;
  font-family: monospace;
  user-select: none;
  margin-right: 0.5rem;
}

.block-content-editable {
  flex: 1;
  outline: none;
  min-width: 0;
}

.task-block {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.task-block .completed {
  text-decoration: line-through;
  color: #999;
}

.block h1, .block h2, .block h3, .block p {
  margin: 0;
  cursor: pointer;
}

.block h1 {
  font-size: 2rem;
  font-weight: 600;
}

.block h2 {
  font-size: 1.5rem;
  font-weight: 600;
}

.block h3 {
  font-size: 1.25rem;
  font-weight: 600;
}

.block pre {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  cursor: pointer;
}

.block code {
  font-family: 'Courier New', monospace;
}
```

**Step 3: Commit**

```bash
git add src/components/Block.tsx src/components/Block.css
git commit -m "feat: add Block component with edit/view modes"
```

---

## Task 3: Create BlockEditor Component

**Files:**
- Create: `src/components/BlockEditor.tsx`

**Step 1: Create BlockEditor to manage blocks**

In `src/components/BlockEditor.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { Block } from './Block';
import { parseMarkdownToBlocks, blocksToMarkdown } from '../lib/blockParser';
import type { Block as BlockType } from '../lib/blockTypes';
import { v4 as uuidv4 } from 'uuid';

interface BlockEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function BlockEditor({ content, onChange }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<BlockType[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // Parse markdown to blocks on mount and when content changes externally
  useEffect(() => {
    const parsed = parseMarkdownToBlocks(content);
    if (parsed.length === 0) {
      // Start with empty paragraph
      parsed.push({
        id: uuidv4(),
        type: 'paragraph',
        content: ''
      });
    }
    setBlocks(parsed);
    if (!activeBlockId) {
      setActiveBlockId(parsed[0].id);
    }
  }, [content]);

  // Sync blocks to markdown
  const syncToMarkdown = (newBlocks: BlockType[]) => {
    const markdown = blocksToMarkdown(newBlocks);
    onChange(markdown);
  };

  const handleBlockChange = (blockId: string, newContent: string) => {
    setBlocks(prev => {
      const updated = prev.map(block =>
        block.id === blockId ? { ...block, content: newContent } : block
      );
      syncToMarkdown(updated);
      return updated;
    });
  };

  const handleEnter = (blockId: string) => {
    const blockIndex = blocks.findIndex(b => b.id === blockId);
    const newBlock: BlockType = {
      id: uuidv4(),
      type: 'paragraph',
      content: ''
    };

    setBlocks(prev => {
      const updated = [
        ...prev.slice(0, blockIndex + 1),
        newBlock,
        ...prev.slice(blockIndex + 1)
      ];
      syncToMarkdown(updated);
      return updated;
    });

    setActiveBlockId(newBlock.id);
  };

  const handleBackspace = (blockId: string, isEmpty: boolean) => {
    if (!isEmpty) return;

    const blockIndex = blocks.findIndex(b => b.id === blockId);
    if (blockIndex === 0) return; // Don't delete first block

    setBlocks(prev => {
      const updated = prev.filter(b => b.id !== blockId);
      syncToMarkdown(updated);
      return updated;
    });

    // Focus previous block
    if (blockIndex > 0) {
      setActiveBlockId(blocks[blockIndex - 1].id);
    }
  };

  const handleToggleTask = (blockId: string) => {
    setBlocks(prev => {
      const updated = prev.map(block => {
        if (block.id === blockId && block.type === 'task') {
          return {
            ...block,
            metadata: {
              ...block.metadata,
              completed: !block.metadata?.completed
            }
          };
        }
        return block;
      });
      syncToMarkdown(updated);
      return updated;
    });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      {blocks.map(block => (
        <Block
          key={block.id}
          block={block}
          isActive={block.id === activeBlockId}
          onFocus={() => setActiveBlockId(block.id)}
          onBlur={() => setActiveBlockId(null)}
          onChange={(content) => handleBlockChange(block.id, content)}
          onEnter={() => handleEnter(block.id)}
          onBackspace={(isEmpty) => handleBackspace(block.id, isEmpty)}
          onToggleTask={() => handleToggleTask(block.id)}
        />
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/BlockEditor.tsx
git commit -m "feat: add BlockEditor to manage block state"
```

---

## Task 4: Replace Milkdown with BlockEditor

**Files:**
- Modify: `src/components/NoteEditor.tsx`
- Delete: `src/components/MilkdownEditor.tsx`

**Step 1: Update NoteEditor to use BlockEditor**

In `src/components/NoteEditor.tsx`:

```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { updateNoteContent } from '../lib/noteOperations';
import { useState } from 'react';
import { BlockEditor } from './BlockEditor';

interface NoteEditorProps {
  noteId: string;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const note = useLiveQuery(() => db.notes.get(noteId), [noteId]);
  const [saveTimeout, setSaveTimeout] = useState<number | null>(null);

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
    <div>
      <h2 style={{ marginBottom: '1rem', paddingLeft: '2rem' }}>{note.title}</h2>
      <BlockEditor
        content={note.content}
        onChange={handleChange}
      />
      {note.tags.length > 0 && (
        <div style={{ marginTop: '1rem', color: '#666', paddingLeft: '2rem' }}>
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

**Step 2: Delete MilkdownEditor**

```bash
rm src/components/MilkdownEditor.tsx
```

**Step 3: Remove Milkdown dependencies**

```bash
pnpm remove @milkdown/core @milkdown/ctx @milkdown/prose @milkdown/react @milkdown/preset-commonmark @milkdown/preset-gfm @milkdown/plugin-listener @milkdown/plugin-history @milkdown/theme-nord @milkdown/plugin-block
```

**Step 4: Test the editor**

Run: `pnpm build`
Expected: Build succeeds

Run: `pnpm dev`
Expected: App loads with BlockEditor

**Step 5: Commit**

```bash
git add src/components/NoteEditor.tsx
git add -u src/components/MilkdownEditor.tsx
git add package.json pnpm-lock.yaml
git commit -m "feat: replace Milkdown with custom BlockEditor"
```

---

## Task 5: Add Slash Commands

**Files:**
- Create: `src/components/SlashMenu.tsx`
- Create: `src/components/SlashMenu.css`
- Modify: `src/components/Block.tsx`

**Step 1: Create SlashMenu component**

In `src/components/SlashMenu.tsx`:

```typescript
import { useEffect, useRef } from 'react';
import type { BlockType } from '../lib/blockTypes';
import './SlashMenu.css';

interface SlashMenuProps {
  isOpen: boolean;
  position: { top: number; left: number };
  onSelectType: (type: BlockType) => void;
  onClose: () => void;
}

const BLOCK_OPTIONS: Array<{ type: BlockType; label: string; icon: string }> = [
  { type: 'heading1', label: 'Heading 1', icon: 'H1' },
  { type: 'heading2', label: 'Heading 2', icon: 'H2' },
  { type: 'heading3', label: 'Heading 3', icon: 'H3' },
  { type: 'task', label: 'Task', icon: '☑' },
  { type: 'bulletList', label: 'Bullet List', icon: '•' },
  { type: 'numberedList', label: 'Numbered List', icon: '1.' },
  { type: 'code', label: 'Code Block', icon: '</>' },
];

export function SlashMenu({ isOpen, position, onSelectType, onClose }: SlashMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="slash-menu"
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {BLOCK_OPTIONS.map(option => (
        <div
          key={option.type}
          className="slash-menu-item"
          onClick={() => onSelectType(option.type)}
        >
          <span className="slash-menu-icon">{option.icon}</span>
          <span className="slash-menu-label">{option.label}</span>
        </div>
      ))}
    </div>
  );
}
```

**Step 2: Create SlashMenu styles**

In `src/components/SlashMenu.css`:

```css
.slash-menu {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0.5rem;
  min-width: 200px;
  z-index: 1000;
}

.slash-menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s;
}

.slash-menu-item:hover {
  background: #f5f5f5;
}

.slash-menu-icon {
  font-weight: bold;
  color: #666;
  min-width: 24px;
  text-align: center;
}

.slash-menu-label {
  flex: 1;
  font-size: 0.875rem;
}
```

**Step 3: Update Block to detect slash commands**

In `src/components/Block.tsx`, add slash menu handling:

```typescript
// Add to imports
import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { SlashMenu } from './SlashMenu';

// Add to BlockProps
interface BlockProps {
  // ... existing props
  onChangeType?: (newType: BlockType) => void;
}

// Add to Block component
export function Block({
  // ... existing props
  onChangeType
}: BlockProps) {
  // ... existing state
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });

  // Update handleInput to detect '/'
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.textContent || '';
    setEditContent(newContent);
    onChange(newContent);

    // Show slash menu if content is '/'
    if (newContent === '/') {
      const rect = e.currentTarget.getBoundingClientRect();
      setSlashMenuPosition({
        top: rect.bottom,
        left: rect.left
      });
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  };

  const handleSelectBlockType = (newType: BlockType) => {
    setShowSlashMenu(false);
    setEditContent('');
    onChangeType?.(newType);
  };

  // ... rest of component

  // Add SlashMenu to render
  return (
    <>
      {/* existing block rendering */}
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

**Step 4: Update BlockEditor to handle type changes**

In `src/components/BlockEditor.tsx`:

```typescript
// Add handler
const handleChangeType = (blockId: string, newType: BlockType) => {
  setBlocks(prev => {
    const updated = prev.map(block =>
      block.id === blockId ? { ...block, type: newType, content: '' } : block
    );
    syncToMarkdown(updated);
    return updated;
  });
};

// Update Block component call
<Block
  key={block.id}
  block={block}
  isActive={block.id === activeBlockId}
  onFocus={() => setActiveBlockId(block.id)}
  onBlur={() => setActiveBlockId(null)}
  onChange={(content) => handleBlockChange(block.id, content)}
  onEnter={() => handleEnter(block.id)}
  onBackspace={(isEmpty) => handleBackspace(block.id, isEmpty)}
  onToggleTask={() => handleToggleTask(block.id)}
  onChangeType={(newType) => handleChangeType(block.id, newType)}
/>
```

**Step 5: Test slash commands**

Run: `pnpm build`
Expected: Build succeeds

Run: `pnpm dev`
Expected: Typing '/' shows menu, selecting option changes block type

**Step 6: Commit**

```bash
git add src/components/SlashMenu.tsx src/components/SlashMenu.css src/components/Block.tsx src/components/BlockEditor.tsx
git commit -m "feat: add slash command menu for block types"
```

---

## Task 6: Improve Block Detection on Parse

**Files:**
- Modify: `src/lib/blockParser.ts`
- Modify: `src/lib/blockParser.test.ts`

**Step 1: Add auto-detection for block types as you type**

Update `src/lib/blockParser.ts` to detect block type from content:

```typescript
export function detectBlockType(content: string): { type: BlockType; cleanContent: string } {
  // Check patterns in priority order
  const heading1Match = content.match(/^#\s+(.+)$/);
  if (heading1Match) return { type: 'heading1', cleanContent: heading1Match[1] };

  const heading2Match = content.match(/^##\s+(.+)$/);
  if (heading2Match) return { type: 'heading2', cleanContent: heading2Match[1] };

  const heading3Match = content.match(/^###\s+(.+)$/);
  if (heading3Match) return { type: 'heading3', cleanContent: heading3Match[1] };

  const taskMatch = content.match(/^\[([ xX])\]\s+(.+)$/);
  if (taskMatch) {
    return {
      type: 'task',
      cleanContent: taskMatch[2]
    };
  }

  const bulletMatch = content.match(/^[-*]\s+(.+)$/);
  if (bulletMatch) return { type: 'bulletList', cleanContent: bulletMatch[1] };

  const numberedMatch = content.match(/^\d+\.\s+(.+)$/);
  if (numberedMatch) return { type: 'numberedList', cleanContent: numberedMatch[1] };

  return { type: 'paragraph', cleanContent: content };
}
```

**Step 2: Add tests for auto-detection**

In `src/lib/blockParser.test.ts`:

```typescript
import { detectBlockType } from './blockParser';

describe('detectBlockType', () => {
  it('should detect heading from content', () => {
    const result = detectBlockType('# Hello');
    expect(result.type).toBe('heading1');
    expect(result.cleanContent).toBe('Hello');
  });

  it('should detect task from content', () => {
    const result = detectBlockType('[ ] Todo');
    expect(result.type).toBe('task');
    expect(result.cleanContent).toBe('Todo');
  });

  it('should default to paragraph', () => {
    const result = detectBlockType('Just text');
    expect(result.type).toBe('paragraph');
    expect(result.cleanContent).toBe('Just text');
  });
});
```

**Step 3: Run tests**

Run: `pnpm test blockParser -- --run`
Expected: All tests PASS

**Step 4: Update BlockEditor to use auto-detection**

In `src/components/BlockEditor.tsx`:

```typescript
import { detectBlockType } from '../lib/blockParser';

const handleBlockChange = (blockId: string, newContent: string) => {
  setBlocks(prev => {
    const updated = prev.map(block => {
      if (block.id === blockId) {
        // Auto-detect block type from content
        const { type, cleanContent } = detectBlockType(newContent);
        return {
          ...block,
          type,
          content: cleanContent,
          metadata: type === 'task' ? {
            completed: newContent.match(/^\[x\]/i) ? true : false
          } : block.metadata
        };
      }
      return block;
    });
    syncToMarkdown(updated);
    return updated;
  });
};
```

**Step 5: Test auto-detection**

Run: `pnpm dev`
Expected: Typing `# ` converts to heading, `[ ] ` to task, etc.

**Step 6: Commit**

```bash
git add src/lib/blockParser.ts src/lib/blockParser.test.ts src/components/BlockEditor.tsx
git commit -m "feat: add auto-detection of block types while typing"
```

---

## Task 7: Final Testing & Cleanup

**Step 1: Run all tests**

Run: `pnpm test -- --run`
Expected: All tests PASS

**Step 2: Run build**

Run: `pnpm build`
Expected: Build succeeds with no errors

**Step 3: Manual testing checklist**

Run: `pnpm dev`

Test:
- [ ] Click block → shows markdown syntax (e.g., `# Heading`)
- [ ] Click away → shows formatted view
- [ ] Type `# Hello` → auto-converts to heading
- [ ] Type `[ ] Task` → creates task checkbox
- [ ] Click task checkbox → toggles completion
- [ ] Press Enter → creates new block below
- [ ] Type `/` → shows slash menu
- [ ] Select from slash menu → changes block type
- [ ] Empty block + Backspace → deletes block
- [ ] Tags still extract and display
- [ ] Auto-save still works

**Step 4: Update README**

Add to `README.md`:

```markdown
## Block-Based Editor

The notes app uses a custom block-based editor (similar to Notion):

- **Click a block** to edit with markdown syntax visible
- **Click away** to see formatted view
- **Press Enter** to create new block
- **Type `/`** to open slash command menu
- **Auto-formatting**: Type `# ` for heading, `[ ] ` for task, etc.
```

**Step 5: Final commit**

```bash
git add README.md
git commit -m "docs: update README with block editor info"
```

---

## Success Criteria

✅ Blocks show markdown syntax when active (cursor on line)
✅ Blocks show formatted view when inactive
✅ Tasks render as interactive checkboxes
✅ Enter creates new block
✅ Slash commands work
✅ Auto-detection of block types
✅ All existing features (tags, auto-save, search) still work
✅ Tests pass
✅ Build succeeds

---

**Phase 2 Enhancements (Future):**
- Drag-and-drop block reordering
- Block selection and bulk operations
- More slash command options
- Nested blocks (indentation)
- Rich text formatting within blocks
- Inline code/link/bold formatting
