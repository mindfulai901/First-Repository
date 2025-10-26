import React from 'react';

interface StartScreenProps {
  onSelectMode: (mode: 'single' | 'batch') => void;
}

const SingleScriptIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 mx-auto" viewBox="0 0 20 20" fill="currentColor">
        <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm1 4a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 100 2h6a1 1 0 100-2H5z" />
    </svg>
);

const BatchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 mx-auto" viewBox="0 0 20 20" fill="currentColor">
        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
    </svg>
);


const StartScreen: React.FC<StartScreenProps> = ({ onSelectMode }) => {
    return (
        <div className="w-full max-w-4xl p-8 space-y-8 scroll-container text-center">
            <h2 className="text-4xl font-bold">Choose Your Method</h2>
            <p className="mt-2 text-lg text-[var(--color-text-muted)]">
                How would you like to generate voiceovers today?
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <button
                    onClick={() => onSelectMode('single')}
                    className="p-8 rounded-lg border-4 border-[var(--color-border)] bg-[var(--color-accent-bg-translucent)] hover:bg-[var(--color-accent-bg-translucent-heavy)] hover:border-[var(--color-primary)] transition-all duration-200 transform hover:scale-105"
                    style={{boxShadow: '6px 6px 0px var(--shadow-color)'}}
                >
                    <SingleScriptIcon />
                    <h3 className="text-3xl font-bold">Single Script</h3>
                    <p className="mt-2 text-[var(--color-text)]">Paste one script for a single voiceover.</p>
                </button>
                <button
                    onClick={() => onSelectMode('batch')}
                    className="p-8 rounded-lg border-4 border-[var(--color-border)] bg-[var(--color-accent-bg-translucent)] hover:bg-[var(--color-accent-bg-translucent-heavy)] hover:border-[var(--color-primary)] transition-all duration-200 transform hover:scale-105"
                    style={{boxShadow: '6px 6px 0px var(--shadow-color)'}}
                >
                    <BatchIcon />
                    <h3 className="text-3xl font-bold">Batch Production</h3>
                    <p className="mt-2 text-[var(--color-text)]">Upload multiple .txt files to process them all.</p>
                </button>
            </div>
        </div>
    );
};

export default StartScreen;