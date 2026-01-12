import { Command } from 'cmdk';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAppStore } from '../store/appStore';
import { createNote, updateNoteLastOpened } from '../lib/noteOperations';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './CommandPalette.css';

export function CommandPalette() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setCurrentNote,
    toggleSettingsPanel
  } = useAppStore();

  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const notes = useLiveQuery(() =>
    db.notes.orderBy('lastOpenedAt').reverse().toArray()
  );

  const tags = useLiveQuery(() =>
    db.tags.orderBy('usageCount').reverse().toArray()
  );

  // Filter notes by selected tag
  const filteredNotes = selectedTag
    ? notes?.filter(note => note.tags.includes(selectedTag))
    : notes;

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
    const note = await createNote();
    await updateNoteLastOpened(note.id);
    setCurrentNote(note.id);
    setCommandPaletteOpen(false);
  };

  const handleSelectNote = async (noteId: string) => {
    await updateNoteLastOpened(noteId);
    setCurrentNote(noteId);
    setCommandPaletteOpen(false);
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
      onClick={() => setCommandPaletteOpen(false)}
    >
      <Command
        label="Command Menu"
        onClick={(e) => e.stopPropagation()}
        loop
      >
        <Command.Input
          placeholder="Search notes or run command..."
          autoFocus
        />
        <Command.List>
          <Command.Empty>
            No results found
          </Command.Empty>

          <Command.Group heading="Commands">
            <Command.Item
              onSelect={() => {
                handleNewNote();
                setCommandPaletteOpen(false);
              }}
            >
              Create Note
            </Command.Item>
            <Command.Item
              onSelect={() => {
                toggleSettingsPanel();
                setCommandPaletteOpen(false);
              }}
            >
              Settings
            </Command.Item>
            {selectedTag && (
              <Command.Item onSelect={() => setSelectedTag(null)}>
                Clear filter: #{selectedTag}
              </Command.Item>
            )}
          </Command.Group>

          {tags && tags.length > 0 && !selectedTag && (
            <Command.Group heading="Tags">
              {tags.map(tag => (
                <Command.Item
                  key={tag.name}
                  value={`tag:${tag.name}`}
                  onSelect={() => setSelectedTag(tag.name)}
                >
                  #{tag.name} ({tag.usageCount})
                </Command.Item>
              ))}
            </Command.Group>
          )}

          <Command.Group heading={selectedTag ? `Notes tagged #${selectedTag}` : "Recent Notes"}>
            {filteredNotes?.map(note => (
              <Command.Item
                key={note.id}
                value={note.title}
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
