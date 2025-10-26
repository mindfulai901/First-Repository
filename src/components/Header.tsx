import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  view: 'app' | 'instructions' | 'history';
  setView: (view: 'app' | 'instructions' | 'history') => void;
}

export const Header: React.FC<HeaderProps> = ({ view, setView }) => {
  const { user } = useAuth();

  return (
    <header className="w-full pt-4 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="text-center mb-4">
          <h1 className="text-5xl font-bold tracking-tight text-[var(--color-text)]">
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