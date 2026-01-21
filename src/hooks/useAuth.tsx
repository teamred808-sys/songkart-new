import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        setProfile(profileData as Profile);
      }

      // Fetch all roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesData && rolesData.length > 0) {
        const userRoles = rolesData.map(r => r.role as AppRole);
        setRoles(userRoles);
        // Set primary role (admin > seller > buyer)
        if (userRoles.includes('admin')) {
          setRole('admin');
        } else if (userRoles.includes('seller')) {
          setRole('seller');
        } else {
          setRole('buyer');
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Migrate session to appropriate storage based on "Remember Me" preference
  const migrateSessionStorage = () => {
    const rememberMe = localStorage.getItem('remember_me') === 'true';
    const sessionKey = 'sb-vxegvnndkeoubqnruiqj-auth-token';
    
    if (rememberMe) {
      // Ensure session is in localStorage (persist across browser restart)
      const sessionData = sessionStorage.getItem(sessionKey);
      if (sessionData) {
        localStorage.setItem(sessionKey, sessionData);
        sessionStorage.removeItem(sessionKey);
      }
    } else {
      // Move session to sessionStorage (expires on browser close)
      const sessionData = localStorage.getItem(sessionKey);
      if (sessionData) {
        sessionStorage.setItem(sessionKey, sessionData);
        localStorage.removeItem(sessionKey);
      }
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Migrate session storage based on Remember Me preference after sign in
        if (event === 'SIGNED_IN' && session) {
          setTimeout(() => {
            migrateSessionStorage();
          }, 0);
        }

        // Defer Supabase calls with setTimeout to prevent deadlocks
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setRoles([]);
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRole(null);
          setRoles([]);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    // Handle visibility change for mobile app backgrounding/foregrounding
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh session when app returns to foreground
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user && !user) {
            setSession(session);
            setUser(session.user);
            fetchUserData(session.user.id);
          }
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const signUp = async (email: string, password: string, role: AppRole, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          role,
          full_name: fullName || '',
        },
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    
    // Clear remember me preference
    localStorage.removeItem('remember_me');
    
    // Clear any lingering session data from both storages
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

    // Check if user already has seller role
    if (roles.includes('seller')) {
      return { error: new Error('User is already a seller') };
    }

    try {
      // Insert seller role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role: 'seller' });

      if (roleError) {
        return { error: roleError };
      }

      // Create seller wallet
      const { error: walletError } = await supabase
        .from('seller_wallets')
        .insert({ user_id: user.id });

      if (walletError) {
        console.error('Error creating seller wallet:', walletError);
        // Don't fail the whole operation if wallet creation fails
      }

      // Refresh user data to update roles
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
