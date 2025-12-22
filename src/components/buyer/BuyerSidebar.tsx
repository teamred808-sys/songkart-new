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
  LogOut,
  Home,
  ScrollText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCartCount } from '@/hooks/useCartCount';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Navigation sections for better organization
const navSections = [
  {
    title: 'My Content',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/buyer' },
      { icon: ScrollText, label: 'License Vault', path: '/buyer/downloads', accent: true },
      { icon: ShoppingBag, label: 'My Purchases', path: '/buyer/purchases' },
    ],
  },
  {
    title: 'Explore',
    items: [
      { icon: ShoppingCart, label: 'Cart', path: '/buyer/cart', showBadge: true },
      { icon: Heart, label: 'Favorites', path: '/buyer/favorites' },
      { icon: Store, label: 'Browse Store', path: '/browse' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: Settings, label: 'Settings', path: '/buyer/settings' },
    ],
  },
];

export function BuyerSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  const { data: cartCount } = useCartCount();

  const isActive = (path: string) => {
    if (path === '/buyer') {
      return location.pathname === '/buyer';
    }
    return location.pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const canSwitchToSeller = role === 'seller';

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'sticky top-0 h-screen bg-card border-r border-border flex flex-col transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-semibold text-foreground">Buyer Hub</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto h-8 w-8"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto">
          {navSections.map((section, sectionIndex) => (
            <div key={section.title} className={cn(sectionIndex > 0 && 'mt-4')}>
              {!collapsed && (
                <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </p>
              )}
              {collapsed && sectionIndex > 0 && (
                <Separator className="my-2 mx-2" />
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const NavItem = (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                        isActive(item.path)
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        item.accent && !isActive(item.path) && 'text-emerald-500 hover:text-emerald-600',
                        collapsed && 'justify-center px-2'
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {item.showBadge && cartCount && cartCount > 0 && (
                            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                              {cartCount}
                            </Badge>
                          )}
                        </>
                      )}
                    </NavLink>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.path}>
                        <TooltipTrigger asChild>{NavItem}</TooltipTrigger>
                        <TooltipContent side="right" className="flex items-center gap-2">
                          {item.label}
                          {item.showBadge && cartCount && cartCount > 0 && (
                            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
                              {cartCount}
                            </Badge>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }
                  return NavItem;
                })}
              </div>
            </div>
          ))}

          {/* Visit Homepage */}
          <div className="mt-4 pt-4 border-t border-border/50">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <NavLink
                    to="/"
                    className="flex items-center justify-center px-2 py-2.5 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 group"
                  >
                    <Home className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right">Visit Homepage</TooltipContent>
              </Tooltip>
            ) : (
              <NavLink
                to="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 group"
              >
                <Home className="h-5 w-5 flex-shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300" />
                <span className="font-medium">Visit Homepage</span>
              </NavLink>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-border space-y-2">
          {/* Switch to Seller Mode */}
          {canSwitchToSeller && (
            collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-full"
                    onClick={() => navigate('/seller')}
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Switch to Seller</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => navigate('/seller')}
              >
                <ArrowLeftRight className="h-4 w-4" />
                <span>Switch to Seller</span>
              </Button>
            )
          )}

          {/* User Info */}
          <div className={cn(
            'flex items-center gap-3 p-2 rounded-lg bg-muted/50',
            collapsed && 'justify-center'
          )}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="text-xs">
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
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign Out</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
