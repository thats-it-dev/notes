import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { updateNoteContent } from '../lib/noteOperations';
import type { Note } from '../lib/types';
import { useRef, useCallback, useEffect } from 'react';
import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems } from '@blocknote/react';
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
  const lastSavedContentRef = useRef<string>(JSON.stringify(note.content));
  const isLocalChangeRef = useRef(false);

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
    isLocalChangeRef.current = true;
    timeoutRef.current = setTimeout(() => {
      const contentJson = JSON.stringify(blocks);
      lastSavedContentRef.current = contentJson;
      updateNoteContent(note.id, blocks);
    }, 300);
  }, [note.id]);

  // Sync editor with database changes (e.g., from task panel toggles)
  // Only sync if this is an external change, not one we triggered ourselves
  useEffect(() => {
    if (isLocalChangeRef.current) {
      isLocalChangeRef.current = false;
      return; // Skip sync for our own changes
    }
    const dbContentJson = JSON.stringify(note.content);
    if (dbContentJson === lastSavedContentRef.current) {
      return; // Content matches what we saved, no need to sync
    }
    if (note.content && note.content.length > 0) {
      lastSavedContentRef.current = dbContentJson;
      editor.replaceBlocks(editor.document, note.content);
    }
  }, [note.content, editor]);

  // Filter slash menu to only show basic text options
  const getSlashMenuItems = useCallback(() => {
    const allowedItems = [
      'Heading 1',
      'Heading 2',
      'Heading 3',
      'Bullet List',
      'Numbered List',
      'Check List',
      'Paragraph',
      'Quote',
      'Code Block',
    ];
    return getDefaultReactSlashMenuItems(editor).filter(item =>
      allowedItems.includes(item.title)
    );
  }, [editor]);

  return (
    <BlockNoteView
      className="w-full md:w-1/2 bn-editor"
      editor={editor}
      onChange={() => {
        const blocks = editor.document;
        debouncedUpdate(blocks);
      }}
      slashMenu={false}
    >
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async () => getSlashMenuItems()}
      />
    </BlockNoteView>
  );
}
