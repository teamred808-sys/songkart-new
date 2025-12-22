import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

type AppRole = 'admin' | 'seller' | 'buyer';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: AppRole;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  role, 
  redirectTo = '/auth' 
}: ProtectedRouteProps) {
  const { user, role: userRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (role && userRole !== role) {
    // User is logged in but doesn't have the required role
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
