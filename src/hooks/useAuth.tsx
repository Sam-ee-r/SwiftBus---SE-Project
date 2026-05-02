import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isDriver: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDriver, setIsDriver] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function resolveSession(session: Session | null) {
      if (!mounted) return;
      if (session?.user) {
        try {
          const { data } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();
          if (!mounted) return;
          setUser(session.user);
          setSession(session);
          setIsAdmin(data?.role === 'admin');
          setIsDriver(data?.role === 'driver');
        } catch {
          if (!mounted) return;
          setUser(session.user);
          setSession(session);
          setIsAdmin(false);
          setIsDriver(false);
        }
      } else {
        setUser(null);
        setSession(null);
        setIsAdmin(false);
        setIsDriver(false);
      }
      if (mounted) setLoading(false);
    }

    // Initial session on mount
    supabase.auth.getSession().then((res) => resolveSession(res.data?.session ?? null));

    // React to subsequent auth events (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setLoading(true);
      resolveSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkUserRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    setIsAdmin(data?.role === 'admin');
    setIsDriver(data?.role === 'driver');
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
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
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      // Force local state clear immediately
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setIsDriver(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isDriver, signUp, signIn, signOut }}>
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
