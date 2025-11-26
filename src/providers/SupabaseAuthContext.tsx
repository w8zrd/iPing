import { createContext, useContext, useState, useEffect, ReactNode, MutableRefObject } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean; // Add isAdmin to the context type
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false); // Initialize isAdmin state

  useEffect(() => {
    const isMounted = { current: true };

const fetchUserProfile = async (userId: string, isMountedRef: MutableRefObject<boolean>) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (!isMountedRef.current) return { isAdmin: false };

    if (error) {
      logger.error('Error fetching admin status', error);
      return { isAdmin: false };
    }
    return { isAdmin: data?.is_admin ?? false };
  } catch (err) {
    logger.error('Exception in fetchUserProfile', err);
    return { isAdmin: false };
  }
};

    const handleAuthStateChange = async (_event: string, session: Session | null) => {
      if (!isMounted.current) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const { isAdmin } = await fetchUserProfile(session.user.id, isMounted);
        setIsAdmin(isAdmin);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    };

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted.current) return;
      logger.info('Initial session check', { session });
      if (session) {
        await handleAuthStateChange('INITIAL_SESSION', session);
      } else {
        setUser(null);
        setSession(null);
        setIsAdmin(false);
        setLoading(false); // Ensure loading is false if no session
      }
    }).catch((error) => {
      logger.error('Error fetching initial session', error);
      if (isMounted.current) {
        setUser(null);
        setSession(null);
        setIsAdmin(false);
        setLoading(false); // Ensure loading is false on error
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Initial session check

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    logger.info('Attempting sign in', { email });
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      logger.error('Sign in error', error, { userMessage: error.message, showToast: true });
    } else {
      logger.info('User signed in successfully.');
    }
    return { error };
  };

  const signUp = async (email: string, password: string, username: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    logger.info('Attempting sign up', { email, username });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username,
          display_name: username,
        }
      }
    });
    if (error) {
      logger.error('Sign up error', error, { userMessage: error.message, showToast: true });
    } else {
      logger.info('User signed up successfully. Check email for verification.');
    }
    return { error };
  };

  const signOut = async () => {
    logger.info('Attempting sign out.');
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('Sign out error', error, { userMessage: error.message, showToast: true });
    } else {
      logger.info('User signed out successfully.');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
