import { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface MainLayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
}

export function MainLayout({ children, hideFooter = false }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col w-full max-w-full overflow-x-clip">
      <Navbar />
      <main className="flex-1 pt-16 w-full max-w-full overflow-x-clip">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}
