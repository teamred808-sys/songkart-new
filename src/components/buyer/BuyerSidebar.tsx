import { useState } from 'react';
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
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
  ScrollText,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCartCount } from '@/hooks/useCartCount';
import { toast } from 'sonner';
import songkartLogo from '@/assets/songkart-logo.png';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  const [isBecomingSellerOpen, setIsBecomingSellerOpen] = useState(false);
  const [isBecomingSellerLoading, setIsBecomingSellerLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isSeller, signOut, becomeSeller } = useAuth();
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

  const handleBecomeSeller = async () => {
    setIsBecomingSellerLoading(true);
    const { error } = await becomeSeller();
    setIsBecomingSellerLoading(false);
    setIsBecomingSellerOpen(false);

    if (error) {
      toast.error('Failed to become a seller', {
        description: error.message || 'Please try again later.',
      });
    } else {
      toast.success('Welcome to the Seller community!', {
        description: 'You can now upload and sell your songs.',
      });
      navigate('/seller');
    }
  };

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
          <Link to="/" className={cn("flex items-center gap-2", collapsed && "justify-center w-full")}>
            <img src={songkartLogo} alt="SongKart" className="h-8 w-8" />
            {!collapsed && (
              <span className="font-display tracking-tight text-foreground">
                <span className="font-extrabold">SONG</span>
                <span className="font-normal">KART</span>
              </span>
            )}
          </Link>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="ml-auto h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="absolute right-1 top-4 h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
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
          {/* Switch to Seller Mode (for users who already have seller role) */}
          {isSeller ? (
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
          ) : (
            /* Become a Seller (for buyers who don't have seller role yet) */
            <AlertDialog open={isBecomingSellerOpen} onOpenChange={setIsBecomingSellerOpen}>
              <AlertDialogTrigger asChild>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                        size="icon"
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Become a Seller</TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    className="w-full justify-start gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Become a Seller</span>
                  </Button>
                )}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Become a Seller
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>Start selling your songs on SongKart! As a seller, you can:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Upload and sell your original songs</li>
                      <li>Set your own prices for different license types</li>
                      <li>Earn money from every sale</li>
                      <li>Track your earnings and analytics</li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-2">
                      You'll keep your buyer account and can still purchase songs from other sellers.
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isBecomingSellerLoading}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBecomeSeller}
                    disabled={isBecomingSellerLoading}
                    className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                  >
                    {isBecomingSellerLoading ? 'Setting up...' : 'Yes, Make Me a Seller'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
