import { Menu, Home, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ReactNode, useState } from 'react';
import songkartLogo from '@/assets/songkart-logo.png';

interface MobileDashboardHeaderProps {
  title: string;
  sidebarContent: ReactNode;
}

export function MobileDashboardHeader({ title, sidebarContent }: MobileDashboardHeaderProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border md:hidden">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
              <SheetHeader className="p-4 border-b border-border">
                <SheetTitle className="flex items-center gap-2">
                  <img src={songkartLogo} alt="SongKart" className="h-8 w-8" />
                  <span className="font-display">
                    <span className="font-extrabold">SONG</span>
                    <span className="font-normal">KART</span>
                  </span>
                </SheetTitle>
              </SheetHeader>
              
              <div className="flex-1 overflow-y-auto" onClick={() => setOpen(false)}>
                {sidebarContent}
              </div>

              <div className="p-4 border-t border-border space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    navigate('/');
                    setOpen(false);
                  }}
                >
                  <Home className="h-4 w-4" />
                  Visit Homepage
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>

                {profile && (
                  <div className="flex items-center gap-3 pt-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url || ''} />
                      <AvatarFallback>
                        {profile.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{profile.full_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
          
          <Link to="/" className="flex items-center gap-2">
            <img src={songkartLogo} alt="SongKart" className="h-7 w-7" />
          </Link>
        </div>

        <h1 className="text-sm font-semibold truncate max-w-[150px]">{title}</h1>

        <Avatar className="h-8 w-8">
          <AvatarImage src={profile?.avatar_url || ''} />
          <AvatarFallback className="text-xs">
            {profile?.full_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
