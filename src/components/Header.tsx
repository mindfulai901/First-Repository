import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

interface HeaderProps {
  view: 'app' | 'instructions' | 'history';
  setView: (view: 'app' | 'instructions' | 'history') => void;
}

const UserMenu: React.FC = () => {
    const { user } = useAuth();
  
    const handleLogout = async () => {
      await supabase.auth.signOut();
    };
  
    if (!user) return null;
  
    return (
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <img
          src={user.user_metadata.avatar_url}
          alt={user.user_metadata.full_name || 'User Avatar'}
          className="w-12 h-12 rounded-full border-2 border-black shadow-md"
        />
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-lg font-bold hand-drawn-button bg-red-400"
        >
          Logout
        </button>
      </div>
    );
};

export const Header: React.FC<HeaderProps> = ({ view, setView }) => {
  const { user } = useAuth();

  return (
    <header className="w-full pt-4 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="text-center mb-4">
          <h1 className="text-5xl font-bold tracking-tight text-black">
            Voice Generator
          </h1>
        </div>
        {user && (
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => setView('instructions')}
              className={`px-8 py-2 text-2xl font-bold hand-drawn-tab ${view === 'instructions' ? 'active' : ''}`}
            >
              INSTRUCTIONS
            </button>
            <button
              onClick={() => setView('history')}
              className={`px-8 py-2 text-2xl font-bold hand-drawn-tab ${view === 'history' ? 'active' : ''}`}
            >
              HISTORY
            </button>
          </div>
        )}
      </div>
      <UserMenu />
    </header>
  );
};
