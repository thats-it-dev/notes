import type { ReactNode } from 'react';
import { useAppStore } from '../store/appStore';
import { Cloud, CloudOff, Loader2, AlertCircle } from 'lucide-react';
import { useSync } from '../sync';
import { CommandButton } from './CommandButton';

interface LayoutProps {
  children: ReactNode;
}

function SyncIndicator() {
  const { status, isEnabled, syncNow } = useSync();
  const { setSettingsPanelOpen } = useAppStore();

  if (!isEnabled) return null;

  const handleClick = () => {
    if (status === 'error') {
      setSettingsPanelOpen(true);
    } else {
      syncNow().catch(console.error);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="fixed top-4 right-4 p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] hover:bg-[var(--bg-muted)] transition-colors z-50"
      title={
        status === 'syncing' ? 'Syncing...' :
        status === 'idle' ? 'Synced - Click to sync now' :
        status === 'offline' ? 'Offline' :
        'Sync error - Click to view settings'
      }
    >
      {status === 'syncing' && <Loader2 size={16} className="animate-spin text-[var(--text-muted)]" />}
      {status === 'idle' && <Cloud size={16} className="text-[var(--text-muted)]" />}
      {status === 'offline' && <CloudOff size={16} className="text-[var(--text-muted)]" />}
      {status === 'error' && <AlertCircle size={16} className="text-[var(--accent)]" />}
    </button>
  );
}

export function Layout({ children }: LayoutProps) {
  return (
    <main className="p-4 min-h-screen flex flex-row justify-center">
      {children}
      <SyncIndicator />
      <CommandButton />
    </main>
  );
}
