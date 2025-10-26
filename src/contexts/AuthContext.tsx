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
    // This is the critical step to prevent "stale sessions".
    const checkInitialSession = async () => {
      try {
        // `getUser()` makes a network request to the Supabase server to validate the user's token.
        // This is crucial for detecting if a session is invalid because the user was deleted,
        // their session was manually revoked, or the token has expired. It does not rely on browser storage.
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (currentUser) {
          // If the server confirms the user is valid, we can then get the full session object.
          // `getSession()` is safe to use here because we've already validated the user.
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
        } else {
          // If `getUser()` returns no user, it definitively means the session is invalid.
          // We must explicitly sign out to clear any potentially stale session data from browser local storage.
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error("Error checking initial session:", error);
        // In case of a network or other error, it's safest to assume the user is logged out.
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkInitialSession();

    // 3. Unsubscribe from the listener when the component unmounts to prevent memory leaks.
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value = { session, user };

  // Render a loading indicator until the initial session check is complete.
  // This prevents the main app from rendering with a potentially incorrect auth state.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-[var(--color-primary)]"></div>
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