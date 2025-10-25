import React from 'react';

interface ScriptInputProps {
  script: string;
  setScript: (script: string) => void;
  onNext: () => void;
}

const ScriptInput: React.FC<ScriptInputProps> = ({ script, setScript, onNext }) => {
  return (
    <div className="w-full max-w-4xl p-8 space-y-8 scroll-container">
      <div className="text-center">
        <h2 className="text-4xl font-bold">Step 1: Enter Your Script</h2>
        <p className="mt-2 text-lg text-gray-600">
          Paste the full text you want to convert into a voiceover.
        </p>
      </div>
      <textarea
        className="w-full h-64 p-4 text-gray-800 bg-[#f0f5f0] border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-[#9cb89c] focus:border-[#9cb89c] transition duration-300 resize-none placeholder-gray-500 text-lg"
        style={{boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.1)'}}
        placeholder="Once upon a time, in a land far, far away..."
        value={script}
        onChange={(e) => setScript(e.target.value)}
      />
      <button
        onClick={onNext}
        disabled={script.trim().length === 0}
        className="w-full flex justify-center py-3 px-4 rounded-md text-2xl font-bold text-white hand-drawn-button"
      >
        Next: Set Paragraphs per File
      </button>
    </div>
  );
};

export default ScriptInput;