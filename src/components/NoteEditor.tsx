import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { updateNoteContent } from '../lib/noteOperations';
import type { Note } from '../lib/types';
import { useRef, useCallback, useEffect } from 'react';
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

  // Don't render editor until note is loaded
  if (!note) {
    return <div>Loading note...</div>;
  }

  return <NoteEditorContent note={note} />;
}

function NoteEditorContent({ note }: { note: Note }) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isUpdatingRef = useRef(false);

  const editor = useCreateBlockNote({
    schema,
    initialContent: note.content && note.content.length > 0
      ? note.content
      : undefined, // Let BlockNote create default content
  });

  const debouncedUpdate = useCallback((blocks: Block[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    isUpdatingRef.current = true;
    timeoutRef.current = setTimeout(() => {
      updateNoteContent(note.id, blocks);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    }, 300);
  }, [note.id]);

  // Sync editor with database changes (e.g., from task panel toggles)
  useEffect(() => {
    if (isUpdatingRef.current) return; // Skip if update came from this editor
    if (note.content && note.content.length > 0) {
      editor.replaceBlocks(editor.document, note.content);
    }
  }, [note.content, editor]);

  return (
    <BlockNoteView
      className="w-full md:w-1/2 bn-editor"
      editor={editor}
      onChange={() => {
        const blocks = editor.document;
        debouncedUpdate(blocks);
      }}
    />
  );
}
