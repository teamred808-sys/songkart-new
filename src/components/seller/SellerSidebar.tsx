import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  Home,
  ArrowLeftRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Navigation sections for better organization
const navSections = [
  {
    title: 'Content',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/seller' },
      { icon: Music, label: 'My Songs', path: '/seller/songs' },
      { icon: Upload, label: 'Upload Song', path: '/seller/songs/upload', accent: true },
    ],
  },
  {
    title: 'Business',
    items: [
      { icon: ShoppingCart, label: 'Sales & Orders', path: '/seller/sales' },
      { icon: Wallet, label: 'Wallet', path: '/seller/wallet' },
      { icon: BarChart3, label: 'Analytics', path: '/seller/analytics' },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: Settings, label: 'Settings', path: '/seller/settings' },
    ],
  },
];

export function SellerSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <TooltipProvider delayDuration={0}>
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
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent ml-auto"
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
                      end={item.path === '/seller'}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                        "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        isActive(item.path) && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90",
                        item.accent && !isActive(item.path) && "text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10",
                        collapsed && "justify-center px-2"
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span className="font-medium">{item.label}</span>}
                    </NavLink>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.path}>
                        <TooltipTrigger asChild>{NavItem}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    );
                  }
                  return NavItem;
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-sidebar-border space-y-1">
          {/* Switch to Buyer Mode */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/buyer')}
                  className="w-full text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <ArrowLeftRight className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Switch to Buyer</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              onClick={() => navigate('/buyer')}
              className="w-full justify-start gap-3 px-3 py-2.5 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <ArrowLeftRight className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">Switch to Buyer</span>
            </Button>
          )}

          {/* Visit Homepage */}
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
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 group border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50"
            >
              <Home className="h-5 w-5 flex-shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300" />
              <span className="font-medium">Visit Homepage</span>
            </NavLink>
          )}
          
          {/* User Info */}
          {!collapsed && profile && (
            <div className="px-3 py-2 rounded-lg bg-sidebar-accent/50">
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={profile.avatar_url || ''} />
                  <AvatarFallback className="text-xs">
                    {profile.full_name?.charAt(0) || profile.email?.charAt(0) || 'S'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {profile.full_name || profile.email}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Sign Out */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={signOut}
                  className="w-full text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign Out</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              onClick={signOut}
              className="w-full justify-start gap-3 px-3 py-2.5 text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium">Sign Out</span>
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
