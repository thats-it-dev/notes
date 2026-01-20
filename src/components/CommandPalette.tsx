import { Command, Button } from '@thatsit/ui';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAppStore } from '../store/appStore';
import { createNote, updateNoteLastOpened, deleteNote } from '../lib/noteOperations';
import { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Note } from '../lib/types';
import { Ellipsis, Trash } from 'lucide-react';
import { useSync } from '../sync';

const SWIPE_THRESHOLD = 50;
const DELETE_WIDTH = 80;

interface SwipeableNoteItemProps {
  note: Note;
  searchTag: string | null;
  onSelect: (noteId: string) => void;
  onDelete: (noteId: string) => void;
  isOpen: boolean;
  onSwipeOpen: (noteId: string | null) => void;
}

function SwipeableNoteItem({ note, searchTag, onSelect, onDelete, isOpen, onSwipeOpen }: SwipeableNoteItemProps) {
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const offset = dragOffset !== null ? dragOffset : (isOpen ? -DELETE_WIDTH : 0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
    setDragOffset(isOpen ? -DELETE_WIDTH : 0);
    isHorizontalSwipe.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const diffX = startX.current - touchX;
    const diffY = startY.current - touchY;

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipe.current === null && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
    }

    // Only handle horizontal swipes
    if (isHorizontalSwipe.current) {
      e.preventDefault();

      const baseOffset = isOpen ? -DELETE_WIDTH : 0;
      let newOffset = baseOffset + (touchX - startX.current);
      newOffset = Math.max(-DELETE_WIDTH, Math.min(0, newOffset));
      setDragOffset(newOffset);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (isHorizontalSwipe.current) {
      if (offset < -SWIPE_THRESHOLD) {
        onSwipeOpen(note.id);
      } else {
        onSwipeOpen(null);
      }
    }

    setDragOffset(null);
    isHorizontalSwipe.current = null;
  };

  const handleClick = () => {
    if (isOpen) {
      onSwipeOpen(null);
    } else {
      onSelect(note.id);
    }
  };

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Button
        variant='danger'
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onDelete(note.id);
        }}
        className="absolute right-0 top-0 bottom-0 w-20 border-none cursor-pointer flex items-center justify-center"
      >
        <Trash className="w-5 h-5" />
      </Button>

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative bg-[var(--bg)] touch-pan-y ${isDragging ? '' : 'transition-transform duration-200 ease-out'}`}
        style={{ transform: `translateX(${offset}px)` }}
      >
        <Command.Item
          value={searchTag ? note.id : note.title}
          onSelect={handleClick}
          className="flex justify-between items-center w-full"
        >
          <span className="flex-1 flex flex-row gap-2 items-baseline">
            <h5>{note.title || 'Untitled'}</h5>
            {note.tags.length > 0 && (
              <p className="text-xs text-foreground-muted">
                {note.tags.map((t: string) => `#${t}`).join(' ')}
              </p>
            )}
          </span>
          {isHovered && !isOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onSwipeOpen(note.id);
              }}
            >
              <Ellipsis className="w-5 h-5" />
            </Button>
          )}
        </Command.Item>
      </div>
    </div>
  );
}

export function CommandPalette() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setCurrentNote,
    currentNoteId,
    setSettingsPanelOpen
  } = useAppStore();

  const { isEnabled, disable } = useSync();
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
                      }}
                    >
                      Log out
                    </Command.Item>
                  ) : (
                    <Command.Item
                      onSelect={() => {
                        setSettingsPanelOpen(true);
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

      {showLogoutDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]"
          onClick={() => setShowLogoutDialog(false)}
        >
          <div
            className="bg-[var(--bg)] border border-[var(--border-color)] rounded-lg p-6 max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Log out</h3>
            <p className="text-[var(--text-muted)] mb-6">
              Do you want to delete your local notes? They will still be available on other devices if synced.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => handleLogout(false)}>
                Keep local notes
              </Button>
              <Button variant="danger" onClick={() => handleLogout(true)}>
                Delete local notes
              </Button>
              <Button variant="ghost" onClick={() => setShowLogoutDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
