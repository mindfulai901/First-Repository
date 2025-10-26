import React, { useState, useRef, useEffect } from 'react';
import { getVoice, searchSharedVoices, addSharedVoice, ApiError, getModelCapabilities } from '../services/elevenLabsService';
import type { Voice, SavedVoice, VoiceSettings, SharedVoice } from '../types';

interface ConfiguratorProps {
  modelId: string;
  voiceId: string;
  setVoiceId: (id: string) => void;
  voiceSettings: VoiceSettings;
  setVoiceSettings: (settings: VoiceSettings) => void;
  onGenerate: () => void;
  onBack: () => void;
  onShowSaved: () => void;
  onSaveVoice: (voice: Omit<SavedVoice, 'id' | 'user_id'>) => void;
  savedVoices: SavedVoice[];
}

const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>;
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-3.13L5 18V4z" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;
const LoadingSpinner = () => <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-current"></div>;
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;


const Configurator: React.FC<ConfiguratorProps> = ({
  modelId, voiceId, setVoiceId, voiceSettings, setVoiceSettings, onGenerate, onBack, onShowSaved, onSaveVoice, savedVoices
}) => {
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
      // If the voice is not found in the user's library (indicated by a 404 or a 400 "not found" error),
      // then try searching the public voice library.
      if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
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
        <h2 className="text-4xl font-bold">Step 3: Configure Voice</h2>
        <p className="mt-2 text-lg text-[var(--color-text-muted)]">Find a voice and fine-tune its settings.</p>
      </div>

      <div className="space-y-4 p-4 rounded-lg border-2 border-[var(--color-border)]" style={{backgroundColor: 'var(--color-scroll-container-bg-translucent)'}}>
        <div className="flex justify-between items-center">
            <label htmlFor="voice-id" className="block text-base font-medium text-[var(--color-text)]">ElevenLabs Voice ID or Name</label>
            <button onClick={onShowSaved} className="text-base text-[var(--color-primary)] hover:underline font-bold">My Saved Voices Page</button>
        </div>
        <div className="flex gap-2">
            <input id="voice-id" type="text" className="flex-grow p-3 text-lg rounded-lg themed-input" placeholder="e.g., 21m00Tcm4TlvDq8ikWAM" value={voiceId} onChange={(e) => { setVoiceId(e.target.value); setActiveVoice(null); setActiveSharedVoice(null); setSearchError(null); }}/>
            <button onClick={handleSearch} disabled={!voiceId.trim() || isSearching} className="flex items-center justify-center px-4 py-2 rounded-md font-bold text-lg hand-drawn-button">
                {isSearching ? <LoadingSpinner/> : <><SearchIcon /> <span className="ml-2">Search</span></>}
            </button>
        </div>
        
        <div className="pt-2 space-y-2">
            <p className="text-base font-medium text-[var(--color-text)]">Or select from your saved voices:</p>
            {savedVoices.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {savedVoices.map(savedVoice => (
                        <button
                            key={savedVoice.voice_id}
                            onClick={() => handleSelectSavedVoice(savedVoice)}
                            className={`py-2 px-4 rounded-md text-base font-bold border-2 transition-all duration-200 ${
                                voiceId === savedVoice.voice_id
                                    ? 'shadow-[2px_2px_0px_var(--color-accent)]'
                                    : 'border-[var(--color-border)]'
                            }`}
                             style={{
                                backgroundColor: voiceId === savedVoice.voice_id ? 'var(--color-accent-bg)' : 'var(--color-secondary)',
                                borderColor: voiceId === savedVoice.voice_id ? 'var(--color-accent)' : 'var(--color-border)',
                                color: voiceId === savedVoice.voice_id ? 'var(--color-accent-text)' : 'var(--color-text)',
                            }}
                        >
                            {savedVoice.customName}
                        </button>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-[var(--color-text-muted)] italic">You have no saved voices yet. Find a voice and click "Save Voice" to add one.</p>
            )}
        </div>

        {searchError && <p className="text-base text-red-600 mt-2">{searchError}</p>}
      </div>
      
      {activeSharedVoice && (
        <div className="space-y-6 p-4 rounded-lg border-2" style={{backgroundColor: 'var(--color-warning-bg-translucent)', borderColor: 'var(--color-warning-border)'}}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold">{activeSharedVoice.name}</h3>
              <p className="text-sm text-[var(--color-text-muted)] capitalize">{Object.values(activeSharedVoice.labels).join(', ')}</p>
              <p className="text-sm mt-1 font-semibold" style={{color: 'var(--color-warning-border)'}}>This is a public voice from the Voice Library.</p>
            </div>
            <button onClick={togglePlayPause} className="p-2 rounded-full transition-colors" style={{color: 'var(--color-warning-border)'}} aria-label={`Preview voice ${activeSharedVoice.name}`}>
                {isPlaying ? <PauseIcon/> : <PlayIcon/>}
            </button>
          </div>
          <div className="text-center">
            <p className="text-base text-[var(--color-text)] mb-2">Add this voice to your account to use it and customize its settings.</p>
            <button onClick={handleAddVoice} disabled={isAddingVoice} className="w-full flex items-center justify-center py-2 px-4 rounded-md font-bold text-lg hand-drawn-button" style={{backgroundColor: 'var(--color-warning-border)', color: 'var(--color-bg)'}}>
                {isAddingVoice ? <LoadingSpinner /> : <PlusIcon />}
                <span className="ml-2">Add to My Voices</span>
            </button>
          </div>
        </div>
      )}

      {activeVoice && (
        <div className="space-y-6 p-4 rounded-lg border-2" style={{backgroundColor: 'var(--color-accent-bg-translucent)', borderColor: 'var(--color-accent)'}}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold">{activeVoice.name}</h3>
              <p className="text-sm text-[var(--color-text-muted)] capitalize">{Object.values(activeVoice.labels).join(', ')}</p>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={togglePlayPause} className="p-2 rounded-full transition-colors" style={{color: 'var(--color-accent-text)'}} aria-label={`Preview voice ${activeVoice.name}`}>
                    {isPlaying ? <PauseIcon/> : <PlayIcon/>}
                </button>
                <button onClick={handleSave} disabled={isSaved} className="flex items-center text-base py-2 px-4 rounded-md bg-[var(--color-secondary)] text-[var(--color-secondary-text)] hand-drawn-button disabled:opacity-50 disabled:cursor-default disabled:shadow-none font-bold">
                  <SaveIcon/> {isSaved ? 'Saved!' : 'Save Voice'}
                </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* UI for voice settings */}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row-reverse gap-4 pt-6 border-t-2 border-[var(--color-border)]">
        <button onClick={onGenerate} disabled={!activeVoice} className="w-full flex justify-center py-3 px-4 rounded-md text-2xl font-bold hand-drawn-button">Generate Voiceovers</button>
        <button onClick={onBack} className="w-full flex justify-center py-3 px-4 rounded-md text-2xl font-bold hand-drawn-button bg-[var(--color-secondary)] text-[var(--color-secondary-text)]">Back</button>
      </div>
    </div>
  );
};

export default Configurator;