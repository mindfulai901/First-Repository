import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { useTheme } from '../contexts/ThemeContext';

const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 14.536l.707-.707a1 1 0 10-1.414-1.414l-.707.707a1 1 0 001.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" /></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V5.414l7.293 7.293a1 1 0 001.414-1.414L5.414 4H15a1 1 0 100-2H4a1 1 0 00-1 1z" clipRule="evenodd" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>;


export const UserMenu: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.prompt("This is irreversible. You will lose all your saved voices and history. Type 'DELETE' to confirm.");
    if (confirmation === 'DELETE') {
      try {
        // IMPORTANT: You need to create a Supabase Edge Function named 'delete-user'
        // that handles the deletion logic securely on the server-side.
        // This function should delete user data from storage and database tables,
        // and finally delete the user from the 'auth.users' table.
        const { error } = await supabase.functions.invoke('delete-user');
        if (error) throw error;
        alert('Your account has been successfully deleted.');
        await supabase.auth.signOut();
      } catch (error: any) {
        console.error('Error deleting account:', error);
        alert(`Failed to delete account: ${error.message}`);
      }
    } else {
      alert('Account deletion cancelled.');
    }
    setIsOpen(false);
  };

  if (!user) return null;

  return (
    <div className="absolute top-4 right-4" ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-bg)] focus:ring-[var(--color-primary)] rounded-full">
        <img
          src={user.user_metadata.avatar_url}
          alt={user.user_metadata.full_name || 'User Avatar'}
          className="w-12 h-12 rounded-full border-2 border-[var(--color-border)] shadow-md"
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[var(--color-scroll-container-bg)] border-2 border-[var(--color-border)] rounded-lg shadow-xl z-20"
             style={{boxShadow: '4px 4px 0px var(--shadow-color)'}}>
          <div className="p-4 border-b-2 border-[var(--color-border)]">
            <p className="font-bold truncate">{user.user_metadata.full_name || 'User'}</p>
            <p className="text-sm text-[var(--color-text-muted)] truncate">{user.email}</p>
          </div>
          <div className="py-2">
            <button onClick={toggleTheme} className="w-full text-left px-4 py-2 text-base flex items-center hover:bg-[var(--color-secondary)] transition-colors rounded-md">
              {theme === 'light' ? <MoonIcon/> : <SunIcon/>}
              <span className="ml-3">Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode</span>
            </button>
            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-base flex items-center hover:bg-[var(--color-secondary)] transition-colors rounded-md">
                <LogoutIcon/>
                <span className="ml-3">Logout</span>
            </button>
          </div>
          <div className="border-t-2 border-[var(--color-border)] p-2">
            <button onClick={handleDeleteAccount} className="w-full text-left px-4 py-2 text-base flex items-center text-red-500 hover:bg-red-500 hover:text-white transition-colors rounded-md">
                <DeleteIcon/>
                <span className="ml-3">Delete Account</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
