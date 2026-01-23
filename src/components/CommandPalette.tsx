import { Command, Button, Dialog } from '@thatsit/ui';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAppStore } from '../store/appStore';
import { useSyncStore } from '../store/syncStore';
import { createNote, updateNoteLastOpened, deleteNote } from '../lib/noteOperations';
import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Note } from '../lib/types';
import { SwipeableNoteItem } from './SwipeableNoteItem';

export function CommandPalette() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setCurrentNote,
    currentNoteId,
    setAuthPanelOpen
  } = useAppStore();

  const { isEnabled, disable } = useSyncStore();
  const [search, setSearch] = useState('');
  const [swipedNoteId, setSwipedNoteId] = useState<string | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const notes = useLiveQuery(async () => {
    const allNotes = await db.notes.orderBy('lastOpenedAt').reverse().toArray();
    return allNotes.filter(n => !n.deletedAt);
  });

  // Detect if searching for a tag (starts with #)
  const searchTag = search.startsWith('#') ? search.slice(1).toLowerCase() : null;

  // Filter notes by tag when searching with #
  const displayNotes = useMemo(() => {
    if (!notes) return [];
    if (searchTag) {
      return notes.filter((note: Note) =>
        note.tags.some((tag: string) => tag.toLowerCase().includes(searchTag))
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

  // Lock body scroll when palette is open
  useEffect(() => {
    if (commandPaletteOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [commandPaletteOpen]);

  const closePalette = () => {
    setCommandPaletteOpen(false);
    setSearch('');
    setSwipedNoteId(null);
  };

  const handleSwipeDelete = async (noteId: string) => {
    await deleteNote(noteId);

    // Find another note to switch to if deleting current
    if (noteId === currentNoteId && notes) {
      const remainingNotes = notes.filter((n: Note) => n.id !== noteId && !n.deletedAt);
      if (remainingNotes.length > 0) {
        setCurrentNote(remainingNotes[0].id);
      } else {
        const newNote = await createNote();
        setCurrentNote(newNote.id);
      }
    }

    setSwipedNoteId(null);
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

  const handleLogout = (deleteLocalData: boolean) => {
    if (deleteLocalData) {
      db.notes.clear();
      db.syncMeta.clear();
    }
    disable();
    setShowLogoutDialog(false);
    closePalette();
    if (deleteLocalData) {
      window.location.reload();
    }
  };

  if (!commandPaletteOpen && !showLogoutDialog) return null;

  return createPortal(
    <>
      {commandPaletteOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-start md:items-center md:pt-0 justify-center z-[100]"
          style={{
            paddingTop: 'var(--safe-area-inset-top, 0px)',
            paddingLeft: 'var(--safe-area-inset-left, 0px)',
            paddingRight: 'var(--safe-area-inset-right, 0px)',
          }}
          onClick={closePalette}
        >
          <Command
            label="Command Menu"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
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
                </Command.Group>
              )}

              <Command.Group heading={searchTag ? `Notes with #${searchTag}` : "Recent Notes"}>
                {displayNotes.map((note: Note) => (
                  <SwipeableNoteItem
                    key={note.id}
                    note={note}
                    searchTag={searchTag}
                    onSelect={handleSelectNote}
                    onDelete={handleSwipeDelete}
                    isOpen={swipedNoteId === note.id}
                    onSwipeOpen={setSwipedNoteId}
                  />
                ))}
              </Command.Group>
              <Command.Group heading="Settings">
                {isEnabled ? (
                    <Command.Item
                      onSelect={() => {
                        setShowLogoutDialog(true);
                        closePalette();
                      }}
                    >
                      Log out
                    </Command.Item>
                  ) : (
                    <Command.Item
                      onSelect={() => {
                        setAuthPanelOpen(true);
                        closePalette();
                      }}
                    >
                      Log in
                    </Command.Item>
                  )}
              </Command.Group>
            </Command.List>
          </Command>
        </div>
      )}

      <Dialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        title="Log out"
        description="Do you want delete your notes from this device? This will not effect your notes on other devices."
        size="sm"
        footer={
          <div className="flex flex-row gap-2 w-full justify-end">
            <Button onClick={() => handleLogout(false)}>
              Keep
            </Button>
            <Button variant="danger" onClick={() => handleLogout(true)}>
              Delete
            </Button>
            <Button variant="ghost" onClick={() => setShowLogoutDialog(false)}>
              Cancel
            </Button>
          </div>
        }
      >
        <div />
      </Dialog>
    </>,
    document.body
  );
}
