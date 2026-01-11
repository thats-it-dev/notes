import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { getMostRecentNote, createNote } from './lib/noteOperations';
import { NoteEditor } from './components/NoteEditor';
import { TaskPanel } from './components/TaskPanel';
import { CommandPalette } from './components/CommandPalette';
import { Layout } from './components/Layout';
import '@thatsit/ui/index.css';

function App() {
  const { currentNoteId, setCurrentNote } = useAppStore();

  useEffect(() => {
    async function initializeApp() {
      const recentNote = await getMostRecentNote();

      if (recentNote) {
        setCurrentNote(recentNote.id);
      } else {
        // Create welcome note with undefined to let BlockNote create default content
        const welcomeNote = await createNote(undefined);
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
        <NoteEditor key={currentNoteId} noteId={currentNoteId} />
      </Layout>
      <TaskPanel />
      <CommandPalette />
    </>
  );
}

export default App;
