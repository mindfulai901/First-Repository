import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full mt-auto py-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-center items-center max-w-6xl">
        <p className="text-gray-600">&copy; {new Date().getFullYear()} Voice Generator</p>
      </div>
    </footer>
  );
};