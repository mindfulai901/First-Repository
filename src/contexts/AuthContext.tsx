import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

interface AuthContextType {
  session: Session | null;
  user: User | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Set up a listener for subsequent auth state changes (e.g., sign in, sign out).
    // This keeps the app's state in sync with Supabase's auth events in real-time.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      // Once the auth state is determined, we are no longer loading.
      // This handles live logins/logouts after the initial load.
      setLoading(false);
    });

    // 2. Perform a robust, one-time check of the session on initial app load.
    const checkInitialSession = async () => {
      try {
        // getUser() makes a network request to Supabase to validate the user's token.
        // This is crucial for detecting stale sessions (e.g., when a user is deleted from the backend).
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (currentUser) {
          // If the user is valid, we can get the full session object, which will be available from storage.
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
        } else {
          // If getUser() returns no user, it means the session is invalid.
          // Explicitly sign out to clear any local storage artifacts.
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error("Error checking initial session:", error);
        // In case of an error, ensure the user is logged out for safety.
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkInitialSession();

    // 3. Unsubscribe from the listener when the component unmounts.
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value = { session, user };

  // Render a loading indicator until the initial session check is complete.
  // This prevents the main app from rendering with a potentially incorrect auth state.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f1ea]">
        <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-[#9cb89c]"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
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
