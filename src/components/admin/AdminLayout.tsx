import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminErrorBoundary } from './AdminErrorBoundary';
import { ReportBugButton } from './ReportBugButton';

export function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="container py-6 px-4 md:px-8">
          <AdminErrorBoundary module="general">
            <Outlet />
          </AdminErrorBoundary>
        </div>
      </main>
      <ReportBugButton />
    </div>
  );
}
