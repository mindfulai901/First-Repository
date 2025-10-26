import React, { useState, useCallback, useEffect } from 'react';
import ScriptInput from './components/ScriptInput';
import Configurator from './components/Configurator';
import ResultsDisplay from './components/ResultsDisplay';
import SavedVoices from './components/SavedVoices';
import ParagraphCountInput from './components/WordCountInput';
import ModelSelector from './components/ModelSelector';
import Instructions from './components/Instructions';
import History from './components/History';
import Login from './components/Login';
import { generateVoiceover } from './services/elevenLabsService';
import type { AudioResult, SavedVoice, VoiceSettings, HistoryItem } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './supabaseClient';
import { useLocalStorage } from './hooks/useLocalStorage';

type Step = 'script' | 'paragraphCount' | 'modelSelection' | 'config' | 'savedVoices' | 'results';
type View = 'app' | 'instructions' | 'history';

const App: React.FC = () => {
  const { session, user } = useAuth();
  const [step, setStep] = useState<Step>('script');
  const [view, setView] = useState<View>('app');
  const [script, setScript] = useState<string>('');
  
  const [savedVoices, setSavedVoices] = useState<SavedVoice[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [modelId, setModelId] = useLocalStorage<string>('elevenLabsModelId', 'eleven_multilingual_v2');
  
  const [paragraphsPerChunk, setParagraphsPerChunk] = useState<number>(1);
  const [voiceId, setVoiceId] = useState<string>('');
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    stability: 0.75,
    similarity_boost: 0.75,
    style: 0.5,
    use_speaker_boost: true,
    speed: 1.0,
  });

  const [audioFiles, setAudioFiles] = useState<AudioResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    // This effect is responsible for fetching user-specific data once they are logged in.
    // It is wrapped in a safe, async, self-invoking function to handle errors gracefully.
    const fetchUserData = async () => {
        if (user) {
            try {
                // Fetch saved voices and history in parallel for efficiency
                const [voicesResponse, historyResponse] = await Promise.all([
                    supabase.from('saved_voices').select('*').eq('user_id', user.id),
                    supabase.from('history').select('*').eq('user_id', user.id).order('createdAt', { ascending: false }).limit(50)
                ]);

                if (voicesResponse.error) throw voicesResponse.error;
                setSavedVoices(voicesResponse.data as SavedVoice[] || []);

                if (historyResponse.error) throw historyResponse.error;
                setHistory(historyResponse.data as HistoryItem[] || []);

            } catch (err) {
                const message = err instanceof Error ? err.message : "An unknown error occurred."
                console.error('Error fetching user data:', message);
                setError(`Failed to load user data: ${message}`);
            }
        }
    };

    fetchUserData();
  }, [user]);

  const handleAddSavedVoice = async (voice: Omit<SavedVoice, 'id' | 'user_id'>) => {
    if (!user) return;
    
    const voiceToSave = {
        ...voice,
        user_id: user.id
    };

    const { data, error } = await supabase
        .from('saved_voices')
        .upsert(voiceToSave, { onConflict: 'user_id,voice_id' })
        .select()
        .single();
    
    if (error) {
        setError(error.message);
        console.error("Error saving voice: ", error);
    } else if (data) {
        setSavedVoices(currentVoices => {
            const existingIndex = currentVoices.findIndex(v => v.voice_id === voice.voice_id);
            if (existingIndex > -1) {
                const newVoices = [...currentVoices];
                newVoices[existingIndex] = data as SavedVoice;
                return newVoices;
            } else {
                return [...currentVoices, data as SavedVoice];
            }
        });
    }
  };

  const handleRemoveSavedVoice = async (voice_id: string) => {
    if (!user) return;
    const { error } = await supabase.from('saved_voices').delete().match({ voice_id: voice_id, user_id: user.id });
    if (error) {
      setError(error.message);
    } else {
      setSavedVoices(savedVoices.filter(v => v.voice_id !== voice_id));
    }
  };
  
  const handleSelectSavedVoice = (voice: SavedVoice) => {
    setVoiceId(voice.voice_id);
    setVoiceSettings(voice.settings);
    setStep('config');
  };

  const splitScriptByParagraphs = (text: string, paragraphsPerChunk: number): string[] => {
    if (!text.trim() || paragraphsPerChunk <= 0) return [];
    const paragraphs = text.split(/\n+/).filter(p => p.trim() !== '');
    if (paragraphs.length === 0) return [];
    const chunks: string[] = [];
    for (let i = 0; i < paragraphs.length; i += paragraphsPerChunk) {
      const chunkParagraphs = paragraphs.slice(i, i + paragraphsPerChunk);
      chunks.push(chunkParagraphs.join('\n\n'));
    }
    return chunks;
  };

  const handleGenerate = useCallback(async () => {
    if (!voiceId || !modelId) {
      setError("Voice ID and a Model must be set before generating.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setAudioFiles([]);
    setStep('results');

    const textChunks = splitScriptByParagraphs(script, paragraphsPerChunk);
    if (textChunks.length === 0) {
        setError("Your script is empty or could not be split into paragraphs.");
        setIsLoading(false);
        return;
    }
    
    const collectedAudioResults: AudioResult[] = [];
    let previousRequestId: string | undefined = undefined;

    try {
      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];
        setProgress({ current: i + 1, total: textChunks.length });

        const result = await generateVoiceover(chunk, voiceId, voiceSettings, modelId, previousRequestId);
        
        const audioUrl = URL.createObjectURL(result.blob);
        const newAudioFile: AudioResult = { id: i + 1, audioUrl, blob: result.blob };
        
        collectedAudioResults.push(newAudioFile);
        setAudioFiles(prevFiles => [...prevFiles, newAudioFile]);
        previousRequestId = result.requestId;
      }

      if (user && collectedAudioResults.length > 0) {
        const combinedBlob = new Blob(collectedAudioResults.map(f => f.blob), { type: 'audio/mpeg' });
        const name = script.trim().split(/\s+/).slice(0, 5).join(' ') + (script.trim().split(/\s+/).length > 5 ? '...' : '');

        const fileName = `${user.id}/${Date.now()}.mp3`;
        const { error: uploadError } = await supabase.storage.from('history-audio').upload(fileName, combinedBlob);
        
        if (uploadError) {
            console.error('Error uploading audio:', uploadError);
            setError(`Failed to save audio to history: ${uploadError.message}`);
        } else {
            const { data: { publicUrl } } = supabase.storage.from('history-audio').getPublicUrl(fileName);
            if (publicUrl) {
                const newItem = {
                    user_id: user.id,
                    name: name || "Untitled Voiceover",
                    createdAt: new Date().toISOString(),
                    audioUrl: publicUrl,
                };
                const { data: historyData, error: historyError } = await supabase.from('history').insert(newItem).select().single();
                if (historyError) {
                    console.error('Error saving history record:', historyError);
                } else if (historyData) {
                    setHistory(prev => [historyData as HistoryItem, ...prev.slice(0, 49)]);
                }
            }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during voice generation.');
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  }, [script, paragraphsPerChunk, voiceId, voiceSettings, modelId, user]);

  const handleRemoveHistoryItem = async (id: string) => {
    if (!user) return;
    // We can also remove the file from storage, but for simplicity, we'll just remove the DB record.
    const { error } = await supabase.from('history').delete().match({ id, user_id: user.id });
    if (error) {
        setError(`Failed to delete history item: ${error.message}`);
    } else {
        setHistory(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleScriptNext = () => setStep('paragraphCount');
  const handleParagraphCountNext = () => setStep('modelSelection');
  const handleModelSelectionNext = () => setStep('config');

  const handleReset = () => {
    setScript('');
    setAudioFiles([]);
    setError(null);
    setIsLoading(false);
    setVoiceId('');
    setParagraphsPerChunk(1);
    setStep('script');
    setView('app');
  }

  const renderContent = () => {
    if (view === 'instructions') {
        return <Instructions onBack={() => setView('app')} />;
    }
    if (view === 'history') {
      return <History history={history} onRemove={handleRemoveHistoryItem} onBack={() => setView('app')} />;
    }

    switch (step) {
      case 'script':
        return <ScriptInput script={script} setScript={setScript} onNext={handleScriptNext} />;
      case 'paragraphCount':
        return <ParagraphCountInput paragraphsPerChunk={paragraphsPerChunk} setParagraphsPerChunk={setParagraphsPerChunk} onNext={handleParagraphCountNext} onBack={() => setStep('script')} />;
      case 'modelSelection':
        return <ModelSelector selectedModel={modelId} setSelectedModel={setModelId} onNext={handleModelSelectionNext} onBack={() => setStep('paragraphCount')} />;
      case 'config':
        return (
          <Configurator
            modelId={modelId}
            voiceId={voiceId}
            setVoiceId={setVoiceId}
            voiceSettings={voiceSettings}
            setVoiceSettings={setVoiceSettings}
            onGenerate={handleGenerate}
            onBack={() => setStep('modelSelection')}
            onShowSaved={() => setStep('savedVoices')}
            onSaveVoice={handleAddSavedVoice}
            savedVoices={savedVoices}
          />
        );
      case 'savedVoices':
        return (
          <SavedVoices 
            savedVoices={savedVoices}
            onSelectVoice={handleSelectSavedVoice}
            onRemoveVoice={handleRemoveSavedVoice}
            onBack={() => setStep('config')}
          />
        );
      case 'results':
        return (
          <ResultsDisplay
            audioFiles={audioFiles}
            isLoading={isLoading}
            error={error}
            onReset={handleReset}
            progress={progress}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header view={view} setView={setView} />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center max-w-6xl w-full">
        {!session ? <Login /> : renderContent()}
      </main>
      <Footer />
    </div>
  );
};

export default App;