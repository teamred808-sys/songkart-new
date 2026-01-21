import { Outlet, useLocation } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminErrorBoundary } from './AdminErrorBoundary';
import { ReportBugButton } from './ReportBugButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileDashboardHeader } from '@/components/mobile/MobileDashboardHeader';
import { MobileBottomNav, MobileNavItem } from '@/components/mobile/MobileBottomNav';
import { MobileSidebarContent, SidebarNavSection } from '@/components/mobile/MobileSidebarContent';
import { 
  LayoutDashboard, 
  Music, 
  Users, 
  CreditCard, 
  Wallet, 
  AlertTriangle,
  BarChart3,
  Star,
  Sparkles,
  Settings,
  Package,
  FileText,
  ClipboardList,
  Bug,
  Activity,
  MessageSquare,
  ShieldCheck,
  Copyright
} from 'lucide-react';

const mobileNavItems: MobileNavItem[] = [
  { icon: LayoutDashboard, label: 'Overview', path: '/admin' },
  { icon: Music, label: 'Songs', path: '/admin/songs' },
  { icon: Users, label: 'Users', path: '/admin/users' },
  { icon: Package, label: 'Orders', path: '/admin/orders' },
  { icon: Settings, label: 'More', path: '/admin/settings' },
];

const sidebarSections: SidebarNavSection[] = [
  {
    title: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
      { icon: FileText, label: 'Content', path: '/admin/content' },
    ],
  },
  {
    title: 'Moderation',
    items: [
      { icon: Music, label: 'Song Moderation', path: '/admin/songs' },
      { icon: Copyright, label: 'Content Review', path: '/admin/content-review' },
      { icon: MessageSquare, label: 'Ratings', path: '/admin/ratings' },
    ],
  },
  {
    title: 'Management',
    items: [
      { icon: Users, label: 'Users', path: '/admin/users' },
      { icon: Package, label: 'Orders', path: '/admin/orders' },
      { icon: CreditCard, label: 'Transactions', path: '/admin/transactions' },
      { icon: Wallet, label: 'Withdrawals', path: '/admin/withdrawals' },
      { icon: ShieldCheck, label: 'Payout Verification', path: '/admin/payout-verification' },
      { icon: AlertTriangle, label: 'Disputes', path: '/admin/disputes' },
    ],
  },
  {
    title: 'Content',
    items: [
      { icon: Star, label: 'Featured Content', path: '/admin/featured' },
      { icon: Sparkles, label: 'New Uploads', path: '/admin/new-uploads' },
    ],
  },
  {
    title: 'System',
    items: [
      { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
      { icon: Settings, label: 'Platform Settings', path: '/admin/settings' },
      { icon: ClipboardList, label: 'Activity Logs', path: '/admin/logs' },
      { icon: Bug, label: 'Bug Reports', path: '/admin/bugs' },
      { icon: Activity, label: 'Monitoring', path: '/admin/monitoring' },
    ],
  },
];

const pageTitle: Record<string, string> = {
  '/admin': 'Admin Dashboard',
  '/admin/content': 'Content',
  '/admin/songs': 'Song Moderation',
  '/admin/content-review': 'Content Review',
  '/admin/users': 'User Management',
  '/admin/orders': 'Orders',
  '/admin/transactions': 'Transactions',
  '/admin/withdrawals': 'Withdrawals',
  '/admin/payout-verification': 'Payout Verification',
  '/admin/disputes': 'Disputes',
  '/admin/analytics': 'Analytics',
  '/admin/featured': 'Featured Content',
  '/admin/new-uploads': 'New Uploads',
  '/admin/ratings': 'Ratings',
  '/admin/settings': 'Platform Settings',
  '/admin/logs': 'Activity Logs',
  '/admin/bugs': 'Bug Reports',
  '/admin/monitoring': 'Monitoring',
};

export function AdminLayout() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const title = pageTitle[location.pathname] || 'Admin Panel';

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && <AdminSidebar />}
      
      {/* Mobile Header */}
      {isMobile && (
        <MobileDashboardHeader 
          title={title}
          sidebarContent={<MobileSidebarContent sections={sidebarSections} activeColor="text-destructive" />}
        />
      )}
      
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="container py-4 md:py-6 px-4 md:px-8">
          <AdminErrorBoundary module="general">
            <Outlet />
          </AdminErrorBoundary>
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileBottomNav items={mobileNavItems} />}
      
      <ReportBugButton />
    </div>
  );
}
