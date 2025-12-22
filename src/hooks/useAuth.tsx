import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
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
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  roles: AppRole[];
  isLoading: boolean;
  isRoleLoading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, role: AppRole, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRoleLoading, setIsRoleLoading] = useState(false);

  const fetchUserData = useCallback(async (userId: string) => {
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
  }, []);

  const bootstrapUser = useCallback(async () => {
    try {
      setIsRoleLoading(true);
      console.log('Bootstrapping user...');
      
      const { data, error } = await supabase.functions.invoke('bootstrap-user');
      
      if (error) {
        console.error('Bootstrap error:', error);
        // Fallback to regular fetch if bootstrap fails
        if (session?.user) {
          await fetchUserData(session.user.id);
        }
        return;
      }

      console.log('Bootstrap response:', data);

      if (data?.roles && data.roles.length > 0) {
        setRoles(data.roles as AppRole[]);
        setRole(data.primaryRole as AppRole);
      }

      // Still fetch full profile data
      if (session?.user) {
        await fetchUserData(session.user.id);
      }
    } catch (error) {
      console.error('Bootstrap error:', error);
      // Fallback to regular fetch
      if (session?.user) {
        await fetchUserData(session.user.id);
      }
    } finally {
      setIsRoleLoading(false);
    }
  }, [session, fetchUserData]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth state change:', event);
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_IN' && newSession?.user) {
          // Use setTimeout to prevent deadlock
          setTimeout(() => {
            setIsRoleLoading(true);
            supabase.functions.invoke('bootstrap-user').then(({ data, error }) => {
              if (error) {
                console.error('Bootstrap on sign in error:', error);
              } else {
                console.log('Bootstrap on sign in:', data);
                if (data?.roles && data.roles.length > 0) {
                  setRoles(data.roles as AppRole[]);
                  setRole(data.primaryRole as AppRole);
                }
              }
              // Always fetch full data after bootstrap
              fetchUserData(newSession.user.id).finally(() => {
                setIsRoleLoading(false);
              });
            });
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRole(null);
          setRoles([]);
          setIsRoleLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        setIsRoleLoading(true);
        // Bootstrap then fetch data
        supabase.functions.invoke('bootstrap-user').then(({ data, error }) => {
          if (error) {
            console.error('Bootstrap on init error:', error);
          } else {
            console.log('Bootstrap on init:', data);
            if (data?.roles && data.roles.length > 0) {
              setRoles(data.roles as AppRole[]);
              setRole(data.primaryRole as AppRole);
            }
          }
          fetchUserData(existingSession.user.id).finally(() => {
            setIsLoading(false);
            setIsRoleLoading(false);
          });
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

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
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  const isAdmin = roles.includes('admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        roles,
        isLoading,
        isRoleLoading,
        isAdmin,
        signUp,
        signIn,
        signOut,
        refreshProfile,
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
