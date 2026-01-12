import type { ReactNode } from 'react';
import { useAppStore } from '../store/appStore';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { setCommandPaletteOpen } = useAppStore();

  return (
      <main className="p-4 min-h-screen flex flex-row justify-center">
        {children}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="lg:hidden md:visible fixed bottom-4 right-4 w-12 h-12 transition-colors items-center justify-center text-xl font-semibold z-50"
          aria-label="Open command palette"
        >
          ⌘
        </button>
      </main>
  );
}
