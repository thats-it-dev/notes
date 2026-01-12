import { useEffect, useRef } from 'react';
import { useAppStore } from './store/appStore';
import { getMostRecentNote, createNote } from './lib/noteOperations';
import { NoteEditor } from './components/NoteEditor';
import { SettingsPanel } from './components/SettingsPanel';
import { CommandPalette } from './components/CommandPalette';
import { Layout } from './components/Layout';
import '@thatsit/ui/index.css';

function App() {
  const { currentNoteId, setCurrentNote } = useAppStore();
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    async function initializeApp() {
      const recentNote = await getMostRecentNote();

      if (recentNote) {
        setCurrentNote(recentNote.id);
      } else {
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
      <SettingsPanel />
      <CommandPalette />
    </>
  );
}

export default App;
