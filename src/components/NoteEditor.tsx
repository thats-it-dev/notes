import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { updateNoteContent } from '../lib/noteOperations';
import { useMemo } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import type { Block } from '@blocknote/core';
import { schema } from '../lib/blockNoteSchema';

interface NoteEditorProps {
  noteId: string;
}

export function NoteEditor({ noteId }: NoteEditorProps) {
  const note = useLiveQuery(() => db.notes.get(noteId), [noteId]);

  const editor = useCreateBlockNote({
    schema,
    initialContent: note?.content && note.content.length > 0
      ? note.content
      : undefined, // Let BlockNote create default content
  });

  const debouncedUpdate = useMemo(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (blocks: Block[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        updateNoteContent(noteId, blocks);
      }, 300);
    };
  }, [noteId]);

  // Don't render editor until note is loaded
  if (!note) {
    return <div>Loading note...</div>;
  }

  return (
    <BlockNoteView
      editor={editor}
      onChange={() => {
        const blocks = editor.document;
        debouncedUpdate(blocks);
      }}
    />
  );
}
