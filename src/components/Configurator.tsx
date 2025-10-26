import React, { useState, useRef, useEffect } from 'react';
import { getVoice, searchSharedVoices, addSharedVoice, ApiError, getModelCapabilities } from '../services/elevenLabsService';
import type { Voice, SavedVoice, VoiceSettings, SharedVoice } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';


interface ConfiguratorProps {
  modelId: string;
  voiceId: string;
  setVoiceId: (id: string) => void;
  voiceSettings: VoiceSettings;
  setVoiceSettings: (settings: VoiceSettings) => void;
  onGenerate: () => void;
  onBack: () => void;
  onShowSaved: () => void;
  savedVoices: SavedVoice[];
  setSavedVoices: (voices: SavedVoice[]) => void;
}

const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>;
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3.13L5 18V4z" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const LoadingSpinner = () => <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div>;
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;


const Configurator: React.FC<ConfiguratorProps> = ({
  modelId, voiceId, setVoiceId, voiceSettings, setVoiceSettings, onGenerate, onBack, onShowSaved, savedVoices, setSavedVoices
}) => {
  const { user } = useAuth();
  const [activeVoice, setActiveVoice] = useState<Voice | null>(null);
  const [activeSharedVoice, setActiveSharedVoice] = useState<SharedVoice | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isAddingVoice, setIsAddingVoice] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const capabilities = getModelCapabilities(modelId);

  useEffect(() => {
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
      const data = await getVoice(voiceId);
      setActiveVoice(data);
      if (data.settings) {
        setVoiceSettings(data.settings);
      }
    } catch (err) {
      const apiError = err as ApiError;
      // BUG FIX: Use "duck typing" by checking for the 'status' property instead of 'instanceof'.
      // This is more reliable in production environments where class names can be mangled.
      // Also check for 400, as API can return it for invalid IDs.
      if (apiError && (apiError.status === 404 || apiError.status === 400)) {
        try {
          const sharedData = await searchSharedVoices(voiceId);
          if (sharedData.voices && sharedData.voices.length > 0) {
            const foundVoice = sharedData.voices.find(v => v.voice_id === voiceId || v.name.toLowerCase() === voiceId.toLowerCase());
            if (foundVoice) {
              setActiveSharedVoice(foundVoice);
              setSearchError(null);
            } else {
              setSearchError(`Could not find a public voice with ID or name '${voiceId}'.`);
            }
          } else {
            setSearchError(
              `Voice '${voiceId}' was not found in your library or the public one. This can happen if the voice is private and the API key configured on the server is incorrect or from a different ElevenLabs account. Please verify your Vercel project's ELEVENLABS_API_KEY.`
            );
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
        activeSharedVoice.name
      );
      const newOwnedVoice = await getVoice(addedVoice.voice_id);
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

  const handleSave = async () => {
    if (!activeVoice || !user) return;
    const voiceToSave: Omit<SavedVoice, 'id'> = {
        user_id: user.id,
        voice_id: activeVoice.voice_id,
        name: activeVoice.name,
        customName: activeVoice.name,
        settings: voiceSettings,
        preview_url: activeVoice.preview_url,
        labels: activeVoice.labels,
    };

    const { data, error } = await supabase
        .from('saved_voices')
        .insert(voiceToSave)
        .select()
        .single();
        
    if (error) {
        setSearchError(`Failed to save voice: ${error.message}`);
    } else if (data) {
        setSavedVoices([...savedVoices, data as SavedVoice]);
        setIsSaved(true);
    }
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
        <p className="mt-2 text-lg text-[var(--color-text-muted)]">Find a voice and fine-tune its settings.</p>
      </div>

      <div className="space-y-4 p-4 bg-[var(--color-accent-bg-translucent)] rounded-lg border-2 border-[var(--color-border)]">
        <div className="flex justify-between items-center">
            <label htmlFor="voice-id" className="block text-base font-medium">ElevenLabs Voice ID or Name</label>
            <button onClick={onShowSaved} className="text-base text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition-colors hover:underline font-bold">My Saved Voices</button>
        </div>
        <div className="flex gap-2">
            <input id="voice-id" type="text" className="themed-input flex-grow p-3 text-lg rounded-lg" placeholder="e.g., 21m00Tcm4TlvDq8ikWAM" value={voiceId} onChange={(e) => { setVoiceId(e.target.value); setActiveVoice(null); setActiveSharedVoice(null); setSearchError(null); }}/>
            <button onClick={handleSearch} disabled={!voiceId.trim() || isSearching} className="flex items-center justify-center px-4 py-2 rounded-md font-bold text-lg hand-drawn-button">
                {isSearching ? <LoadingSpinner/> : <><SearchIcon /><span className="ml-2">Search</span></>}
            </button>
        </div>
        
        {searchError && <p className="text-base text-[var(--color-error-text)] mt-2">{searchError}</p>}
      </div>
      
      {activeSharedVoice && (
        <div className="space-y-6 p-4 bg-[var(--color-warning-bg-translucent)] rounded-lg border-2 border-[var(--color-warning-border)]">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold">{activeSharedVoice.name}</h3>
              <p className="text-sm text-[var(--color-text-muted)] capitalize">{Object.values(activeSharedVoice.labels).join(', ')}</p>
              <p className="text-sm text-[var(--color-warning-border)] mt-1 font-semibold">This is a public voice from the Voice Library.</p>
            </div>
            <button onClick={togglePlayPause} className="p-2 rounded-full bg-white/50 hover:bg-[var(--color-warning-border)] text-[var(--color-warning-border)] hover:text-white transition-colors" aria-label={`Preview voice ${activeSharedVoice.name}`}>
                {isPlaying ? <PauseIcon/> : <PlayIcon/>}
            </button>
          </div>
          <div className="text-center">
            <p className="text-base mb-2">Add this voice to your account to use it and customize its settings.</p>
            <button onClick={handleAddVoice} disabled={isAddingVoice} className="w-full flex items-center justify-center py-2 px-4 rounded-md font-bold text-lg hand-drawn-button" style={{backgroundColor: 'var(--color-warning-border)'}}>
                {isAddingVoice ? <LoadingSpinner /> : <><PlusIcon /><span className="ml-2">Add to My Voices</span></>}
            </button>
          </div>
        </div>
      )}

      {activeVoice && (
        <div className="space-y-6 p-4 bg-[var(--color-accent-bg-translucent-heavy)] rounded-lg border-2 border-[var(--color-accent)]">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold">{activeVoice.name}</h3>
              <p className="text-sm text-[var(--color-text-muted)] capitalize">{Object.values(activeVoice.labels).join(', ')}</p>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={togglePlayPause} className="p-2 rounded-full bg-white/50 hover:bg-[var(--color-accent)] text-[var(--color-accent-text)] hover:text-white transition-colors" aria-label={`Preview voice ${activeVoice.name}`}>
                    {isPlaying ? <PauseIcon/> : <PlayIcon/>}
                </button>
                <button onClick={handleSave} disabled={isSaved} className="flex items-center text-base py-2 px-4 rounded-md bg-[var(--color-secondary)] text-[var(--color-secondary-text)] hand-drawn-button disabled:opacity-60 disabled:cursor-default disabled:shadow-none font-bold">
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
                            ? 'bg-[var(--color-accent-bg)] border-[var(--color-accent)] text-[var(--color-accent-text)] shadow-[2px_2px_0px_var(--color-accent)]'
                            : 'bg-white/60 border-[var(--color-border)] hover:border-gray-600'
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
                  <input type="range" min="0" max="1" step="0.01" value={voiceSettings.stability} onChange={(e) => handleSettingChange('stability', parseFloat(e.target.value))} className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"/>
                </div>
              )}
              
              {capabilities.supportsClarity && (
                <div>
                  <label className="block text-base font-medium">Clarity + Similarity ({voiceSettings.similarity_boost.toFixed(2)})</label>
                  <input type="range" min="0" max="1" step="0.01" value={voiceSettings.similarity_boost} onChange={(e) => handleSettingChange('similarity_boost', parseFloat(e.target.value))} className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"/>
                </div>
              )}

              {capabilities.supportsStyle && (
                <div>
                  <label className="block text-base font-medium">Style Exaggeration ({voiceSettings.style?.toFixed(2) || '0.00'})</label>
                  <input type="range" min="0" max="1" step="0.01" value={voiceSettings.style || 0} onChange={(e) => handleSettingChange('style', parseFloat(e.target.value))} className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-[var(--color-accent)]"/>
                </div>
              )}
              
              {capabilities.supportsSpeakerBoost && (
                <div className="flex items-center justify-between pt-3">
                   <label className="text-base font-medium">Speaker Boost</label>
                   <label htmlFor="speaker-boost" className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" id="speaker-boost" className="sr-only peer" checked={!!voiceSettings.use_speaker_boost} onChange={(e) => handleSettingChange('use_speaker_boost', e.target.checked)} />
                      <div className="w-11 h-6 bg-gray-400 rounded-full peer peer-focus:ring-2 peer-focus:ring-[var(--color-accent)] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
                  </label>
                </div>
              )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row-reverse gap-4 pt-6 border-t-2 border-gray-300">
        <button onClick={onGenerate} disabled={!activeVoice} className="w-full flex justify-center py-3 px-4 rounded-md text-2xl font-bold text-white hand-drawn-button">Generate Voiceovers</button>
        <button onClick={onBack} className="w-full flex justify-center py-3 px-4 rounded-md text-2xl font-bold text-black hand-drawn-button bg-[var(--color-secondary)]">Back</button>
      </div>
    </div>
  );
};

export default Configurator;
