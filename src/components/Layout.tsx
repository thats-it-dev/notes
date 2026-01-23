import type { ReactNode } from 'react';
import { CommandButton } from './CommandButton';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <main
      className="min-h-screen flex flex-row justify-center"
      style={{
        paddingTop: 'var(--safe-area-inset-top, 0px)',
        paddingBottom: 'var(--safe-area-inset-bottom, 0px)',
        paddingLeft: 'var(--safe-area-inset-left, 0px)',
        paddingRight: 'var(--safe-area-inset-right, 0px)',
      }}
    >
      {children}
      <CommandButton />
    </main>
  );
}
