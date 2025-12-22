import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Music, 
  Upload, 
  ShoppingCart, 
  Wallet, 
  BarChart3, 
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/seller' },
  { icon: Music, label: 'My Songs', path: '/seller/songs' },
  { icon: Upload, label: 'Upload Song', path: '/seller/songs/upload' },
  { icon: ShoppingCart, label: 'Sales & Orders', path: '/seller/sales' },
  { icon: Wallet, label: 'Wallet', path: '/seller/wallet' },
  { icon: BarChart3, label: 'Analytics', path: '/seller/analytics' },
  { icon: Settings, label: 'Settings', path: '/seller/settings' },
];

export function SellerSidebar() {
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) => {
    if (path === '/seller') {
      return location.pathname === '/seller';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside 
      className={cn(
        "h-screen sticky top-0 bg-sidebar-background border-r border-sidebar-border flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Music className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-sidebar-foreground">
              Seller Hub
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/seller'}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive(item.path) && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        <NavLink
          to="/"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
            "text-sidebar-foreground hover:bg-sidebar-accent"
          )}
        >
          <Home className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Back to Store</span>}
        </NavLink>
        
        {!collapsed && profile && (
          <div className="px-3 py-2 rounded-lg bg-sidebar-accent/50">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile.full_name || profile.email}
            </p>
            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
          </div>
        )}
        
        <Button
          variant="ghost"
          onClick={signOut}
          className={cn(
            "w-full justify-start gap-3 px-3 py-2.5 text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
}
