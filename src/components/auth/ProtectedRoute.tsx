import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

type AppRole = 'admin' | 'seller' | 'buyer';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: AppRole;
  allowedRoles?: AppRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  role,
  allowedRoles,
  redirectTo = '/auth' 
}: ProtectedRouteProps) {
  const { user, roles, isLoading } = useAuth();

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

  // Check for multiple allowed roles - user must have at least one matching role
  if (allowedRoles && allowedRoles.length > 0) {
    const hasMatchingRole = roles.some(r => allowedRoles.includes(r));
    if (!hasMatchingRole) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  }

  // Check for single role - user must have this role in their roles array
  if (role && !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
