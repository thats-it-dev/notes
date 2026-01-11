import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { getMostRecentNote, createNote } from './lib/noteOperations';
import { NoteEditor } from './components/NoteEditor';
import { TaskPanel } from './components/TaskPanel';
import { CommandPalette } from './components/CommandPalette';
import { Layout } from './components/Layout';
import type { Block } from '@blocknote/core';
import '@thatsit/ui/index.css';

function App() {
  const { currentNoteId, setCurrentNote } = useAppStore();

  useEffect(() => {
    async function initializeApp() {
      const recentNote = await getMostRecentNote();

      if (recentNote) {
        setCurrentNote(recentNote.id);
      } else {
        const welcomeBlocks = [
          {
            id: '1',
            type: 'heading',
            props: { level: 1 },
            content: [{ type: 'text', text: 'Welcome to Notes', styles: {} }],
            children: [],
          },
          {
            id: '2',
            type: 'paragraph',
            props: {},
            content: [{ type: 'text', text: 'Start typing to create your first note.', styles: {} }],
            children: [],
          },
          {
            id: '3',
            type: 'heading',
            props: { level: 2 },
            content: [{ type: 'text', text: 'Features', styles: {} }],
            children: [],
          },
          {
            id: '4',
            type: 'bulletListItem',
            props: {},
            content: [{ type: 'text', text: 'Block-based editing', styles: {} }],
            children: [],
          },
          {
            id: '5',
            type: 'checkListItem',
            props: { checked: false },
            content: [{ type: 'text', text: 'Create tasks with checkboxes', styles: {} }],
            children: [],
          },
          {
            id: '6',
            type: 'paragraph',
            props: {},
            content: [{ type: 'text', text: 'Use Cmd+K to search', styles: {} }],
            children: [],
          },
        ] as any as Block[];

        const welcomeNote = await createNote(welcomeBlocks);
        setCurrentNote(welcomeNote.id);
      }
    }

    initializeApp();
  }, [setCurrentNote]);

  if (!currentNoteId) {
    return (
      <Layout>
        <div>Loading...</div>
      </Layout>
    );
  }

  return (
    <>
      <Layout>
        <NoteEditor noteId={currentNoteId} />
      </Layout>
      <TaskPanel />
      <CommandPalette />
    </>
  );
}

export default App;
