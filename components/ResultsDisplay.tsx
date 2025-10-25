import React, { useState, useEffect, useRef } from 'react';
import type { AudioResult } from '../types';
import { useZip } from '../hooks/useZip';

const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const Spinner = () => <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#9cb89c]"></div>;

const loadingMessages = [
  "Warming up the vocal cords...",
  "Synthesizing speech patterns...",
  "Composing audio chunks...",
  "Adding the final touches...",
  "Almost ready!"
];

interface ResultsDisplayProps {
  audioFiles: AudioResult[];
  isLoading: boolean;
  error: string | null;
  onReset: () => void;
  progress: { current: number; total: number } | null;
}

const AudioResultItem: React.FC<{
  item: AudioResult
}> = ({ item }) => {
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
    <div className="bg-[#e0f0e0]/50 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-gray-400">
      <p className="font-bold text-xl text-[#6a8b6a] flex-shrink-0">Chunk #{item.id}</p>
      <audio controls src={item.audioUrl} className="w-full sm:w-auto flex-grow"></audio>
      <button onClick={handleDownload} className="flex items-center justify-center py-2 px-3 rounded-md text-sm font-bold text-black bg-[#e0dcd3] hand-drawn-button w-full sm:w-auto" aria-label={`Download audio chunk ${item.id}`}>
        <DownloadIcon />
        <span className="ml-2">Download</span>
      </button>
    </div>
  );
};

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ audioFiles, isLoading, error, onReset, progress }) => {
  const { createAndDownloadZip, isZipping } = useZip();
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [combinedAudioUrl, setCombinedAudioUrl] = useState<string | null>(null);
  const [combinedAudioBlob, setCombinedAudioBlob] = useState<Blob | null>(null);
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
    if (audioFiles.length > 0) {
      const combinedBlob = new Blob(audioFiles.map(f => f.blob), { type: 'audio/mpeg' });
      setCombinedAudioBlob(combinedBlob);
      const url = URL.createObjectURL(combinedBlob);
      setCombinedAudioUrl(url);

      return () => {
        if (url) URL.revokeObjectURL(url);
      };
    } else {
      setCombinedAudioUrl(null);
      setCombinedAudioBlob(null);
    }
  }, [audioFiles]);

  useEffect(() => {
    if (mainAudioRef.current) {
        mainAudioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const handleDownloadAll = () => createAndDownloadZip(audioFiles.map(f => ({ name: `voiceover_chunk_${f.id}.mp3`, data: f.blob })), 'all_voiceovers');

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
        <p className="text-gray-600 text-lg transition-opacity duration-500">{loadingMessages[loadingMessageIndex]}</p>
        
        {progress && (
          <div className="w-full pt-2">
            <div className="w-full bg-gray-300 rounded-full h-5 border-2 border-black shadow-inner">
              <div
                className="bg-[#9cb89c] h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <p className="text-center text-gray-700 mt-2 text-lg font-bold">
                Generated {progress.current} of {progress.total} clips
            </p>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-3xl text-center">
        <div className="p-8 space-y-4 bg-[#ffebee] border-4 border-black relative rounded-lg"
             style={{
                borderTop: '2rem solid #e0e0e0',
                borderBottom: '2rem solid #e0e0e0',
                boxShadow: '8px 8px 0px rgba(0,0,0,0.5)'
             }}
        >
            <h2 className="text-4xl font-bold text-[#c62828]">An Error Occurred</h2>
            <p className="mt-4 text-lg text-[#c62828] whitespace-pre-wrap">{error}</p>
            <button
                onClick={onReset}
                className="mt-6 py-3 px-8 text-white rounded-md font-bold text-xl hand-drawn-button bg-[#e53935] border-black"
            >
                Start Over
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl p-4 sm:p-8 space-y-6 scroll-container">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b-2 border-gray-300 pb-4">
        <div>
          <h2 className="text-4xl font-bold">Generation Complete!</h2>
          <p className="mt-1 text-lg text-gray-600">Preview the full voiceover, or play and download the chunks below.</p>
        </div>
        <button onClick={onReset} className="w-full md:w-auto py-2 px-6 bg-[#e0dcd3] rounded-md font-bold transition-colors flex-shrink-0 text-lg hand-drawn-button">Start Over</button>
      </div>

      {combinedAudioUrl && audioFiles.length > 0 && (
        <div className="p-4 bg-[#e0f0e0]/50 rounded-lg border-2 border-gray-400">
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-2">
            <h3 className="text-xl font-bold">Full Voiceover Preview</h3>
            <button onClick={handleDownloadFullClip} className="flex items-center justify-center py-2 px-3 rounded-md text-sm font-bold text-black bg-[#e0dcd3] hand-drawn-button" aria-label="Download full voiceover clip">
                <DownloadIcon />
                <span className="ml-2">Download Full Clip</span>
            </button>
          </div>
          <audio ref={mainAudioRef} controls src={combinedAudioUrl} className="w-full"></audio>
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            <span className="font-bold text-gray-600 text-base">Speed:</span>
            {playbackSpeeds.map(speed => (
                <button
                    key={speed}
                    onClick={() => setPlaybackRate(speed)}
                    className={`px-3 py-1 text-sm font-bold rounded-md transition-colors hand-drawn-button ${playbackRate === speed ? 'bg-[#6a8b6a] text-white' : 'bg-[#e0dcd3] text-black'}`}
                >
                    {speed}x
                </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="p-4 bg-[#e0f0e0]/50 rounded-lg border-2 border-gray-400 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="font-bold text-lg text-gray-700">Generated Audio Chunks ({audioFiles.length})</p>
        <button onClick={handleDownloadAll} disabled={isZipping || audioFiles.length === 0} className="flex items-center justify-center py-2 px-5 rounded-md text-base font-bold text-white hand-drawn-button w-full sm:w-auto">
          <DownloadIcon />
          <span className="ml-2">{isZipping ? 'Zipping...' : 'Download All'}</span>
        </button>
      </div>
      
      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
        {audioFiles.map(item => (
          <AudioResultItem 
            key={item.id}
            item={item}
          />
        ))}
        {audioFiles.length === 0 && !isLoading && (
          <div className="text-center py-10">
            <p className="text-gray-500">No voiceovers have been generated yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsDisplay;