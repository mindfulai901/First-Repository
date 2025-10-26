import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const getInitialSession = async () => {
      try {
        // Fetches the session from LocalStorage, and refreshes if necessary
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error fetching initial session:', error.message);
          throw error;
        }
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Failed to get initial session:', error);
        // Ensure user is logged out in case of failure
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    getInitialSession();

    // Listen for changes in authentication state (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false); // Auth state is confirmed, no longer loading
    });

    // Cleanup subscription on component unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value = { session, user, loading };

  // Render children only after the initial loading is complete.
  // This prevents rendering the app in a weird intermediate state.
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
