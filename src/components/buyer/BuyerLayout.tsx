import { Outlet, useLocation } from 'react-router-dom';
import { BuyerSidebar } from './BuyerSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileDashboardHeader } from '@/components/mobile/MobileDashboardHeader';
import { MobileBottomNav, MobileNavItem } from '@/components/mobile/MobileBottomNav';
import { MobileSidebarContent, SidebarNavSection } from '@/components/mobile/MobileSidebarContent';
import { useCartCount } from '@/hooks/useCartCount';
import { 
  LayoutDashboard, 
  Download, 
  ShoppingCart, 
  Heart, 
  Settings,
  Search,
  Package
} from 'lucide-react';

export function BuyerLayout() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { data: cartCount } = useCartCount();

  const mobileNavItems: MobileNavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/buyer' },
    { icon: Search, label: 'Browse', path: '/browse' },
    { icon: ShoppingCart, label: 'Cart', path: '/buyer/cart', badge: cartCount || null },
    { icon: Download, label: 'Downloads', path: '/buyer/downloads' },
    { icon: Settings, label: 'More', path: '/buyer/settings' },
  ];

  const sidebarSections: SidebarNavSection[] = [
    {
      title: 'Shop',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/buyer' },
        { icon: Search, label: 'Browse Songs', path: '/browse' },
        { icon: ShoppingCart, label: 'Cart', path: '/buyer/cart', badge: cartCount || null },
      ],
    },
    {
      title: 'Library',
      items: [
        { icon: Download, label: 'My Downloads', path: '/buyer/downloads' },
        { icon: Package, label: 'My Purchases', path: '/buyer/purchases' },
        { icon: Heart, label: 'Favorites', path: '/buyer/favorites' },
      ],
    },
    {
      title: 'Account',
      items: [
        { icon: Settings, label: 'Settings', path: '/buyer/settings' },
      ],
    },
  ];

  const pageTitle: Record<string, string> = {
    '/buyer': 'Buyer Dashboard',
    '/buyer/cart': 'Shopping Cart',
    '/buyer/downloads': 'My Downloads',
    '/buyer/purchases': 'My Purchases',
    '/buyer/favorites': 'Favorites',
    '/buyer/settings': 'Settings',
  };

  const title = pageTitle[location.pathname] || 'Buyer Portal';

  return (
    <div className="min-h-screen flex flex-col md:flex-row w-full bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && <BuyerSidebar />}
      
      {/* Mobile Header */}
      {isMobile && (
        <MobileDashboardHeader 
          title={title}
          sidebarContent={<MobileSidebarContent sections={sidebarSections} />}
        />
      )}
      
      <main className="flex-1 overflow-auto overflow-x-hidden pb-20 md:pb-0 max-w-full">
        <div className="container py-4 md:py-6 px-4 md:px-6 lg:px-8 max-w-full overflow-hidden">
          <Outlet />
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileBottomNav items={mobileNavItems} />}
    </div>
  );
}
