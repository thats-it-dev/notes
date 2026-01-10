import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { getMostRecentNote, createNote } from './lib/noteOperations';
import '@thatsit/ui/index.css';

function App() {
  const { currentNoteId, setCurrentNote } = useAppStore();

  useEffect(() => {
    async function initializeApp() {
      const recentNote = await getMostRecentNote();

      if (recentNote) {
        setCurrentNote(recentNote.id);
      } else {
        // Create welcome note
        const welcomeNote = await createNote(
          '# Welcome to Notes\n\nStart typing to create your first note.\n\n## Features\n\n- Markdown support\n- [ ] Create tasks with checkboxes\n- Add #tags anywhere\n- Use Cmd+K to search'
        );
        setCurrentNote(welcomeNote.id);
      }
    }

    initializeApp();
  }, [setCurrentNote]);

  if (!currentNoteId) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Notes App</h1>
      <p>Current note: {currentNoteId}</p>
    </div>
  );
}

export default App;
