# Notes App Design

**Date:** 2026-01-09
**Status:** Approved
**Phase:** 1 (Local-first, Solo)

## Overview

A minimal, local-first note-taking app with markdown support, inline task management, and tag-based organization. Notes are edited with a hybrid rendering system where the current line shows raw markdown while other lines render as formatted content.

## Core Principles

- **Extremely simple to use** - App opens to last note, ready to type immediately
- **Local-first** - All data stored in IndexedDB, works offline
- **Tags not folders** - Organization via inline hashtags
- **Minimal UI** - Match @thatsit/ui aesthetic, lots of whitespace
- **No manual saving** - Auto-save everything

## Data Model

### Dexie Tables

```typescript
notes {
  id: string (uuid)
  title: string (derived from first line or "Untitled")
  content: string (raw markdown)
  tags: string[] (all hashtags found in note)
  createdAt: Date
  updatedAt: Date
  lastOpenedAt: Date
}

tasks {
  id: string (uuid)
  title: string
  completed: boolean
  noteId: string (reference to note)
  lineNumber: number (which line in the note)
  tags: string[] (hashtags from that line)
  createdAt: Date
  updatedAt: Date
}

tags {
  name: string (primary key, e.g., "work")
  usageCount: number
  lastUsedAt: Date
}
```

### Data Flow

1. User types in note → content saved to Dexie
2. Parser extracts tasks and hashtags from content
3. Tasks table and tags table updated automatically
4. Tag usage counts maintained incrementally
5. Tags with usageCount = 0 are deleted

### Parsing Logic

**Content parser extracts:**
- Title: First heading or first line (truncated to 500 chars)
- Tags: All `#hashtag` patterns using regex `/#[\w-]+/g`
- Tasks: Checkboxes using regex `/^[\s-]*\[( |x)\]\s+(.+)$/gm`
- Task tags: Hashtags found on the same line as task

**Task identity across edits:**
- Match by line number + title similarity (fuzzy match)
- If line moved but title same → update lineNumber
- If title changed significantly → treat as delete + create

## Component Architecture

### App Structure

```
<App>
  <CommandPalette />           // Cmd+K for search/commands
  <NotesView>
    <NoteEditor />              // Milkdown editor
  </NotesView>
  <TaskPanel />                 // Slide-out global task list
</App>
```

### Core Components

**NoteEditor:**
- Milkdown-based markdown editor
- Line-by-line hybrid rendering (cursor on line = raw markdown, else rendered)
- Auto-save on blur/debounced while typing
- Inline task checkboxes clickable even in rendered mode
- Custom plugins: tasks, hashtags, slash commands

**TaskPanel:**
- List of all tasks with checkboxes
- Filter chips for tags (click to toggle filter)
- Tasks grouped by completion status
- Click task title → jump to note and line
- Check/uncheck directly in panel (syncs to note content)

**CommandPalette:**
- Fuzzy search notes by title/content
- Search tasks
- Filter by tags (type `#`)
- Recent notes
- Commands: New Note, Toggle Tasks
- Slash commands when invoked in note: `/task`, `/h1`, `/h2`, `/code`, `/link`

## Markdown Editing

### Milkdown Setup

**Dependencies:**
- `@milkdown/react` - React integration
- `@milkdown/preset-commonmark` - Standard markdown
- `@milkdown/plugin-listener` - Content change detection
- `@milkdown/plugin-history` - Undo/redo

**Custom Plugins:**
1. **Task Plugin** - Handle `[ ]` checkboxes, make interactive, sync with task entities
2. **Hashtag Plugin** - Detect `#tags`, make clickable, trigger autocomplete
3. **Slash Command Plugin** - Handle `/task`, `/heading`, etc.

**Styling:**
- Override Milkdown's default theme
- Match @thatsit/ui minimal aesthetic
- Clean typography, subtle syntax highlighting

### Editor Behavior

- Current line (cursor position) shows raw markdown
- All other lines render as formatted HTML
- Hashtags render as clickable chips
- Task checkboxes are interactive in both modes
- Debounced auto-save (300ms after typing stops)

