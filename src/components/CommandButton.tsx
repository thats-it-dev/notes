import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { CommandIcon, Share, Download, Pin, Trash } from 'lucide-react';
import { Button } from '@thatsit/ui';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { blocksToMarkdown } from '../lib/blockNoteConverters';
import { deleteNote, createNote } from '../lib/noteOperations';

export function CommandButton() {
  const { setCommandPaletteOpen, currentNoteId, setCurrentNote } = useAppStore();
  const [showActions, setShowActions] = useState(false);

  const currentNote = useLiveQuery(
    () => currentNoteId ? db.notes.get(currentNoteId) : undefined,
    [currentNoteId]
  );

  const handleMainButtonClick = () => {
    if (showActions) {
      // Second tap - open command palette
      setCommandPaletteOpen(true);
      setShowActions(false);
    } else {
      // First tap - show quick actions
      setShowActions(true);
    }
  };

  const handleShare = async () => {
    if (!currentNote) return;
    const markdown = blocksToMarkdown(currentNote.content || []);
    if (navigator.share) {
      await navigator.share({ title: currentNote.title || 'Untitled', text: markdown });
    } else {
      await navigator.clipboard.writeText(markdown);
    }
    setShowActions(false);
  };

  const handleExport = () => {
    if (!currentNote) return;
    const markdown = blocksToMarkdown(currentNote.content || []);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentNote.title || 'untitled'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowActions(false);
  };

  const handlePin = async () => {
    if (!currentNote) return;
    await db.notes.update(currentNote.id, { pinned: !currentNote.pinned });
    setShowActions(false);
  };

  const handleDelete = async () => {
    if (!currentNoteId) return;
    const notes = await db.notes.filter(n => !n.deletedAt && n.id !== currentNoteId).toArray();
    await deleteNote(currentNoteId);
    if (notes.length > 0) {
      setCurrentNote(notes[0].id);
    } else {
      const newNote = await createNote();
      setCurrentNote(newNote.id);
    }
    setShowActions(false);
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col items-center gap-2"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Quick action buttons - fold out vertically */}
      <div
        className={`flex flex-col gap-2 transition-all duration-200 ${
          showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <Button
          variant="ghost"
          onClick={handleShare}
          className="w-12 h-12 items-center justify-center bg-[var(--bg)] border border-[var(--border-color)] rounded-full shadow-lg"
          title="Share"
        >
          <Share size={20} />
        </Button>
        <Button
          variant="ghost"
          onClick={handleExport}
          className="w-12 h-12 items-center justify-center bg-[var(--bg)] border border-[var(--border-color)] rounded-full shadow-lg"
          title="Export"
        >
          <Download size={20} />
        </Button>
        <Button
          variant="ghost"
          onClick={handlePin}
          className="w-12 h-12 items-center justify-center bg-[var(--bg)] border border-[var(--border-color)] rounded-full shadow-lg"
          title={currentNote?.pinned ? 'Unpin' : 'Pin'}
        >
          <Pin size={20} className={currentNote?.pinned ? 'fill-current' : ''} />
        </Button>
        <Button
          variant="danger"
          onClick={handleDelete}
          className="w-12 h-12 items-center justify-center bg-[var(--bg)] border border-[var(--border-color)] rounded-full shadow-lg"
          title="Delete"
        >
          <Trash size={20} />
        </Button>
      </div>

      {/* Main command button */}
      <Button
        variant="ghost"
        onClick={handleMainButtonClick}
        className="lg:hidden md:visible w-12 h-12 items-center justify-center bg-[var(--bg)] border border-[var(--border-color)] rounded-full shadow-lg"
        aria-label="Open command palette"
      >
        <CommandIcon size={28} />
      </Button>
    </div>
  );
}
