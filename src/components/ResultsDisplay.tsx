import React, { useState, useEffect, useRef } from 'react';
import type { AudioResult, BatchJob } from '../types';
import { useZip } from '../hooks/useZip';

// --- ICONS --- //
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const Spinner = () => <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[var(--color-primary)]"></div>;
const ItemSpinner = () => <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[var(--color-primary)]"></div>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
const ErrorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const QueueIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>;

const loadingMessages = [
  "Warming up the vocal cords...", "Synthesizing speech patterns...", "Composing audio chunks...", "Adding the final touches...", "Almost ready!"
];

// --- PROPS --- //
interface ResultsDisplayProps {
  mode: 'single' | 'batch';
  audioFiles: AudioResult[];
  batchJobs: BatchJob[];
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

// --- BATCH JOB ITEM --- //
const BatchResultItem: React.FC<{ job: BatchJob }> = ({ job }) => {
  const getStatusIcon = () => {
    switch (job.status) {
      case 'processing': return <ItemSpinner />;
      case 'completed': return <CheckIcon />;
      case 'error': return <ErrorIcon />;
      case 'queued': return <QueueIcon />;
      default: return null;
    }
  };

  return (
     <div className="p-3 bg-white/80 rounded-lg flex flex-col sm:flex-row items-center gap-4 border-2 border-gray-400">
      <div className="flex-shrink-0 w-8 text-center">{getStatusIcon()}</div>
      <div className="flex-grow min-w-0 w-full">
        <p className="font-bold truncate text-lg" title={job.original_filename}>{job.original_filename}</p>
        {job.status === 'processing' && job.progress && (
          <div className="w-full pt-1">
            <div className="w-full bg-[var(--color-secondary)] rounded-full h-2.5 border border-[var(--color-border)]">
              <div className="bg-[var(--color-primary)] h-full rounded-full" style={{ width: `${(job.progress.current / job.progress.total) * 100}%` }}></div>
            </div>
          </div>
        )}
        {job.status === 'error' && <p className="text-sm text-red-600 truncate" title={job.error_message || ''}>{job.error_message}</p>}
        {job.status === 'completed' && <audio controls src={job.final_audio_url || ''} className="w-full max-w-xs h-8 mt-1"></audio>}
      </div>
      <div className="flex-shrink-0">
        {job.status === 'completed' && (
          <a href={job.final_audio_url || '#'} download={job.original_filename.replace('.txt', '.mp3')} className="hand-drawn-button flex items-center justify-center p-2">
            <DownloadIcon />
          </a>
        )}
      </div>
    </div>
  )
};

// --- MAIN COMPONENT --- //
const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ mode, audioFiles, batchJobs, isLoading, error, onReset, progress }) => {
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
  
  const handleDownloadAllBatch = async () => {
    const completedJobs = batchJobs.filter(j => j.status === 'completed' && j.final_audio_url);
    if(completedJobs.length === 0) return;

    const filesToZip = await Promise.all(completedJobs.map(async (job) => {
      const response = await fetch(job.final_audio_url!);
      const blob = await response.blob();
      return { name: job.original_filename.replace('.txt', '.mp3'), data: blob };
    }));
    createAndDownloadZip(filesToZip, 'batch_voiceovers');
  };

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

  return (
    <div className="w-full max-w-5xl p-4 sm:p-8 space-y-6 scroll-container">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b-2 border-[var(--color-border)] pb-4">
        <div>
          <h2 className="text-4xl font-bold">Generation Results</h2>
          <p className="mt-1 text-lg text-[var(--color-text-muted)]">
            {mode === 'single' ? "Preview the full voiceover, or play and download the chunks below." : "Your batch job results are below. Download files as they complete."}
          </p>
        </div>
        <button onClick={onReset} className="w-full md:w-auto py-2 px-6 bg-[var(--color-secondary)] text-[var(--color-secondary-text)] rounded-md font-bold transition-colors flex-shrink-0 text-lg hand-drawn-button">Start Over</button>
      </div>

      {mode === 'single' ? (
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
      ) : (
        <>
          <div className="p-4 rounded-lg border-2 border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4" style={{backgroundColor: 'var(--color-scroll-container-bg-translucent)'}}>
            <p className="font-bold text-lg text-[var(--color-text)]">Batch Jobs ({batchJobs.filter(j=>j.status === 'completed').length}/{batchJobs.length} Completed)</p>
            <button onClick={handleDownloadAllBatch} disabled={isZipping || batchJobs.filter(j=>j.status === 'completed').length === 0} className="flex items-center justify-center py-2 px-5 rounded-md text-base font-bold hand-drawn-button w-full sm:w-auto">
              <DownloadIcon /><span className="ml-2">{isZipping ? 'Zipping...' : 'Download Completed'}</span>
            </button>
          </div>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {batchJobs.map(job => <BatchResultItem key={job.id} job={job} />)}
            {batchJobs.length === 0 && <p className="text-center py-8 text-lg text-[var(--color-text-muted)]">Batch jobs will appear here as they are created...</p>}
          </div>
        </>
      )}
    </div>
  );
};

export default ResultsDisplay;