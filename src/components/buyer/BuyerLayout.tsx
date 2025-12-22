import { Outlet } from 'react-router-dom';
import { BuyerSidebar } from './BuyerSidebar';

export function BuyerLayout() {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <BuyerSidebar />
      <main className="flex-1 overflow-auto">
        <div className="container py-6 px-4 md:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
