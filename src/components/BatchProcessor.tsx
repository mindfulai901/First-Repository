import React, { useState, useEffect } from 'react';
import type { BatchJob, VoiceSettings, HistoryItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { generateVoiceover } from '../services/elevenLabsService';
import { useZip } from '../hooks/useZip';
import { User } from '@supabase/supabase-js';

// --- ICONS (copied from ResultsDisplay for self-containment) --- //
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
const ItemSpinner = () => <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[var(--color-primary)]"></div>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
const ErrorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const QueueIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>;

// --- PROPS --- //
interface BatchProcessorProps {
  stagedFiles: File[];
  voiceId: string;
  voiceSettings: VoiceSettings;
  modelId: string;
  paragraphsPerChunk: number;
  user: User;
  setHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
  onComplete: () => void;
}

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
            <p className="text-xs text-center text-[var(--color-text-muted)] mt-1">Processing chunk {job.progress.current} of {job.progress.total}</p>
          </div>
        )}
        {job.status === 'error' && <p className="text-sm text-red-600 truncate" title={job.error_message || ''}>{job.error_message}</p>}
        {job.status === 'completed' && <audio controls src={job.final_audio_url || ''} className="w-full max-w-xs h-8 mt-1"></audio>}
      </div>
      <div className="flex-shrink-0">
        {job.status === 'completed' && job.final_audio_url && (
          <a href={job.final_audio_url} download={job.original_filename.replace('.txt', '.mp3')} className="hand-drawn-button flex items-center justify-center p-2">
            <DownloadIcon />
          </a>
        )}
      </div>
    </div>
  )
};

