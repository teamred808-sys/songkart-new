import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Download, 
  ShoppingCart, 
  Heart, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Store,
  ArrowLeftRight,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ShoppingBag, label: 'My Purchases', path: '/dashboard/purchases' },
  { icon: Download, label: 'My Downloads', path: '/dashboard/downloads' },
  { icon: ShoppingCart, label: 'Cart', path: '/dashboard/cart' },
  { icon: Heart, label: 'Favorites', path: '/dashboard/favorites' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
];

export function BuyerSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const canSwitchToSeller = role === 'seller';

  return (
    <aside
      className={cn(
        'sticky top-0 h-screen bg-card border-r border-border flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <h2 className="font-semibold text-foreground">Buyer Dashboard</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto"
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
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              isActive(item.path)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}

        {/* Browse Store Link */}
        <NavLink
          to="/browse"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Store className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Browse Store</span>}
        </NavLink>
      </nav>

      {/* Role Switcher & User Section */}
      <div className="p-2 border-t border-border space-y-2">
        {/* Switch to Seller Mode */}
        {canSwitchToSeller && (
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start gap-2',
              collapsed && 'justify-center px-2'
            )}
            onClick={() => navigate('/seller')}
          >
            <ArrowLeftRight className="h-4 w-4" />
            {!collapsed && <span>Switch to Seller</span>}
          </Button>
        )}

        {/* User Info */}
        <div className={cn(
          'flex items-center gap-3 p-2 rounded-lg bg-muted/50',
          collapsed && 'justify-center'
        )}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback>
              {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.full_name || 'Buyer'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.email}
              </p>
            </div>
          )}
        </div>

        {/* Sign Out */}
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-2 text-muted-foreground hover:text-foreground',
            collapsed && 'justify-center px-2'
          )}
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
}
