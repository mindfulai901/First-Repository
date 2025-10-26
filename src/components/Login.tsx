import React from 'react';
import { supabase } from '../supabaseClient';

const GoogleIcon = () => (
  <svg className="w-6 h-6 mr-3" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.618-3.229-11.334-7.618l-6.571 4.82C9.656 39.663 16.318 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 35.245 44 30.028 44 24c0-1.341-.138-2.65-.389-3.917z" />
  </svg>
);

const Login: React.FC = () => {
    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                },
            });
            if (error) {
                console.error("Error logging in with Google:", error.message);
                alert(`Could not sign in: ${error.message}`);
            }
        } catch (e) {
            console.error("An unexpected error occurred during login:", e);
            const message = e instanceof Error ? e.message : "An unknown error occurred."
            alert(`Login failed: ${message}`);
        }
    };

    return (
        <div className="w-full max-w-md p-8 space-y-8 scroll-container text-center">
            <h2 className="text-4xl font-bold">Welcome!</h2>
            <p className="mt-2 text-lg text-gray-600">
                Sign in to save your voices and access your generation history across devices.
            </p>
            <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center py-3 px-4 rounded-md text-xl font-bold text-black hand-drawn-button bg-white border-gray-400 hover:bg-gray-100"
            >
                <GoogleIcon />
                Sign in with Google
            </button>
        </div>
    );
};

export default Login;
