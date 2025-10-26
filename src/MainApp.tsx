import React, { useState, useEffect } from 'react';
import Configurator from './components/Configurator';
import SavedVoices from './components/SavedVoices';
import ParagraphCountInput from './components/WordCountInput';
import ModelSelector from './components/ModelSelector';
import Instructions from './components/Instructions';
import History from './components/History';
import Login from './components/Login';
import ResultsDisplay from './components/ResultsDisplay';
import ScriptInput from './components/ScriptInput';
import BatchProcessor from './components/BatchProcessor';
import StartScreen from './components/StartScreen';
import type { SavedVoice, VoiceSettings, HistoryItem, AudioResult, BatchJob } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './supabaseClient';
import { useLocalStorage } from './hooks/useLocalStorage';
import { generateVoiceover } from './services/elevenLabsService';


type Step = 'start' | 'script' | 'paragraphCount' | 'modelSelection' | 'config' | 'savedVoices' | 'singleResults' | 'batchResults';
type View = 'app' | 'instructions' | 'history';
type Mode = 'single' | 'batch';

export const MainApp: React.FC = () => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('start');
  const [view, setView] = useState<View>('app');
  const [mode, setMode] = useState<Mode>('single');
  
  const [modelId, setModelId] = useLocalStorage<string>('elevenLabsModelId', 'eleven_multilingual_v2');
  const [savedVoices, setSavedVoices] = useState<SavedVoice[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Input state
  const [script, setScript] = useState<string>('');
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  
  // Config state
  const [paragraphsPerChunk, setParagraphsPerChunk] = useState<number>(1);
  const [voiceId, setVoiceId] = useState<string>('');
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    stability: 0.75,
    similarity_boost: 0.75,
    style: 0.5,
    use_speaker_boost: true,
    speed: 1.0,
  });

  // Results state
  const [audioFiles, setAudioFiles] = useState<AudioResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);


  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        const { data: voicesData, error: voicesError } = await supabase
          .from('saved_voices')
          .select('*')
          .eq('user_id', user.id);
        if (voicesError) console.error('Error fetching saved voices:', voicesError);
        else setSavedVoices(voicesData as SavedVoice[]);

        const { data: historyData, error: historyError } = await supabase
          .from('history')
          .select('*')
          .eq('user_id', user.id)
          .order('createdAt', { ascending: false });
        if (historyError) console.error('Error fetching history:', historyError);
        else setHistory(historyData as HistoryItem[]);
      };
      fetchUserData();
    }
  }, [user]);

  const handleSelectSavedVoice = (voice: SavedVoice) => {
    setVoiceId(voice.voice_id);
    setVoiceSettings(voice.settings);
    setStep('config');
  };
  
  const handleResetWorkflow = () => {
    setScript('');
    setStagedFiles([]);
    setAudioFiles([]);
    setError(null);
    setIsLoading(false);
    setVoiceId('');
    setParagraphsPerChunk(1);
    setStep('start');
    setView('app');
  }

  const handleGenerate = async () => {
    if (!voiceId || !modelId || !user) {
        setError("A voice and model must be selected, and you must be logged in.");
        return;
    }
    
    if (mode === 'single') {
        await handleSingleGenerate();
    } else {
        await handleBatchGenerate();
    }
  };

  const splitScriptByParagraphs = (text: string, count: number): string[] => {
    if (!text.trim() || count <= 0) return [];
    const paragraphs = text.split(/\n+/).filter(p => p.trim() !== '');
    if (paragraphs.length === 0) return [];
    const chunks: string[] = [];
    for (let i = 0; i < paragraphs.length; i += count) {
        chunks.push(paragraphs.slice(i, i + count).join('\n\n'));
    }
    return chunks;
  };

  const handleSingleGenerate = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    setAudioFiles([]);
    setStep('singleResults');

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
            setAudioFiles(prev => [...prev, newAudioFile]);
            previousRequestId = result.requestId;
        }

        if (collectedAudioResults.length > 0) {
            const combinedBlob = new Blob(collectedAudioResults.map(f => f.blob), { type: 'audio/mpeg' });
            const fileName = `${user.id}/${Date.now()}.mp3`;
            
            const { error: uploadError } = await supabase.storage.from('history_audio').upload(fileName, combinedBlob);
            if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);

            const { data: { publicUrl } } = supabase.storage.from('history_audio').getPublicUrl(fileName);
            if (!publicUrl) throw new Error('Could not get public URL for the uploaded file.');
            
            const name = script.trim().split(/\s+/).slice(0, 5).join(' ') + (script.trim().split(/\s+/).length > 5 ? '...' : '');
            const newItem: Omit<HistoryItem, 'id'> = {
                user_id: user.id,
                name: name || "Untitled Voiceover",
                createdAt: new Date().toISOString(),
                audioUrl: publicUrl,
            };
            const { data: insertedItem, error: insertError } = await supabase.from('history').insert(newItem).select().single();
            if (insertError) throw new Error(`Database Error: ${insertError.message}`);
            
            setHistory(prev => [insertedItem as HistoryItem, ...prev]);
        }
    } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsLoading(false);
        setProgress(null);
    }
  };

  const handleBatchGenerate = async () => {
    if (!user || stagedFiles.length === 0) return;
    setIsLoading(true);
    setError(null);

    const filePromises = stagedFiles.map(file => {
        return new Promise<{ name: string, content: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({ name: file.name, content: e.target?.result as string });
            reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
            reader.readAsText(file);
        });
    });

    try {
        const fileContents = await Promise.all(filePromises);
        const newJobs: Omit<BatchJob, 'id' | 'created_at'>[] = fileContents.map(fc => ({
            user_id: user.id,
            script_content: fc.content,
            original_filename: fc.name,
            status: 'queued',
            voice_id: voiceId,
            model_id: modelId,
            paragraphs_per_chunk: paragraphsPerChunk,
            voice_settings: voiceSettings,
        }));

        const { error: insertError } = await supabase.from('batch_jobs').insert(newJobs);
        if (insertError) throw insertError;
        
        setStagedFiles([]); // Clear staged files after queuing
        setStep('batchResults');

    } catch (err) {
         setError(err instanceof Error ? err.message : 'An unknown error occurred creating batch jobs.');
    } finally {
        setIsLoading(false);
    }
  };


  const renderContent = () => {
    if (!user) {
      return <Login />;
    }

    if (view === 'instructions') return <Instructions onBack={() => setView('app')} />;
    if (view === 'history') return <History history={history} setHistory={setHistory} onBack={() => setView('app')} />;

    switch (step) {
      case 'start':
        return <StartScreen onSelectMode={(selectedMode) => { setMode(selectedMode); setStep('script'); }} />;
      case 'script':
        return <ScriptInput script={script} setScript={setScript} onFilesChange={setStagedFiles} mode={mode} onNext={() => setStep('paragraphCount')} onBack={() => setStep('start')} />;
      case 'paragraphCount':
        return <ParagraphCountInput paragraphsPerChunk={paragraphsPerChunk} setParagraphsPerChunk={setParagraphsPerChunk} onNext={() => setStep('modelSelection')} onBack={() => setStep('script')} />;
      case 'modelSelection':
        return <ModelSelector selectedModel={modelId} setSelectedModel={setModelId} onNext={() => setStep('config')} onBack={() => setStep('paragraphCount')} />;
      case 'config':
        return (
          <Configurator
            modelId={modelId}
            voiceId={voiceId}
            setVoiceId={setVoiceId}
            voiceSettings={voiceSettings}
            setVoiceSettings={setVoiceSettings}
            onGenerate={handleGenerate}
            isLoading={isLoading}
            onBack={() => setStep('modelSelection')}
            onShowSaved={() => setStep('savedVoices')}
            savedVoices={savedVoices}
            setSavedVoices={setSavedVoices}
          />
        );
      case 'savedVoices':
        return <SavedVoices savedVoices={savedVoices} onSelectVoice={handleSelectSavedVoice} setSavedVoices={setSavedVoices} onBack={() => setStep('config')} />;
      case 'singleResults':
        return <ResultsDisplay audioFiles={audioFiles} isLoading={isLoading} error={error} onReset={handleResetWorkflow} progress={progress} />;
      case 'batchResults':
        return <BatchProcessor onResetWorkflow={handleResetWorkflow} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <div style={{position: 'fixed', top: 0, left: 0, background: 'red', color: 'white', padding: '5px', zIndex: 9999, fontSize: '12px', fontWeight: 'bold'}}>DEBUG: NEW VERSION LOADED</div>
      <Header view={view} setView={setView} />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center max-w-6xl w-full">
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
};