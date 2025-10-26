import React from 'react';

const DevServerCheck: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (window.location.protocol === 'file:') {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f4f1ea] p-4">
            <div className="w-full max-w-3xl p-8 space-y-4 scroll-container text-left text-gray-800">
                <h1 className="text-4xl font-bold text-center text-[#c62828] mb-4">Application Environment Error</h1>
                <p className="text-lg">
                    This application cannot be run by opening the <code>index.html</code> file directly. It must be served by a local web server to work correctly, especially for features like authentication.
                </p>
                <div className="mt-6 p-4 bg-[#e0f0e0]/50 rounded-lg border-2 border-gray-400">
                    <h2 className="text-2xl font-bold mb-2">How to Run This App Correctly:</h2>
                    <ol className="list-decimal list-inside space-y-2 text-lg">
                        <li>Open a terminal in the project's root folder.</li>
                        <li>
                            Install dependencies (if you haven't already):
                            <pre className="bg-gray-200 p-2 rounded-md mt-1 text-base"><code>npm install</code></pre>
                        </li>
                        <li>
                            Start the development server:
                            <pre className="bg-gray-200 p-2 rounded-md mt-1 text-base"><code>npm run dev</code></pre>
                        </li>
                        <li>
                            Open your web browser and go to the URL shown in the terminal, usually <a href="http://localhost:3000" className="text-blue-600 underline">http://localhost:3000</a>.
                        </li>
                    </ol>
                </div>
                 <div className="mt-6 p-4 bg-[#fffbe0]/60 rounded-lg border-2 border-[#c9a22a]">
                    <h2 className="text-2xl font-bold mb-2">Important Supabase Setup:</h2>
                     <p className="text-lg">
                        Remember to add <code className="bg-gray-200 p-1 rounded">http://localhost:3000</code> to your list of Redirect URLs in your Supabase project's Authentication settings.
                    </p>
                </div>
            </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default DevServerCheck;
