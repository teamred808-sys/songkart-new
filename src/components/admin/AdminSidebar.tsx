import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Music, 
  Users, 
  CreditCard, 
  Wallet, 
  AlertTriangle,
  BarChart3,
  Star,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  Package,
  FileText,
  ClipboardList,
  Home,
  Bug,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/admin' },
  { icon: FileText, label: 'Content', path: '/admin/content' },
  { icon: Music, label: 'Song Moderation', path: '/admin/songs' },
  { icon: Users, label: 'User Management', path: '/admin/users' },
  { icon: Package, label: 'Orders', path: '/admin/orders' },
  { icon: CreditCard, label: 'Transactions', path: '/admin/transactions' },
  { icon: Wallet, label: 'Withdrawals', path: '/admin/withdrawals' },
  { icon: AlertTriangle, label: 'Disputes', path: '/admin/disputes' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  { icon: Star, label: 'Featured Content', path: '/admin/featured' },
  { icon: Settings, label: 'Platform Settings', path: '/admin/settings' },
  { icon: ClipboardList, label: 'Activity Logs', path: '/admin/logs' },
  { icon: Bug, label: 'Bug Reports', path: '/admin/bugs' },
  { icon: Activity, label: 'Monitoring', path: '/admin/monitoring' },
];

export function AdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <aside 
      className={cn(
        "sticky top-0 h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-destructive" />
            <span className="font-bold text-lg">Admin Panel</span>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/admin' && location.pathname.startsWith(item.path));
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive 
                      ? "bg-destructive/10 text-destructive font-medium" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                    isCollapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "w-full justify-start gap-2 border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 group",
            isCollapsed && "justify-center px-0"
          )}
          onClick={() => navigate('/')}
        >
          <Home className="h-4 w-4 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300" />
          {!isCollapsed && <span className="font-medium">Visit Homepage</span>}
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10",
            isCollapsed && "justify-center px-0"
          )}
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Sign Out</span>}
        </Button>

        {!isCollapsed && profile && (
          <div className="flex items-center gap-3 pt-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile.avatar_url || ''} />
              <AvatarFallback className="bg-destructive/10 text-destructive">
                {profile.full_name?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile.full_name || 'Admin'}</p>
              <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
