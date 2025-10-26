import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppContent } from './AppContent';
import DevServerCheck from './components/DevServerCheck';

const App: React.FC = () => {
  return (
    <React.StrictMode>
      <DevServerCheck>
        <AuthProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </AuthProvider>
      </DevServerCheck>
    </React.StrictMode>
  );
};

export default App;