## State Management

### Zustand Store

```typescript
interface AppStore {
  currentNoteId: string | null
  taskPanelOpen: boolean
  commandPaletteOpen: boolean
  selectedTags: string[]
  taskFilter: 'all' | 'active' | 'completed'

  setCurrentNote: (id: string) => void
  toggleTaskPanel: () => void
  toggleCommandPalette: () => void
  addTagFilter: (tag: string) => void
  removeTagFilter: (tag: string) => void
}
```

### Reactive Queries (Dexie + React)

Use `dexie-react-hooks` for reactive data:
- `useLiveQuery(() => db.notes.get(currentNoteId))` - Current note
- `useLiveQuery(() => db.tasks.where({completed: false}).toArray())` - Active tasks
- `useLiveQuery(() => db.tags.orderBy('usageCount').reverse().toArray())` - Popular tags

**State Philosophy:**
- Zustand manages UI state only
- Dexie manages data
- `useLiveQuery` provides reactive bridge

## Initial Load Behavior

1. Query most recent note by `lastOpenedAt`
2. If no notes exist → create empty "Welcome" note with helpful markdown examples
3. Load app, show note immediately (no loading states - local-first advantage)
4. Update `lastOpenedAt` timestamp

## Error Handling

### Database Errors

- **Quota exceeded** → Show warning, offer to delete old notes
- **Corruption** → Fallback to localStorage, show recovery UI
- **Migration failures** → Log error, maintain old schema

### Parsing Edge Cases

- **Malformed markdown** → Render as plain text, don't crash
- **Conflicting task states** → Content is source of truth
- **Orphaned tasks** → Cascade delete when note deleted
- **Duplicate hashtags** → Deduplicate in tags array

### Editor Edge Cases

- **Very large notes (>10k lines)** → Consider virtual scrolling
- **Rapid typing** → Debounce saves, show "Saving..." indicator
- **Concurrent edits** → Last-write-wins (Phase 1)

### Task Checkbox Sync

- **Check in note** → Update task entity + content atomically
- **Check in task panel** → Update entity, then update note content at line
- **Line numbers shift** → Re-parse to find correct line

### Graceful Degradation

- Milkdown fails → Fall back to plain textarea
- Command palette broken → Allow manual note switching

## Testing Strategy

### Unit Tests

- Parser functions (hashtag extraction, task extraction, title derivation)
- Tag usage count calculations
- Task-to-line-number mapping logic

### Integration Tests

- Note CRUD → verify database state
- Task checkbox toggle → verify entity + content update
- Tag filtering → verify correct results
- Command palette search → verify results

### Manual Testing Checklist

- [ ] Create note, type content, verify auto-save
- [ ] Add tasks with hashtags, verify in task panel
- [ ] Check/uncheck tasks in note and panel
- [ ] Filter tasks by tags
- [ ] Search notes via command palette
- [ ] Use slash commands to insert markdown
- [ ] Close/reopen app, verify last note loads
- [ ] Test with large note (1000+ lines)
- [ ] Test offline functionality

## Launch Criteria

- Core flow works: create note → add tasks → filter → search
- Data persists across sessions
- No critical bugs in editor or task sync
- Clean, minimal UI matching @thatsit/ui aesthetic

## Future: Phase 2 (Sync Integration)

**When integrating with "Sync, that's it" backend:**

1. Add user authentication
2. Sync local Dexie → backend PostgreSQL
3. Handle conflicts (operational transforms or CRDTs)
4. Add @-mentions for user collaboration on tasks
5. Real-time sync across devices

**Backend compatibility:**
- Local schema designed to align with backend tables
- Tasks are first-class entities (not just markdown)
- UUIDs used throughout for easy sync
- Tags system maps to backend list filtering

**Migration from Phase 1 → 2:**
- Local data exports to sync service
- Add `user_id` foreign keys
- Implement conflict resolution
- Add collaboration features (@-mentions, shared notes)
