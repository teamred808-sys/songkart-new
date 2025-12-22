import { Outlet } from 'react-router-dom';
import { SellerSidebar } from './SellerSidebar';

export function SellerLayout() {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <SellerSidebar />
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
