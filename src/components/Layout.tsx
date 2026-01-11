import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
      <main style={{
        maxWidth: '1200px',
        minHeight: '100vh',
        margin: '0 auto',
        padding: '2rem'
      }}>
        {children}
      </main>
  );
}
