import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import DevServerCheck from './components/DevServerCheck';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <DevServerCheck>
      <AuthProvider>
        <App />
      </AuthProvider>
    </DevServerCheck>
  </React.StrictMode>
);
