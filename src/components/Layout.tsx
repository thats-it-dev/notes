import type { ReactNode } from 'react';
import { useAppStore } from '../store/appStore';
import {CommandIcon} from 'lucide-react';
import { Button } from '@thatsit/ui';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { setCommandPaletteOpen } = useAppStore();

  return (
      <main className="p-4 min-h-screen flex flex-row justify-center">
        {children}
        <Button
          variant='ghost'
          onClick={() => setCommandPaletteOpen(true)}
          className="lg:hidden md:visible fixed bottom-4 right-4 w-12 h-12 transition-colors items-center justify-center text-xl font-semibold z-50"
          aria-label="Open command palette"
        >
          <CommandIcon size={28} />
        </Button>
      </main>
  );
}
