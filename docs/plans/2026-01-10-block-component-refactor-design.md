# Block Component Refactor Design

## Problem Statement

The current Block component has several critical issues:

1. **Performance**: Re-renders on every keystroke due to dual state syncing between local and parent content
2. **Maintainability**: 224-line component with too many responsibilities (editing, rendering, type detection, slash menu)
3. **Styling inconsistency**: Uses inline styles instead of Tailwind, violating project guidelines

## Solution Overview

Refactor into a focused component architecture with clear separation of concerns:

- **Block.tsx** - Thin coordinator component (~20 lines)
- **BlockEditor.tsx** - Handles editing mode with local state
- **BlockRenderer.tsx** - Routes to type-specific renderers
- **blocks/** - Individual block type components

## Architecture

### File Structure

```
src/components/
  Block.tsx                 # Coordinator
  BlockEditor.tsx           # Editing mode
  BlockRenderer.tsx         # View mode coordinator
  blocks/
    HeadingBlock.tsx        # h1, h2, h3 rendering
    TaskBlock.tsx           # Checkbox tasks
    ListBlock.tsx           # Bullet and numbered lists
    CodeBlock.tsx           # Code blocks
    ParagraphBlock.tsx      # Default text
```

### Data Flow

1. Parent passes `block.content` to `Block` component
2. When `isActive=false`: Block renders `BlockRenderer` which displays formatted view using `block.content` directly (no local state)
3. When `isActive=true`: Block renders `BlockEditor` which:
   - Initializes local state from `block.content` on mount
   - Updates local state on every keystroke
   - Only calls parent's update callback when blurred/unfocused
4. Parent only re-renders Block when it receives the blur callback, not during typing

**Key principle:** BlockEditor owns content during editing. Parent only learns about changes when editing is complete.

## Component Specifications

### Block.tsx (Coordinator)

**Responsibilities:**
- Switch between BlockEditor and BlockRenderer based on `isActive`
- Forward callbacks to appropriate component

**Props:**
```typescript
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
```

**Implementation:**
Simple conditional render - if active, show BlockEditor; otherwise show BlockRenderer.

### BlockEditor.tsx

**Responsibilities:**
- Manage local content state during editing
- Handle keyboard navigation (Enter, Backspace)
- Detect block type changes from content
- Show/hide slash menu
- Sync to parent only on blur

**Props:**
```typescript
interface BlockEditorProps {
  initialContent: string;
  blockType: BlockType['type'];
  onBlur: (finalContent: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  onTypeChange: (newType: string) => void;
}
```

**State:**
```typescript
const [content, setContent] = useState(initialContent);
const [showSlashMenu, setShowSlashMenu] = useState(false);
const textareaRef = useRef<HTMLTextAreaElement>(null);
```

**Key changes from current implementation:**
- No `onChange` callback - parent doesn't receive keystroke updates
- `onBlur` receives final content as parameter
- No `isActive` prop - component only exists when active
- Single `useEffect` to focus and position cursor on mount
- No state syncing from parent during editing
- Uses Tailwind classes for styling

### BlockRenderer.tsx

**Responsibilities:**
- Receive block type and content
- Delegate to appropriate block type renderer
- Handle click to activate editing

**Props:**
```typescript
interface BlockRendererProps {
  block: BlockType;
  onActivate: () => void;
  onToggleTask?: () => void; // Only for task blocks
}
```

**Implementation:**
Simple switch statement that routes to individual block components. Each case is one line - just instantiating the appropriate component.

### Individual Block Components

**Common interface:**
```typescript
interface BlockProps {
  content: string;
  onClick: () => void;
}
```

**Type-specific interfaces:**
```typescript
interface HeadingBlockProps extends BlockProps {
  type: 'heading1' | 'heading2' | 'heading3';
}

interface ListBlockProps extends BlockProps {
  type: 'bulletList' | 'numberedList';
}

interface TaskBlockProps extends BlockProps {
  onToggle: () => void;
}
```

**Styling guidelines:**
- Use Tailwind classes only
- Layout: `flex`, `gap-2`, `ml-6`
- Typography: `text-2xl`, `font-bold`, `line-through`
- Spacing: `mb-2`, `p-4`
- Interaction: `cursor-pointer`
- **NO custom colors, borders, or backgrounds** (except CodeBlock's existing gray background)

**TaskBlock special behavior:**
- Checkbox click calls `onToggle` and stops propagation
- Does NOT enter edit mode when checkbox clicked
- Only enters edit mode when text area clicked

Each block component is 10-15 lines, focused solely on rendering its type.

## Benefits

### Performance
- ✅ Parent doesn't re-render on every keystroke
- ✅ Only BlockEditor re-renders while typing
- ✅ Content syncs to parent only on blur
- ✅ Eliminates dual state syncing issues

### Maintainability
- ✅ Each block type isolated in own file
- ✅ Easy to add new block types (add case + create component)
- ✅ Clear single responsibility per component
- ✅ Block.tsx shrinks from 224 lines to ~20 lines

### Consistency
- ✅ All styling uses Tailwind (per project guidelines)
- ✅ Minimal, clean interface with no unnecessary borders/colors
- ✅ Consistent patterns across all block types

## Migration Notes

- Current Block component can be replaced incrementally
- Parent components (NoteEditor) need to handle `onToggleTask` callback for task blocks
- SlashMenu integration moves entirely to BlockEditor
- All inline styles converted to Tailwind equivalents
