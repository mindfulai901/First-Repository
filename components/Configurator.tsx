import React, { useState, useRef, useEffect } from 'react';
import { getVoice, searchSharedVoices, addSharedVoice, ApiError, getModelCapabilities } from '../services/elevenLabsService';
import type { Voice, SavedVoice, VoiceSettings, SharedVoice } from '../types';

interface ConfiguratorProps {
  apiKey: string;
  modelId: string;
  voiceId: string;
  setVoiceId: (id: string) => void;
  voiceSettings: VoiceSettings;
  setVoiceSettings: (settings: VoiceSettings) => void;
  onGenerate: () => void;
  onBack: () => void;
  onShowSaved: () => void;
  onSaveVoice: (voice: SavedVoice) => void;
  savedVoices: SavedVoice[];
}

const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>;
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3.13L5 18V4z" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const LoadingSpinner = () => <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div>;
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;


const Configurator: React.FC<ConfiguratorProps> = ({
  apiKey, modelId, voiceId, setVoiceId, voiceSettings, setVoiceSettings, onGenerate, onBack, onShowSaved, onSaveVoice, savedVoices
}) => {
  const [activeVoice, setActiveVoice] = useState<Voice | null>(null);
  const [activeSharedVoice, setActiveSharedVoice] = useState<SharedVoice | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isAddingVoice, setIsAddingVoice] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get model capabilities to dynamically render the UI
  const capabilities = getModelCapabilities(modelId);

  useEffect(() => {
    // This effect ensures that if a voiceId is already set (e.g., from a saved voice selection),
    // its details are loaded into the 'activeVoice' state for display.
    if (voiceId && (!activeVoice || activeVoice.voice_id !== voiceId)) {
        const preselectedVoice = savedVoices.find(v => v.voice_id === voiceId);
        if (preselectedVoice) {
            handleSelectSavedVoice(preselectedVoice);
        }
    }
  }, [voiceId, savedVoices]);


  useEffect(() => {
    const alreadySaved = savedVoices.some(v => v.voice_id === activeVoice?.voice_id);
    setIsSaved(alreadySaved);

    const previewUrl = activeVoice?.preview_url || activeSharedVoice?.preview_url;

    if (previewUrl) {
      const audio = new Audio(previewUrl);
      audio.onended = () => setIsPlaying(false);
      audioRef.current = audio;
    } else {
      audioRef.current = null;
    }

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [activeVoice, activeSharedVoice, savedVoices]);

  const handleSearch = async () => {
    if (!voiceId.trim()) {
      setSearchError("Please enter a Voice ID.");
      return;
    }
    setIsPlaying(false);
    setActiveVoice(null);
    setActiveSharedVoice(null);
    setSearchError(null);
    setIsSearching(true);

    try {
      const data = await getVoice(voiceId, apiKey);
      setActiveVoice(data);
      if (data.settings) {
        setVoiceSettings(data.settings);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        try {
          const sharedData = await searchSharedVoices(voiceId, apiKey);
          if (sharedData.voices && sharedData.voices.length > 0) {
            const foundVoice = sharedData.voices.find(v => v.voice_id === voiceId || v.name.toLowerCase() === voiceId.toLowerCase());
            if (foundVoice) {
              setActiveSharedVoice(foundVoice);
              setSearchError(null);
            } else {
              setSearchError(`Could not find a public voice with ID or name '${voiceId}'.`);
            }
          } else {
            setSearchError(`Could not find voice '${voiceId}' in your library or the public library.`);
          }
        } catch (sharedErr) {
          setSearchError(sharedErr instanceof Error ? sharedErr.message : "Error searching public library.");
        }
      } else {
        setSearchError(err instanceof Error ? err.message : "An unknown error occurred.");
      }
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleAddVoice = async () => {
    if (!activeSharedVoice) return;
    setIsAddingVoice(true);
    setSearchError(null);
    try {
      const addedVoice = await addSharedVoice(
        activeSharedVoice.public_owner_id,
        activeSharedVoice.voice_id,
        activeSharedVoice.name,
        apiKey
      );
      const newOwnedVoice = await getVoice(addedVoice.voice_id, apiKey);
      setVoiceId(newOwnedVoice.voice_id);
      setActiveVoice(newOwnedVoice);
      if (newOwnedVoice.settings) {
        setVoiceSettings(newOwnedVoice.settings);
      }
      setActiveSharedVoice(null);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Failed to add voice to your library.');
    } finally {
      setIsAddingVoice(false);
    }
  };
  
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleSave = () => {
    if (!activeVoice) return;
    onSaveVoice({
      voice_id: activeVoice.voice_id,
      name: activeVoice.name,
      customName: activeVoice.name,
      settings: voiceSettings,
      preview_url: activeVoice.preview_url,
      labels: activeVoice.labels,
    });
    setIsSaved(true);
  };

  const handleSelectSavedVoice = (savedVoice: SavedVoice) => {
    setVoiceId(savedVoice.voice_id);
    setVoiceSettings(savedVoice.settings);
    setActiveVoice({
        voice_id: savedVoice.voice_id,
        name: savedVoice.name,
        preview_url: savedVoice.preview_url,
        labels: savedVoice.labels,
        settings: savedVoice.settings,
    });
    setActiveSharedVoice(null);
    setSearchError(null);
  };
  
  const handleSettingChange = (setting: keyof VoiceSettings, value: number | boolean) => {
    setVoiceSettings({ ...voiceSettings, [setting]: value });
  };

  const stabilityOptions = [
    { label: 'Creative', value: 0.0 },
    { label: 'Natural', value: 0.5 },
    { label: 'Robust', value: 1.0 },
  ];

  return (
    <div className="w-full max-w-4xl p-8 space-y-6 scroll-container">
      <div className="text-center">
        <h2 className="text-4xl font-bold">Step 4: Configure Voice</h2>
        <p className="mt-2 text-lg text-gray-600">Find a voice and fine-tune its settings.</p>
      </div>

      <div className="space-y-4 p-4 bg-[#e0f0e0]/50 rounded-lg border-2 border-gray-400">
        <div className="flex justify-between items-center">
            <label htmlFor="voice-id" className="block text-base font-medium text-gray-700">ElevenLabs Voice ID or Name</label>
            <button onClick={onShowSaved} className="text-base text-[#6a8b6a] hover:text-[#4a6b4a] transition-colors hover:underline font-bold">My Saved Voices Page</button>
        </div>
        <div className="flex gap-2">
            <input id="voice-id" type="text" className="flex-grow p-3 text-lg bg-white border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-[#9cb89c] focus:border-[#9cb89c]" placeholder="e.g., 21m00Tcm4TlvDq8ikWAM" value={voiceId} onChange={(e) => { setVoiceId(e.target.value); setActiveVoice(null); setActiveSharedVoice(null); setSearchError(null); }}/>
            <button onClick={handleSearch} disabled={!voiceId.trim() || isSearching} className="flex items-center justify-center px-4 py-2 rounded-md font-bold text-white hand-drawn-button text-lg">
                {isSearching ? <LoadingSpinner/> : <SearchIcon />}
                <span className="ml-2">Search</span>
            </button>
        </div>
        
        <div className="pt-2 space-y-2">
            <p className="text-base font-medium text-gray-700">Or select from your saved voices:</p>
            {savedVoices.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {savedVoices.map(savedVoice => (
                        <button
                            key={savedVoice.voice_id}
                            onClick={() => handleSelectSavedVoice(savedVoice)}
                            className={`py-2 px-4 rounded-md text-base font-bold border-2 transition-all duration-200 ${
                                voiceId === savedVoice.voice_id
                                    ? 'bg-[#e0f5f5] border-[#5f9ea0] text-[#4a7c7d] shadow-[2px_2px_0px_#5f9ea0]'
                                    : 'bg-white/60 border-gray-400 hover:border-gray-600'
                            }`}
                        >
                            {savedVoice.customName}
                        </button>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-gray-500 italic">You have no saved voices yet. Find a voice and click "Save Voice" to add one.</p>
            )}
        </div>

        {searchError && <p className="text-base text-red-600 mt-2">{searchError}</p>}
      </div>
      
      {activeSharedVoice && (
        <div className="space-y-6 p-4 bg-[#fffbe0]/60 rounded-lg border-2 border-[#c9a22a]">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold">{activeSharedVoice.name}</h3>
              <p className="text-sm text-gray-600 capitalize">{Object.values(activeSharedVoice.labels).join(', ')}</p>
              <p className="text-sm text-[#b58e0f] mt-1 font-semibold">This is a public voice from the Voice Library.</p>
            </div>
            <button onClick={togglePlayPause} className="p-2 rounded-full bg-white/50 hover:bg-[#c9a22a] text-[#a47e0d] hover:text-white transition-colors" aria-label={`Preview voice ${activeSharedVoice.name}`}>
                {isPlaying ? <PauseIcon/> : <PlayIcon/>}
            </button>
          </div>
          <div className="text-center">
            <p className="text-base text-gray-700 mb-2">Add this voice to your account to use it and customize its settings.</p>
            <button onClick={handleAddVoice} disabled={isAddingVoice} className="w-full flex items-center justify-center py-2 px-4 rounded-md font-bold text-white hand-drawn-button bg-[#c9a22a] hover:bg-[#b58e0f] text-lg">
                {isAddingVoice ? <LoadingSpinner /> : <PlusIcon />}
                <span className="ml-2">Add to My Voices</span>
            </button>
          </div>
        </div>
      )}

      {activeVoice && (
        <div className="space-y-6 p-4 bg-[#e0f5f5]/60 rounded-lg border-2 border-[#5f9ea0]">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold">{activeVoice.name}</h3>
              <p className="text-sm text-gray-600 capitalize">{Object.values(activeVoice.labels).join(', ')}</p>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={togglePlayPause} className="p-2 rounded-full bg-white/50 hover:bg-[#5f9ea0] text-[#4a7c7d] hover:text-white transition-colors" aria-label={`Preview voice ${activeVoice.name}`}>
                    {isPlaying ? <PauseIcon/> : <PlayIcon/>}
                </button>
                <button onClick={handleSave} disabled={isSaved} className="flex items-center text-base py-2 px-4 rounded-md bg-white/50 text-black hover:bg-gray-200 hand-drawn-button disabled:bg-[#a3d3d5]/50 disabled:text-gray-500 disabled:cursor-default disabled:shadow-none font-bold">
                  <SaveIcon/> {isSaved ? 'Saved!' : 'Save Voice'}
                </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {capabilities.stabilityType === 'discrete' ? (
                <div className="md:col-span-2">
                  <label className="block text-base font-medium mb-2">Stability</label>
                  <div className="flex justify-center gap-2">
                    {stabilityOptions.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => handleSettingChange('stability', opt.value)}
                        className={`py-2 px-4 rounded-md text-base font-bold border-2 transition-all duration-200 w-full ${
                          voiceSettings.stability === opt.value
                            ? 'bg-[#e0f5f5] border-[#5f9ea0] text-[#4a7c7d] shadow-[2px_2px_0px_#5f9ea0]'
                            : 'bg-white/60 border-gray-400 hover:border-gray-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-base font-medium">Stability ({voiceSettings.stability.toFixed(2)})</label>
                  <input type="range" min="0" max="1" step="0.01" value={voiceSettings.stability} onChange={(e) => handleSettingChange('stability', parseFloat(e.target.value))} className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-[#5f9ea0]"/>
                </div>
              )}
              
              {capabilities.supportsClarity && (
                <div>
                  <label className="block text-base font-medium">Clarity + Similarity ({voiceSettings.similarity_boost.toFixed(2)})</label>
                  <input type="range" min="0" max="1" step="0.01" value={voiceSettings.similarity_boost} onChange={(e) => handleSettingChange('similarity_boost', parseFloat(e.target.value))} className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-[#5f9ea0]"/>
                </div>
              )}

              {capabilities.supportsStyle && (
                <div>
                  <label className="block text-base font-medium">Style Exaggeration ({voiceSettings.style?.toFixed(2) || '0.00'})</label>
                  <input type="range" min="0" max="1" step="0.01" value={voiceSettings.style || 0} onChange={(e) => handleSettingChange('style', parseFloat(e.target.value))} className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-[#5f9ea0]"/>
                </div>
              )}
              
              {capabilities.supportsSpeakerBoost && (
                <div className="flex items-center justify-between pt-3">
                   <label className="text-base font-medium">Speaker Boost</label>
                   <label htmlFor="speaker-boost" className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" id="speaker-boost" className="sr-only peer" checked={!!voiceSettings.use_speaker_boost} onChange={(e) => handleSettingChange('use_speaker_boost', e.target.checked)} />
                      <div className="w-11 h-6 bg-gray-400 rounded-full peer peer-focus:ring-2 peer-focus:ring-[#5f9ea0] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5f9ea0]"></div>
                  </label>
                </div>
              )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row-reverse gap-4 pt-6 border-t-2 border-gray-300">
        <button onClick={onGenerate} disabled={!activeVoice} className="w-full flex justify-center py-3 px-4 rounded-md text-2xl font-bold text-white hand-drawn-button">Generate Voiceovers</button>
        <button onClick={onBack} className="w-full flex justify-center py-3 px-4 rounded-md text-2xl font-bold text-black hand-drawn-button bg-[#e0dcd3]">Back</button>
      </div>
    </div>
  );
};

export default Configurator;