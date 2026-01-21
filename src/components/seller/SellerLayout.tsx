import { Outlet, useLocation } from 'react-router-dom';
import { SellerSidebar } from './SellerSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileDashboardHeader } from '@/components/mobile/MobileDashboardHeader';
import { MobileBottomNav, MobileNavItem } from '@/components/mobile/MobileBottomNav';
import { MobileSidebarContent, SidebarNavSection } from '@/components/mobile/MobileSidebarContent';
import { 
  LayoutDashboard, 
  Music, 
  ShoppingBag, 
  Wallet, 
  BarChart3, 
  CreditCard, 
  Settings,
  Upload
} from 'lucide-react';

const mobileNavItems: MobileNavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/seller' },
  { icon: Music, label: 'My Songs', path: '/seller/songs' },
  { icon: Upload, label: 'Upload', path: '/seller/upload' },
  { icon: Wallet, label: 'Wallet', path: '/seller/wallet' },
  { icon: Settings, label: 'More', path: '/seller/settings' },
];

const sidebarSections: SidebarNavSection[] = [
  {
    title: 'Content',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/seller' },
      { icon: Music, label: 'My Songs', path: '/seller/songs' },
      { icon: Upload, label: 'Upload Song', path: '/seller/upload' },
    ],
  },
  {
    title: 'Business',
    items: [
      { icon: ShoppingBag, label: 'Sales & Orders', path: '/seller/sales' },
      { icon: Wallet, label: 'Wallet', path: '/seller/wallet' },
      { icon: BarChart3, label: 'Analytics', path: '/seller/analytics' },
      { icon: CreditCard, label: 'Payout Settings', path: '/seller/payout' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: Settings, label: 'Settings', path: '/seller/settings' },
    ],
  },
];

const pageTitle: Record<string, string> = {
  '/seller': 'Seller Dashboard',
  '/seller/songs': 'My Songs',
  '/seller/upload': 'Upload Song',
  '/seller/sales': 'Sales & Orders',
  '/seller/wallet': 'Wallet',
  '/seller/analytics': 'Analytics',
  '/seller/payout': 'Payout Settings',
  '/seller/settings': 'Settings',
};

export function SellerLayout() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const title = pageTitle[location.pathname] || 'Seller Portal';

  return (
    <div className="min-h-screen flex flex-col md:flex-row w-full bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && <SellerSidebar />}
      
      {/* Mobile Header */}
      {isMobile && (
        <MobileDashboardHeader 
          title={title}
          sidebarContent={<MobileSidebarContent sections={sidebarSections} />}
        />
      )}
      
      <main className="flex-1 overflow-x-hidden pb-20 md:pb-0">
        <div className="container py-4 md:py-6 px-4 md:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileBottomNav items={mobileNavItems} />}
    </div>
  );
}
