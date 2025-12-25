import { Navigate, useLocation } from 'react-router-dom';
import { useFirstVisit } from '@/hooks/useFirstVisit';

interface HomepageGuardProps {
  children: React.ReactNode;
}

const HomepageGuard = ({ children }: HomepageGuardProps) => {
  const location = useLocation();
  const { hasSeenHomepage } = useFirstVisit();

  // If user hasn't seen homepage yet, redirect them there
  if (!hasSeenHomepage()) {
    // Store intended destination for potential future use
    sessionStorage.setItem('intendedDestination', location.pathname + location.search);
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default HomepageGuard;
