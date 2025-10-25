import React from 'react';

interface ApiKeyInputProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  onNext: () => void;
  entryReason: 'initial' | 'switch';
  onBack: () => void;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ apiKey, setApiKey, onNext, entryReason, onBack }) => {
  return (
    <div className="w-full max-w-2xl p-8 space-y-8 text-center scroll-container">
      <h2 className="text-4xl font-bold">Enter Your API Key</h2>
      <p className="mt-2 text-lg text-gray-600">
        Please provide your ElevenLabs API key to continue. Your key is saved securely in your browser for future use.
      </p>
      
      <div className="space-y-6">
        <div>
          <label htmlFor="api-key" className="sr-only">
            ElevenLabs API Key
          </label>
          <input
            id="api-key"
            type="password"
            className="w-full p-3 bg-white border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-[#9cb89c] focus:border-[#9cb89c] transition duration-300 placeholder-gray-500 text-center text-xl"
            placeholder="Enter your ElevenLabs API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
      </div>
      
      {entryReason === 'switch' ? (
        <div className="flex flex-col sm:flex-row-reverse gap-4">
          <button
            onClick={onNext}
            disabled={!apiKey.trim()}
            className="w-full flex justify-center py-3 px-4 rounded-md text-2xl font-bold text-white hand-drawn-button"
          >
            Change
          </button>
          <button
            onClick={onBack}
            className="w-full flex justify-center py-3 px-4 rounded-md text-2xl font-bold text-black hand-drawn-button bg-[#e0dcd3]"
          >
            Back
          </button>
        </div>
      ) : (
        <button
          onClick={onNext}
          disabled={!apiKey.trim()}
          className="w-full flex justify-center py-3 px-4 rounded-md text-2xl font-bold text-white hand-drawn-button"
        >
          Continue
        </button>
      )}
    </div>
  );
};

export default ApiKeyInput;