import { Command } from 'cmdk';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAppStore } from '../store/appStore';
import { createNote, updateNoteLastOpened } from '../lib/noteOperations';
import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import './CommandPalette.css';

export function CommandPalette() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setCurrentNote,
    toggleSettingsPanel
  } = useAppStore();

  const [search, setSearch] = useState('');

  const notes = useLiveQuery(() =>
    db.notes.orderBy('lastOpenedAt').reverse().toArray()
  );

  // Detect if searching for a tag (starts with #)
  const searchTag = search.startsWith('#') ? search.slice(1).toLowerCase() : null;

  // Filter notes by tag when searching with #
  const displayNotes = useMemo(() => {
    if (!notes) return [];
    if (searchTag) {
      return notes.filter(note =>
        note.tags.some(tag => tag.toLowerCase().includes(searchTag))
      );
    }
    return notes;
  }, [notes, searchTag]);

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

  const closePalette = () => {
    setCommandPaletteOpen(false);
    setSearch('');
  };

  const handleNewNote = async () => {
    const note = await createNote();
    await updateNoteLastOpened(note.id);
    setCurrentNote(note.id);
    closePalette();
  };

  const handleSelectNote = async (noteId: string) => {
    await updateNoteLastOpened(noteId);
    setCurrentNote(noteId);
    closePalette();
  };

  if (!commandPaletteOpen) return null;

  return createPortal(
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
      onClick={closePalette}
    >
      <Command
        label="Command Menu"
        onClick={(e) => e.stopPropagation()}
        loop
        shouldFilter={!searchTag}
      >
        <Command.Input
          placeholder="Search notes, #tags, or commands..."
          autoFocus
          value={search}
          onValueChange={setSearch}
        />
        <Command.List>
          <Command.Empty>
            {searchTag
              ? `No notes found with tag #${searchTag}`
              : 'No results found'}
          </Command.Empty>

          {!searchTag && (
            <Command.Group heading="Commands">
              <Command.Item onSelect={handleNewNote}>
                Create Note
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  toggleSettingsPanel();
                  closePalette();
                }}
              >
                Settings
              </Command.Item>
            </Command.Group>
          )}

          <Command.Group heading={searchTag ? `Notes with #${searchTag}` : "Recent Notes"}>
            {displayNotes.map(note => (
              <Command.Item
                key={note.id}
                value={searchTag ? note.id : note.title}
                onSelect={() => handleSelectNote(note.id)}
              >
                {note.title || 'Untitled'}
                {note.tags.length > 0 && (
                  <span className="note-tags">
                    {note.tags.map(t => `#${t}`).join(' ')}
                  </span>
                )}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>,
    document.body
  );
}
