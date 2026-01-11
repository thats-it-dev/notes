import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { updateNoteContent } from '../lib/noteOperations';
import { useRef, useCallback } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import './NoteEditor.css'; // Custom BlockNote styles
import type { Block } from '@blocknote/core';
import { schema } from '../lib/blockNoteSchema';

interface NoteEditorProps {
  noteId: string;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const note = useLiveQuery(() => db.notes.get(noteId), [noteId]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const editor = useCreateBlockNote({
    schema,
    initialContent: note?.content && note.content.length > 0
      ? note.content
      : undefined, // Let BlockNote create default content
  });

  const debouncedUpdate = useCallback((blocks: Block[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      updateNoteContent(noteId, blocks);
    }, 300);
  }, [noteId]);

  // Don't render editor until note is loaded
  if (!note) {
    return <div>Loading note...</div>;
  }

  return (
    <BlockNoteView
      className="min-w-[600px] w-1/2 bn-editor"
      editor={editor}
      onChange={() => {
        const blocks = editor.document;
        debouncedUpdate(blocks);
      }}
    />
  );
}
