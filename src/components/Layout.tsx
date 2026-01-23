import type { ReactNode } from 'react';
import { CommandButton } from './CommandButton';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <main
      className="p-4 min-h-screen flex flex-row justify-center"
      style={{
        paddingTop: 'max(1rem, var(--safe-area-inset-top, 0px))',
        paddingBottom: 'max(1rem, var(--safe-area-inset-bottom, 0px))',
      }}
    >
      {children}
      <CommandButton />
    </main>
  );
}
