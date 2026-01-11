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
    <div style={{ maxWidth: '800px', height: '100vh', margin: '0 auto' }}>
      <BlocksManager
        content={note.content}
        onChange={handleChange}
      />
      {note.tags.length > 0 && (
        <div style={{ marginTop: '1rem', color: '#666' }}>
          {note.tags.map(tag => (
            <span
              key={tag}
              style={{
                display: 'inline-block',
                padding: '0.25rem 0.5rem',
                margin: '0 0.25rem',
                background: '#e0e0e0',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
