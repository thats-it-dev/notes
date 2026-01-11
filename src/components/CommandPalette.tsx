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
    </div>,
    document.body
  );
}
