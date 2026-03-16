import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, apiFetch } from '@/lib/api';

// Re-creating the essential user type that the app expects
export interface User {
  id: string;
  email?: string;
}

export interface Session {
  access_token: string;
  user: User;
}

type AppRole = 'admin' | 'seller' | 'buyer';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  is_verified: boolean;
  dynamic_pricing_enabled: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  roles: AppRole[];
  isLoading: boolean;
  isAdmin: boolean;
  isSeller: boolean;
  signUp: (email: string, password: string, role: AppRole, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  becomeSeller: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile via API
      const userProfile = await api.get<{ id: string; email: string; full_name: string; role: AppRole }>('/users/me');

      if (userProfile) {
        setProfile(userProfile as unknown as Profile); // Mocking rest of profile for now
        setRoles([userProfile.role]);
        setRole(userProfile.role);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Clear local state if fetch fails (e.g., token expired)
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
      setRoles([]);
      localStorage.removeItem('auth_token');
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          if (isMounted) setIsLoading(false);
          return;
        }

        // Ideally you hit /api/auth/session to validate the token
        // For now we map it directly based on the token
        const mockSession = {
          access_token: token,
          user: { id: 'restoring', email: '' } as User
        } as Session;
        
        if (!isMounted) return;

        setSession(mockSession);
        
        await fetchUserData('restoring');
        
        if (isMounted) {
          setUser({ id: 'restoring', email: '' } as User); 
        }

      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeAuth();

    const safetyTimer = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 10000);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  const signUp = async (email: string, password: string, role: AppRole, fullName?: string) => {
    try {
      const response = await apiFetch('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, role, name: fullName })
      });
      
      localStorage.setItem('auth_token', response.token);
      
      const mockSession = {
        access_token: response.token,
        user: { id: response.user.id, email: response.user.email } as User
      } as Session;
      
      setSession(mockSession);
      setUser(mockSession.user);
      await fetchUserData(response.user.id);
      
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      localStorage.setItem('auth_token', response.token);
      
      const mockSession = {
        access_token: response.token,
        user: { id: response.user.id, email: response.user.email } as User
      } as Session;
      
      setSession(mockSession);
      setUser(mockSession.user);
      await fetchUserData(response.user.id);
      
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // In a real implementation you might notify the backend
      // await apiFetch('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }

    localStorage.removeItem('auth_token');
    localStorage.removeItem('remember_me');
    
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
    setRoles([]);
    
    const sessionKey = 'sb-vxegvnndkeoubqnruiqj-auth-token';
    localStorage.removeItem(sessionKey);
    sessionStorage.removeItem(sessionKey);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  const becomeSeller = async () => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    if (roles.includes('seller')) {
      return { error: new Error('User is already a seller') };
    }

    try {
      await fetchUserData(user.id);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const isAdmin = roles.includes('admin');
  const isSeller = roles.includes('seller');

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        roles,
        isLoading,
        isAdmin,
        isSeller,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        becomeSeller,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