// --- MAIN COMPONENT --- //
const BatchProcessor: React.FC<BatchProcessorProps> = ({ stagedFiles, voiceId, voiceSettings, modelId, paragraphsPerChunk, user, setHistory, onComplete }) => {
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createAndDownloadZip, isZipping } = useZip();

  useEffect(() => {
    const initializeJobs = async () => {
      try {
          const fileReadPromises = stagedFiles.map(file => {
              return new Promise<{ name: string, content: string }>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = (e) => resolve({ name: file.name, content: e.target?.result as string });
                  reader.onerror = (e) => reject(new Error(`Failed to read file ${file.name}: ${e}`));
                  reader.readAsText(file);
              });
          });
          const fileContents = await Promise.all(fileReadPromises);

          const initialJobs: BatchJob[] = fileContents.map(fc => ({
              id: crypto.randomUUID(),
              created_at: new Date().toISOString(),
              script_content: fc.content,
              original_filename: fc.name,
              status: 'queued',
              voice_id: voiceId,
              model_id: modelId,
              paragraphs_per_chunk: paragraphsPerChunk,
              voice_settings: voiceSettings,
          }));
          setBatchJobs(initialJobs);
      } catch (err) {
          setError(err instanceof Error ? `Failed to prepare batch files: ${err.message}` : 'An unknown error occurred.');
      }
    };

    if (stagedFiles.length > 0) {
      initializeJobs();
    }
  }, [stagedFiles, voiceId, voiceSettings, modelId, paragraphsPerChunk]);
  
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

  const handleStartProcessing = async () => {
    setHasStarted(true);
    setError(null);

    for (const job of batchJobs) {
      try {
        setBatchJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'processing' } : j));
        
        const textChunks = splitScriptByParagraphs(job.script_content, job.paragraphs_per_chunk);
        if (textChunks.length === 0) throw new Error("Script file is empty or contains no paragraphs.");

        const collectedBlobs: Blob[] = [];
        let previousRequestId: string | undefined = undefined;

        for (let i = 0; i < textChunks.length; i++) {
            setBatchJobs(prev => prev.map(j => 
                j.id === job.id 
                ? { ...j, progress: { current: i + 1, total: textChunks.length } } 
                : j
            ));
            const result = await generateVoiceover(textChunks[i], job.voice_id, job.voice_settings, job.model_id, previousRequestId);
            collectedBlobs.push(result.blob);
            previousRequestId = result.requestId;
        }
        
        const combinedBlob = new Blob(collectedBlobs, { type: 'audio/mpeg' });
        const safeFileName = job.original_filename.replace(/[^a-z0-9.]/gi, '_');
        const storagePath = `${user.id}/${Date.now()}_${safeFileName.replace('.txt', '.mp3')}`;
        
        const { error: uploadError } = await supabase.storage.from('history_audio').upload(storagePath, combinedBlob);
        if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage.from('history_audio').getPublicUrl(storagePath);
        if (!publicUrl) throw new Error('Could not get public URL for the uploaded file.');

        const newItem: Omit<HistoryItem, 'id'> = {
            user_id: user.id,
            name: job.original_filename.replace('.txt', ''),
            createdAt: new Date().toISOString(),
            audioUrl: publicUrl,
        };
        const { data: insertedItem, error: insertError } = await supabase.from('history').insert(newItem).select().single();
        if (insertError) throw new Error(`Database Error: ${insertError.message}`);
        
        setHistory(prev => [insertedItem as HistoryItem, ...prev]);

        setBatchJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'completed', final_audio_url: publicUrl, progress: null } : j));

      } catch (err) {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        setBatchJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'error', error_message: message, progress: null } : j));
      }
    }
  };
  
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

  const completedCount = batchJobs.filter(j => j.status === 'completed').length;
  const isFinished = hasStarted && batchJobs.every(j => j.status === 'completed' || j.status === 'error');

  if (error) {
     return (
        <div className="w-full max-w-3xl text-center p-8 space-y-4 border-4 border-black rounded-lg bg-[var(--color-error-bg)]">
            <h2 className="text-4xl font-bold text-[var(--color-error-text)]">An Error Occurred</h2>
            <p className="mt-4 text-lg whitespace-pre-wrap text-[var(--color-error-text)]">{error}</p>
            <button onClick={onComplete} className="mt-6 py-3 px-8 text-white rounded-md font-bold text-xl hand-drawn-button bg-[var(--color-error-border)]">Start Over</button>
        </div>
    );
  }

  return (
    <div className="w-full max-w-5xl p-4 sm:p-8 space-y-6 scroll-container">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b-2 border-[var(--color-border)] pb-4">
        <div>
          <h2 className="text-4xl font-bold">Batch Processor</h2>
          <p className="mt-1 text-lg text-[var(--color-text-muted)]">
            {isFinished ? `Processing complete! ${completedCount} files generated.` : hasStarted ? 'Generation in progress...' : `Ready to process ${batchJobs.length} files.`}
          </p>
        </div>
         {!hasStarted ? (
            <button onClick={handleStartProcessing} className="w-full md:w-auto py-3 px-8 rounded-md text-2xl font-bold text-white hand-drawn-button">
              Start Batch Generation
            </button>
         ) : (
            <button onClick={onComplete} className="w-full md:w-auto py-2 px-6 bg-[var(--color-secondary)] text-[var(--color-secondary-text)] rounded-md font-bold transition-colors flex-shrink-0 text-lg hand-drawn-button">Start Over</button>
         )}
      </div>

       <div className="p-4 rounded-lg border-2 border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--color-scroll-container-bg-translucent)]">
            <p className="font-bold text-lg text-[var(--color-text)]">Batch Jobs ({completedCount}/{batchJobs.length} Completed)</p>
            <button onClick={handleDownloadAllBatch} disabled={isZipping || completedCount === 0} className="flex items-center justify-center py-2 px-5 rounded-md text-base font-bold hand-drawn-button w-full sm:w-auto">
              <DownloadIcon /><span className="ml-2">{isZipping ? 'Zipping...' : 'Download Completed'}</span>
            </button>
          </div>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {batchJobs.map(job => <BatchResultItem key={job.id} job={job} />)}
            {batchJobs.length === 0 && !error && <p className="text-center py-8 text-lg text-[var(--color-text-muted)]">Preparing files...</p>}
          </div>
    </div>
  );
};

export default BatchProcessor;
