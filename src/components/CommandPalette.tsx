import { Command } from 'cmdk';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAppStore } from '../store/appStore';
import { createNote, updateNoteLastOpened } from '../lib/noteOperations';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
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
              onSelect={handleNewNote}
            >
            Create Note
            </Command.Item>
            <Command.Item
              onSelect={toggleTaskPanel}
            >
            Settings
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Recent Notes">
            {notes?.map(note => (
              <Command.Item
                key={note.id}
                value={note.title}
                onSelect={() => handleSelectNote(note.id)}
              >
                {note.title}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>,
    document.body
  );
}
