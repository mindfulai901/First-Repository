
import React from 'react';

interface HeaderProps {
  view: 'app' | 'instructions' | 'history';
  setView: (view: 'app' | 'instructions' | 'history') => void;
  onSwitchApiKey: () => void;
}

export const Header: React.FC<HeaderProps> = ({ view, setView, onSwitchApiKey }) => {
  return (
    <header className="w-full pt-4">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
        <div className="text-center mb-4">
          <h1 className="text-5xl font-bold tracking-tight text-black">
            Voice Generator
          </h1>
        </div>
        <div className="flex justify-center space-x-2">
          <button
            onClick={onSwitchApiKey}
            className={`px-8 py-2 text-2xl font-bold hand-drawn-tab`}
          >
            SWITCH API
          </button>
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
      </div>
    </header>
  );
};
