import { Command, Button, Dialog } from '@thatsit/ui';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAppStore } from '../store/appStore';
import { createNote, updateNoteLastOpened, deleteNote } from '../lib/noteOperations';
import { useEffect, useLayoutEffect, useState, useMemo, useRef } from 'react';
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

// Marquee component for scrolling long titles
function MarqueeTitle({ title, isActive }: { title: string; isActive: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLHeadingElement>(null);
  const [scrollDistance, setScrollDistance] = useState(0);
  const [resetting, setResetting] = useState(false);

  const displayTitle = title || 'Untitled';

  // Calculate scroll distance - DOM measurement requires setState in effect
  useLayoutEffect(() => {
    if (containerRef.current && measureRef.current) {
      const textWidth = measureRef.current.scrollWidth;
      const containerWidth = containerRef.current.clientWidth;
      const overflow = textWidth - containerWidth;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScrollDistance(overflow > 0 ? overflow + 16 : 0);
    }
  }, [title]);

  // Reset when becoming inactive
  useLayoutEffect(() => {
    if (!isActive && resetting) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResetting(false);
    }
  }, [isActive, resetting]);

  const isOverflowing = scrollDistance > 0;
  const shouldAnimate = isActive && isOverflowing && !resetting;
  const duration = Math.max(2, scrollDistance * 0.02);

  const handleTransitionEnd = () => {
    if (isActive && isOverflowing && !resetting) {
      // Reached the end, pause then hard reset
      setTimeout(() => {
        setResetting(true);
        // Start scrolling again after reset
        setTimeout(() => {
          setResetting(false);
        }, 50);
      }, 1000);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden h-7"
    >
      {/* Hidden element for measuring */}
      <h5 ref={measureRef} className="invisible whitespace-nowrap absolute">{displayTitle}</h5>

      {/* Visible element */}
      <h5
        className={`absolute top-0 left-0 h-full leading-7 ${shouldAnimate ? '' : 'right-0'} ${resetting ? '' : 'transition-transform ease-linear'}`}
        style={{
          transform: shouldAnimate ? `translateX(-${scrollDistance}px)` : 'translateX(0)',
          transitionDuration: shouldAnimate ? `${duration}s` : '0s',
          transitionDelay: shouldAnimate ? '0.5s' : '0s',
          whiteSpace: 'nowrap',
          overflow: shouldAnimate ? 'visible' : 'hidden',
          textOverflow: shouldAnimate ? 'clip' : 'ellipsis',
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {displayTitle}
      </h5>
    </div>
  );
}

function SwipeableNoteItem({ note, searchTag, onSelect, onDelete, isOpen, onSwipeOpen }: SwipeableNoteItemProps) {
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);

  // Watch for data-selected attribute changes (keyboard navigation)
  useEffect(() => {
    const item = itemRef.current?.querySelector('[data-note-id]');
    if (!item) return;

    const observer = new MutationObserver(() => {
      const isSelected = item.getAttribute('data-selected') === 'true';
      setIsHighlighted(isSelected);
    });

    observer.observe(item, { attributes: true, attributeFilter: ['data-selected'] });
    return () => observer.disconnect();
  }, []);

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
      ref={itemRef}
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
          className="flex justify-between items-center w-full group"
          data-note-id={note.id}
        >
          <span className="flex-1 flex flex-col gap-1 min-w-0 overflow-hidden">
            <MarqueeTitle title={note.title || 'Untitled'} isActive={isHighlighted || isHovered} />
            {note.tags.length > 0 && (
              <p className="text-xs text-foreground-muted shrink-0">
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
                        closePalette();
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

      <Dialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
        title="Log out"
        description="Do you want to delete your local notes? They will still be available on other devices if synced."
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
