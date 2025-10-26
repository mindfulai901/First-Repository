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
    // The onAuthStateChange listener is the single source of truth for auth state.
    // It handles login, logout, and token refresh events.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false); // Once the listener fires, we have a definitive auth state.
    });

    // On initial load, we also force a check to handle the edge case where a user was
    // deleted from the backend, but their local session token hasn't expired yet.
    const checkInitialSession = async () => {
        // This will trigger the onAuthStateChange listener with the latest session state.
        // If the session is invalid (e.g., user deleted), the listener will receive a null session.
        await supabase.auth.getSession();
    };

    checkInitialSession();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const value = { session, user };

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