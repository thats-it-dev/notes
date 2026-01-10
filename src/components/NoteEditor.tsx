import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { updateNoteContent } from '../lib/noteOperations';
import { useState, useEffect } from 'react';

interface NoteEditorProps {
  noteId: string;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const note = useLiveQuery(() => db.notes.get(noteId), [noteId]);
  const [content, setContent] = useState('');
  const [saveTimeout, setSaveTimeout] = useState<number | null>(null);

  useEffect(() => {
    if (note) {
      setContent(note.content);
    }
  }, [note]);

  const handleChange = (newContent: string) => {
    setContent(newContent);

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
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2>{note.title}</h2>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        style={{
          width: '100%',
          minHeight: '400px',
          padding: '1rem',
          fontSize: '1rem',
          fontFamily: 'monospace',
          border: '1px solid #ddd',
          borderRadius: '4px',
        }}
      />
      {note.tags.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <strong>Tags:</strong> {note.tags.map(tag => `#${tag}`).join(', ')}
        </div>
      )}
    </div>
  );
}
