import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('Auth state changed:', _event, session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          // Fetch admin status when user session changes
          supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', session.user.id)
            .single()
            .then(({ data, error }) => {
              if (error) {
                console.error('Error fetching admin status:', error.message);
                setIsAdmin(false);
              } else {
                setIsAdmin(data?.is_admin ?? false);
              }
            });
        } else {
          setIsAdmin(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session);
      if (!session) {
        setLoading(false);
      }
      // The onAuthStateChange listener will handle setting the user and session if it exists.
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('Attempting sign in for:', email);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error('Sign in error:', error.message);
    } else {
      console.log('User signed in successfully.');
    }
    return { error };
  };

  const signUp = async (email: string, password: string, username: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    console.log('Attempting sign up for:', email, 'with username:', username);
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
      console.error('Sign up error:', error.message);
    } else {
      console.log('User signed up successfully. Check email for verification.');
    }
    return { error };
  };

  const signOut = async () => {
    console.log('Attempting sign out.');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error.message);
    } else {
      console.log('User signed out successfully.');
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
