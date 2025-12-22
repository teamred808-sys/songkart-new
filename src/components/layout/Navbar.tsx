import { Link, useNavigate } from 'react-router-dom';
import { Search, Menu, X, User, LogOut, LayoutDashboard, Shield } from 'lucide-react';
import songkartLogo from '@/assets/songkart-logo.png';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useCartCount } from '@/hooks/useCartCount';
import { MiniCartDropdown } from '@/components/cart/MiniCartDropdown';
import { cn } from '@/lib/utils';

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile, role, isAdmin, signOut } = useAuth();
  const { data: cartCount = 0 } = useCartCount();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (role === 'admin') return '/admin';
    if (role === 'seller') return '/seller';
    return '/buyer';
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img src={songkartLogo} alt="SongKart" className="h-12 w-12 object-contain" />
            <span className="font-display text-xl font-bold gradient-text">
              SongKart
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link 
              to="/browse" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Browse
            </Link>
            <Link 
              to="/browse?type=lyrics" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Lyrics
            </Link>
            <Link 
              to="/browse?type=audio" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Audio
            </Link>
            <Link 
              to="/sellers" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Sellers
            </Link>
          </div>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/browse">
                <Search className="h-5 w-5" />
              </Link>
            </Button>

            {user && <MiniCartDropdown />}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border-2 border-primary/50">
                      <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {profile?.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{profile?.full_name || 'User'}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full w-fit capitalize">
                        {role}
                      </span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer text-destructive">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to={getDashboardLink()} className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button className="btn-glow bg-gradient-to-r from-primary to-accent hover:opacity-90" asChild>
                  <Link to="/auth?tab=signup">Get Started</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            'md:hidden overflow-hidden transition-all duration-300',
            isMobileMenuOpen ? 'max-h-96 pb-4' : 'max-h-0'
          )}
        >
          <div className="flex flex-col gap-2 pt-4">
            <Link 
              to="/browse" 
              className="px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Browse
            </Link>
            <Link 
              to="/browse?type=lyrics" 
              className="px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Lyrics
            </Link>
            <Link 
              to="/browse?type=audio" 
              className="px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Audio
            </Link>
            <Link 
              to="/sellers" 
              className="px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Sellers
            </Link>

            <div className="border-t border-border my-2" />

            {user ? (
              <>
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    className="px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Admin Panel
                  </Link>
                )}
                <Link 
                  to={getDashboardLink()} 
                  className="px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/buyer/cart" 
                  className="px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex items-center justify-between"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>Cart</span>
                  {cartCount > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {cartCount > 99 ? '99+' : cartCount}
                    </Badge>
                  )}
                </Link>
                <button 
                  onClick={() => {
                    handleSignOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-4 py-2 text-left text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/auth" 
                  className="px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link 
                  to="/auth?tab=signup" 
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-center font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
