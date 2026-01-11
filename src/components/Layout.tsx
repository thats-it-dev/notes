import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
      <main className="p-4 min-h-screen flex flex-row justify-center">
        {children}
      </main>
  );
}
