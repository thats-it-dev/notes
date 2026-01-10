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
