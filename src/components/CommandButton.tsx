import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { CommandIcon, Download, Pin, Trash, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@thatsit/ui';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { blocksToMarkdown } from '../lib/blockNoteConverters';
import { deleteNote, createNote } from '../lib/noteOperations';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';

export function CommandButton() {
  const { setCommandPaletteOpen, currentNoteId, setCurrentNote } = useAppStore();
  const [showActions, setShowActions] = useState(false);
  const keyboardHeight = useKeyboardHeight();

  const currentNote = useLiveQuery(
    () => currentNoteId ? db.notes.get(currentNoteId) : undefined,
    [currentNoteId]
  );

  const handleMainButtonClick = () => {
    if (showActions) {
      // If actions are showing, second tap opens command palette
      setCommandPaletteOpen(true);
      setShowActions(false);
    } else {
      // First tap shows quick actions
      setShowActions(true);
    }
  };

  const handleCollapse = () => {
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

  const handleNewNote = async () => {
    const newNote = await createNote();
    setCurrentNote(newNote.id);
    setShowActions(false);
  };

  // Calculate position with safe areas
  const bottomOffset = keyboardHeight > 0
    ? `calc(${keyboardHeight}px + 1rem)`
    : 'calc(var(--safe-area-inset-bottom, 0px) + 1rem)';
  const rightOffset = 'calc(var(--safe-area-inset-right, 0px) + 1rem)';

  return (
    <div
      className="fixed z-50 transition-[bottom] duration-200"
      style={{ bottom: bottomOffset, right: rightOffset }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={`flex flex-col items-center rounded-xl overflow-hidden transition-shadow duration-200 ${
          showActions ? 'shadow-xl' : ''
        }`}
        style={{ backgroundColor: 'var(--bg)' }}
      >
        {/* Quick action buttons */}
        <div
          className={`grid transition-[grid-template-rows] duration-200 ${
            showActions ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden flex flex-col">
            {/* Collapse button at top */}
            <Button
              variant="ghost"
              onClick={handleCollapse}
              className="w-12 h-12 items-center justify-center"
              title="Collapse"
            >
              <ChevronDown size={20} />
            </Button>
            <Button
              variant="ghost"
              onClick={handleExport}
              className="w-12 h-12 items-center justify-center"
              title="Export"
            >
              <Download size={20} />
            </Button>
            <Button
              variant="ghost"
              onClick={handlePin}
              className="w-12 h-12 items-center justify-center"
              title={currentNote?.pinned ? 'Unpin' : 'Pin'}
            >
              <Pin size={20} className={currentNote?.pinned ? 'fill-current' : ''} />
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              className="w-12 h-12 items-center justify-center"
              title="Delete"
            >
              <Trash size={20} />
            </Button>
            <Button
              variant="ghost"
              onClick={handleNewNote}
              className="w-12 h-12 items-center justify-center"
              title="New note"
            >
              <Plus size={20} />
            </Button>
          </div>
        </div>

        {/* Main command button */}
        <Button
          variant="ghost"
          onClick={handleMainButtonClick}
          className="lg:hidden md:visible w-12 h-12 items-center justify-center"
          aria-label="Open command palette"
        >
          <CommandIcon size={28} />
        </Button>
      </div>
    </div>
  );
}
