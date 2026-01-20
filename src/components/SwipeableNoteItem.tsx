import { useRef, useState, useEffect } from 'react';
import { Command, Button } from '@thatsit/ui';
import { Ellipsis, Trash } from 'lucide-react';
import { MarqueeTitle } from './MarqueeTitle';
import type { Note } from '../lib/types';

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

export function SwipeableNoteItem({ note, searchTag, onSelect, onDelete, isOpen, onSwipeOpen }: SwipeableNoteItemProps) {
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
