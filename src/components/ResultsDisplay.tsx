import React, { useState, useEffect, useRef } from 'react';
import type { AudioResult } from '../types';
import { useZip } from '../hooks/useZip';

// --- ICONS --- //
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const Spinner = () => <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[var(--color-primary)]"></div>;

const loadingMessages = [
  "Warming up the vocal cords...", "Synthesizing speech patterns...", "Composing audio chunks...", "Adding the final touches...", "Almost ready!"
];

// --- PROPS --- //
interface ResultsDisplayProps {
  mode: 'single' | 'batch';
  audioFiles: AudioResult[];
  batchJobs: []; // No longer used here, handled by BatchProcessor
  isLoading: boolean;
  error: string | null;
  onReset: () => void;
  progress: { current: number; total: number } | null;
}

// --- SINGLE AUDIO CHUNK ITEM --- //
const AudioResultItem: React.FC<{ item: AudioResult }> = ({ item }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = item.audioUrl;
    link.download = `voiceover_chunk_${item.id}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };
  
  return (
    <div className="p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-[var(--color-border)]" style={{backgroundColor: 'var(--color-scroll-container-bg-translucent)'}}>
      <p className="font-bold text-xl text-[var(--color-primary)] flex-shrink-0">Chunk #{item.id}</p>
      <audio controls src={item.audioUrl} className="w-full sm:w-auto flex-grow"></audio>
      <button onClick={handleDownload} className="flex items-center justify-center py-2 px-3 rounded-md text-sm font-bold bg-[var(--color-secondary)] text-[var(--color-secondary-text)] hand-drawn-button w-full sm:w-auto" aria-label={`Download audio chunk ${item.id}`}>
        <DownloadIcon /><span className="ml-2">Download</span>
      </button>
    </div>
  );
};


// --- MAIN COMPONENT --- //
const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ mode, audioFiles, isLoading, error, onReset, progress }) => {
  const { createAndDownloadZip, isZipping } = useZip();
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [combinedAudioUrl, setCombinedAudioUrl] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const mainAudioRef = useRef<HTMLAudioElement>(null);
  const playbackSpeeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % loadingMessages.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  useEffect(() => {
    if (mode === 'single' && audioFiles.length > 0) {
      const combinedBlob = new Blob(audioFiles.map(f => f.blob), { type: 'audio/mpeg' });
      const url = URL.createObjectURL(combinedBlob);
      setCombinedAudioUrl(url);
      return () => { if (url) URL.revokeObjectURL(url); };
    } else {
      setCombinedAudioUrl(null);
    }
  }, [audioFiles, mode]);

  useEffect(() => {
    if (mainAudioRef.current) mainAudioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  const handleDownloadAllSingle = () => createAndDownloadZip(audioFiles.map(f => ({ name: `voiceover_chunk_${f.id}.mp3`, data: f.blob })), 'all_voiceovers');
  
  const handleDownloadFullClip = () => {
    if (!combinedAudioUrl) return;
    const link = document.createElement('a');
    link.href = combinedAudioUrl;
    link.download = `voiceover_full_clip.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    const progressPercentage = progress ? (progress.current / progress.total) * 100 : 0;
    return (
      <div className="text-center p-8 space-y-6 w-full max-w-2xl scroll-container">
        <Spinner />
        <h2 className="text-3xl font-bold">Generating Voiceovers...</h2>
        <p className="text-[var(--color-text-muted)] text-lg transition-opacity duration-500">{loadingMessages[loadingMessageIndex]}</p>
        {progress && (
          <div className="w-full pt-2">
            <div className="w-full bg-[var(--color-secondary)] rounded-full h-5 border-2 border-[var(--color-border)] shadow-inner">
              <div className="bg-[var(--color-primary)] h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
            </div>
            <p className="text-center text-[var(--color-text)] mt-2 text-lg font-bold">Generated {progress.current} of {progress.total} clips</p>
          </div>
        )}
      </div>
    );
  }

  if (error) {
     return (
      <div className="w-full max-w-3xl text-center">
        <div className="p-8 space-y-4 border-4 border-black relative rounded-lg" style={{ backgroundColor: 'var(--color-error-bg)', borderTop: '2rem solid var(--color-scroll-ends-bg)', borderBottom: '2rem solid var(--color-scroll-ends-bg)', boxShadow: '8px 8px 0px var(--shadow-color)' }}>
            <h2 className="text-4xl font-bold" style={{color: 'var(--color-error-text)'}}>An Error Occurred</h2>
            <p className="mt-4 text-lg whitespace-pre-wrap" style={{color: 'var(--color-error-text)'}}>{error}</p>
            <button onClick={onReset} className="mt-6 py-3 px-8 text-white rounded-md font-bold text-xl hand-drawn-button" style={{backgroundColor: 'var(--color-error-border)', borderColor: 'var(--color-border)'}}>Start Over</button>
        </div>
      </div>
    );
  }

  if (mode === 'batch') {
    // Batch UI is now handled by BatchProcessor component, this is a fallback.
    return (
      <div className="w-full max-w-5xl p-4 sm:p-8 space-y-6 scroll-container">
        <div className="text-center">
          <h2 className="text-4xl font-bold">Batch Processing</h2>
          <p className="mt-2 text-lg text-[var(--color-text-muted)]">Batch processing is handled in a dedicated view.</p>
          <button onClick={onReset} className="mt-6 py-3 px-8 text-white rounded-md font-bold text-xl hand-drawn-button">Start Over</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl p-4 sm:p-8 space-y-6 scroll-container">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b-2 border-[var(--color-border)] pb-4">
        <div>
          <h2 className="text-4xl font-bold">Generation Results</h2>
          <p className="mt-1 text-lg text-[var(--color-text-muted)]">
            Preview the full voiceover, or play and download the chunks below.
          </p>
        </div>
        <button onClick={onReset} className="w-full md:w-auto py-2 px-6 bg-[var(--color-secondary)] text-[var(--color-secondary-text)] rounded-md font-bold transition-colors flex-shrink-0 text-lg hand-drawn-button">Start Over</button>
      </div>

        <>
          {combinedAudioUrl && audioFiles.length > 0 && (
            <div className="p-4 rounded-lg border-2 border-[var(--color-border)]" style={{backgroundColor: 'var(--color-scroll-container-bg-translucent)'}}>
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-2">
                <h3 className="text-xl font-bold">Full Voiceover Preview</h3>
                <button onClick={handleDownloadFullClip} className="flex items-center justify-center py-2 px-3 rounded-md text-sm font-bold bg-[var(--color-secondary)] text-[var(--color-secondary-text)] hand-drawn-button" aria-label="Download full voiceover clip">
                    <DownloadIcon /><span className="ml-2">Download Full Clip</span>
                </button>
              </div>
              <audio ref={mainAudioRef} controls src={combinedAudioUrl} className="w-full"></audio>
              <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                <span className="font-bold text-[var(--color-text-muted)] text-base">Speed:</span>
                {playbackSpeeds.map(speed => (
                    <button key={speed} onClick={() => setPlaybackRate(speed)} className={`px-3 py-1 text-sm font-bold rounded-md transition-colors hand-drawn-button ${playbackRate === speed ? 'bg-[var(--color-primary)] text-[var(--color-primary-text)]' : 'bg-[var(--color-secondary)] text-[var(--color-secondary-text)]'}`}>{speed}x</button>
                ))}
              </div>
            </div>
          )}
          <div className="p-4 rounded-lg border-2 border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4" style={{backgroundColor: 'var(--color-scroll-container-bg-translucent)'}}>
            <p className="font-bold text-lg text-[var(--color-text)]">Generated Audio Chunks ({audioFiles.length})</p>
            <button onClick={handleDownloadAllSingle} disabled={isZipping || audioFiles.length === 0} className="flex items-center justify-center py-2 px-5 rounded-md text-base font-bold hand-drawn-button w-full sm:w-auto">
              <DownloadIcon /><span className="ml-2">{isZipping ? 'Zipping...' : 'Download All'}</span>
            </button>
          </div>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
            {audioFiles.map(item => <AudioResultItem key={item.id} item={item} />)}
          </div>
        </>
    </div>
  );
};

export default ResultsDisplay;
