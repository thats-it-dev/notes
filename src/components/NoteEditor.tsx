import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { updateNoteContent } from '../lib/noteOperations';
import { useState } from 'react';
import { BlocksManager } from './BlocksManager';

interface NoteEditorProps {
  noteId: string;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const note = useLiveQuery(() => db.notes.get(noteId), [noteId]);
  const [saveTimeout, setSaveTimeout] = useState<number | null>(null);

  const handleChange = (newContent: string) => {
    // Debounced save
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    const timeout = setTimeout(() => {
      updateNoteContent(noteId, newContent);
    }, 300);

    setSaveTimeout(timeout);
  };

  if (!note) {
    return <div>Loading note...</div>;
  }

  return (
      <BlocksManager
        noteId={noteId}
        content={note.content}
        onChange={handleChange}
      />
  );
}
