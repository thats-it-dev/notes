import { useEffect, useRef, useState } from 'react';
import { useAppStore } from './store/appStore';
import { getMostRecentNote, createNote } from './lib/noteOperations';
import { welcomeBlocks } from './lib/welcomeContent';
import { NoteEditor } from './components/NoteEditor';
import { SettingsPanel } from './components/SettingsPanel';
import { CommandPalette } from './components/CommandPalette';
import { Layout } from './components/Layout';
import { useSync } from './sync';
import { authVerifyMagicLink } from './sync/api';
import '@thatsit/ui/index.css';

function App() {
  const { currentNoteId, setCurrentNote } = useAppStore();
  const { enable } = useSync();
  const initRef = useRef(false);
  const [magicLinkStatus, setMagicLinkStatus] = useState<'idle' | 'verifying' | 'success' | 'error' | 'pending'>('idle');
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null);

  // Auto-detect system theme preference
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Handle magic link token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      setMagicLinkStatus('verifying');
      const syncUrl = localStorage.getItem('syncUrl') || 'https://sync.thatsit.app';

      authVerifyMagicLink(syncUrl, token)
        .then((data) => {
          enable(syncUrl, data.access_token, data.refresh_token);
          setMagicLinkStatus('success');
          // Clear the token from URL
          window.history.replaceState({}, '', window.location.pathname);
          // Auto-hide success message after 3 seconds
          setTimeout(() => setMagicLinkStatus('idle'), 3000);
        })
        .catch((err) => {
          if (err.message === 'pending_approval') {
            setMagicLinkStatus('pending');
          } else {
            setMagicLinkStatus('error');
            setMagicLinkError(err.message);
          }
          // Clear the token from URL
          window.history.replaceState({}, '', window.location.pathname);
        });
    }
  }, [enable]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    async function initializeApp() {
      const recentNote = await getMostRecentNote();

      if (recentNote) {
        setCurrentNote(recentNote.id);
      } else {
        // Create welcome note with fixed ID (won't duplicate across devices)
        const welcomeNote = await createNote(welcomeBlocks, { isWelcomeNote: true });
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
      {/* Magic link status toast */}
      {magicLinkStatus === 'verifying' && (
        <div className="fixed bottom-4 right-4 bg-neutral-800 text-white px-4 py-2 rounded-lg shadow-lg">
          Signing in...
        </div>
      )}
      {magicLinkStatus === 'success' && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Signed in successfully!
        </div>
      )}
      {magicLinkStatus === 'error' && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg">
          {magicLinkError || 'Sign in failed'}
          <button
            className="ml-2 underline"
            onClick={() => setMagicLinkStatus('idle')}
          >
            Dismiss
          </button>
        </div>
      )}
      {magicLinkStatus === 'pending' && (
        <div className="fixed bottom-4 right-4 bg-amber-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Account created! Awaiting admin approval.
          <button
            className="ml-2 underline"
            onClick={() => setMagicLinkStatus('idle')}
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}

export default App;
