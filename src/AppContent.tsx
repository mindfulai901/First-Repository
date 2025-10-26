
import React, { useState, useEffect } from 'react';
import Configurator from './components/Configurator';
import SavedVoices from './components/SavedVoices';
import ParagraphCountInput from './components/WordCountInput';
import ModelSelector from './components/ModelSelector';
import Instructions from './components/Instructions';
import History from './components/History';
import Login from './components/Login';
import Production from './components/Production';
import type { SavedVoice, VoiceSettings, HistoryItem } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './supabaseClient';
import { useLocalStorage } from './hooks/useLocalStorage';

type Step = 'paragraphCount' | 'modelSelection' | 'config' | 'savedVoices' | 'production';
type View = 'app' | 'instructions' | 'history';

export const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('paragraphCount');
  const [view, setView] = useState<View>('app');
  
  const [modelId, setModelId] = useLocalStorage<string>('elevenLabsModelId', 'eleven_multilingual_v2');
  const [savedVoices, setSavedVoices] = useState<SavedVoice[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const [paragraphsPerChunk, setParagraphsPerChunk] = useState<number>(1);
  const [voiceId, setVoiceId] = useState<string>('');
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    stability: 0.75,
    similarity_boost: 0.75,
    style: 0.5,
    use_speaker_boost: true,
    speed: 1.0,
  });

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
    setVoiceId('');
    setParagraphsPerChunk(1);
    setStep('paragraphCount');
    setView('app');
  }

  const renderContent = () => {
    if (!user) {
      return <Login />;
    }

    if (view === 'instructions') return <Instructions onBack={() => setView('app')} />;
    if (view === 'history') return <History history={history} setHistory={setHistory} onBack={() => setView('app')} />;

    switch (step) {
      case 'paragraphCount':
        return <ParagraphCountInput paragraphsPerChunk={paragraphsPerChunk} setParagraphsPerChunk={setParagraphsPerChunk} onNext={() => setStep('modelSelection')} />;
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
            onNext={() => setStep('production')}
            onBack={() => setStep('modelSelection')}
            onShowSaved={() => setStep('savedVoices')}
            savedVoices={savedVoices}
            setSavedVoices={setSavedVoices}
          />
        );
      case 'savedVoices':
        return <SavedVoices savedVoices={savedVoices} onSelectVoice={handleSelectSavedVoice} setSavedVoices={setSavedVoices} onBack={() => setStep('config')} />;
      case 'production':
        return <Production 
                    paragraphsPerChunk={paragraphsPerChunk}
                    modelId={modelId}
                    voiceId={voiceId}
                    voiceSettings={voiceSettings}
                    onBack={() => setStep('config')}
                    onHistoryCreated={(newItem) => setHistory(prev => [newItem, ...prev])}
                    onResetWorkflow={handleResetWorkflow}
                />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <Header view={view} setView={setView} />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center max-w-6xl w-full">
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
};
