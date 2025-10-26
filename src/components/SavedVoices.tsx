import React from 'react';
import type { SavedVoice } from '../types';
import { supabase } from '../supabaseClient';

interface SavedVoicesProps {
  savedVoices: SavedVoice[];
  onSelectVoice: (voice: SavedVoice) => void;
  setSavedVoices: (voices: SavedVoice[]) => void;
  onBack: () => void;
}

const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>;

const SavedVoices: React.FC<SavedVoicesProps> = ({
  savedVoices,
  onSelectVoice,
  setSavedVoices,
  onBack,
}) => {

  const handleRemoveVoice = async (voiceId: string) => {
    const voiceToRemove = savedVoices.find(v => v.voice_id === voiceId);
    if (!voiceToRemove || !voiceToRemove.id) return;
    
    const { error } = await supabase.from('saved_voices').delete().eq('id', voiceToRemove.id);
    
    if (error) {
        alert(`Error removing voice: ${error.message}`);
    } else {
        setSavedVoices(savedVoices.filter(v => v.voice_id !== voiceId));
    }
  };


  return (
    <div className="w-full max-w-3xl p-8 space-y-6 scroll-container">
      <div className="text-center border-b-2 border-gray-300 pb-4">
        <h2 className="text-4xl font-bold">My Saved Voices</h2>
        <p className="mt-2 text-lg text-gray-600">
          Select one of your favorite voices to use.
        </p>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
        {savedVoices.length > 0 ? (
          savedVoices.map(voice => (
            <div
              key={voice.voice_id}
              className="bg-[#e0f0e0]/50 p-4 rounded-lg flex items-center justify-between border-2 border-gray-400"
            >
              <div>
                <p className="font-bold text-xl">{voice.customName}</p>
                <p className="text-base text-gray-600">{voice.name}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onSelectVoice(voice)}
                  className="py-2 px-4 text-white font-bold rounded-md text-base hand-drawn-button"
                >
                  Use Voice
                </button>
                <button
                  onClick={() => handleRemoveVoice(voice.voice_id)}
                  className="p-2 bg-red-200 hover:bg-red-300 text-red-800 rounded-full transition-colors"
                  aria-label={`Remove ${voice.customName}`}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 py-8 text-lg">
            You haven't saved any voices yet.
          </p>
        )}
      </div>

      <div className="pt-6 border-t-2 border-gray-300">
        <button
          onClick={onBack}
          className="w-full flex justify-center py-3 px-4 rounded-md text-2xl font-bold text-black hand-drawn-button bg-[#e0dcd3]"
        >
          Back to Voice Config
        </button>
      </div>
    </div>
  );
};

export default SavedVoices;
