import React, { useState, useEffect, useCallback } from 'react';
import type { BatchJob } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { generateVoiceover } from '../services/elevenLabsService';

interface BatchProcessorProps {
    onResetWorkflow: () => void;
}

const Spinner = () => <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[var(--color-primary)]"></div>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
const ErrorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;

const BatchProcessor: React.FC<BatchProcessorProps> = ({ onResetWorkflow }) => {
    const { user } = useAuth();
    const [jobs, setJobs] = useState<BatchJob[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        
        const fetchJobs = async () => {
            const { data, error } = await supabase
                .from('batch_jobs')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });
            if (error) {
                setError(`Failed to fetch jobs: ${error.message}`);
            } else {
                setJobs(data as BatchJob[]);
            }
        };
        fetchJobs();

        const channel = supabase.channel('batch_jobs_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'batch_jobs', filter: `user_id=eq.${user.id}` }, 
            (payload) => {
                const updatedJob = payload.new as BatchJob;
                setJobs(currentJobs => {
                    const jobExists = currentJobs.some(j => j.id === updatedJob.id);
                    if (jobExists) {
                        return currentJobs.map(j => j.id === updatedJob.id ? updatedJob : j);
                    }
                    return [...currentJobs, updatedJob];
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const processSingleJob = useCallback(async (job: BatchJob) => {
        if(!user) return;

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

        const textChunks = splitScriptByParagraphs(job.script_content, job.paragraphs_per_chunk);
        if (textChunks.length === 0) throw new Error("Script is empty.");
        
        const collectedBlobs: Blob[] = [];
        let previousRequestId: string | undefined = undefined;

        for (let i = 0; i < textChunks.length; i++) {
            setJobs(prev => prev.map(j => j.id === job.id ? {...j, progress: { current: i + 1, total: textChunks.length }} : j));
            const result = await generateVoiceover(textChunks[i], job.voice_id, job.voice_settings, job.model_id, previousRequestId);
            collectedBlobs.push(result.blob);
            previousRequestId = result.requestId;
        }

        const combinedBlob = new Blob(collectedBlobs, { type: 'audio/mpeg' });
        const fileName = `${user.id}/${job.id}.mp3`;
        
        const { error: uploadError } = await supabase.storage.from('batch_audio').upload(fileName, combinedBlob, { upsert: true });
        if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage.from('batch_audio').getPublicUrl(fileName);
        if (!publicUrl) throw new Error('Could not get public URL.');
        
        return publicUrl;

    }, [user]);

    const startProcessing = useCallback(async () => {
        setIsProcessing(true);
        setError(null);
        const queuedJobs = jobs.filter(j => j.status === 'queued');

        for (const job of queuedJobs) {
            try {
                await supabase.from('batch_jobs').update({ status: 'processing' }).eq('id', job.id);
                const finalUrl = await processSingleJob(job);
                await supabase.from('batch_jobs').update({ status: 'completed', final_audio_url: finalUrl }).eq('id', job.id);
            } catch(err) {
                const message = err instanceof Error ? err.message : "An unknown error occurred.";
                await supabase.from('batch_jobs').update({ status: 'error', error_message: message }).eq('id', job.id);
            }
        }
        setIsProcessing(false);
    }, [jobs, processSingleJob]);

    const handleClearAll = async () => {
        if(!user) return;
        if (!window.confirm("Are you sure you want to delete all jobs in the queue? This cannot be undone.")) return;

        const jobIds = jobs.map(j => j.id);
        const audioPaths = jobs.map(j => `${user.id}/${j.id}.mp3`);

        if (audioPaths.length > 0) {
            const { error: storageError } = await supabase.storage.from('batch_audio').remove(audioPaths);
            if(storageError) setError(`Could not clear audio files: ${storageError.message}`);
        }
        
        const { error } = await supabase.from('batch_jobs').delete().in('id', jobIds);
        if (error) {
            setError(`Could not clear jobs: ${error.message}`);
        } else {
            setJobs([]);
        }
    };
    
    return (
        <div className="w-full max-w-4xl p-8 space-y-6 scroll-container">
            <div className="text-center">
                <h2 className="text-4xl font-bold">Batch Processor</h2>
                <p className="mt-2 text-lg text-[var(--color-text-muted)]">Your uploaded scripts will be processed here.</p>
            </div>
            
            {error && <p className="text-base text-[var(--color-error-text)] text-center">{error}</p>}
            
            <div className="max-h-80 overflow-y-auto space-y-3 pr-2 border-2 border-gray-300 p-3 rounded-lg bg-gray-50/50">
                {jobs.length === 0 && <p className="text-center text-gray-500 py-4">Your batch queue is empty.</p>}
                {jobs.map(job => (
                    <div key={job.id} className="p-3 bg-white rounded-lg flex items-center gap-4 border-2 border-gray-400">
                        <div className="flex-shrink-0 w-8 text-center">
                            {job.status === 'processing' && <Spinner />}
                            {job.status === 'completed' && <CheckIcon />}
                            {job.status === 'error' && <ErrorIcon />}
                        </div>
                        <div className="flex-grow min-w-0">
                            <p className="font-bold truncate" title={job.original_filename}>{job.original_filename}</p>
                            {job.status === 'processing' && job.progress && <p className="text-sm text-gray-500">Generating chunk {job.progress.current} of {job.progress.total}...</p>}
                            {job.status === 'error' && <p className="text-sm text-red-600 truncate" title={job.error_message || ''}>{job.error_message}</p>}
                            {job.status === 'completed' && <audio controls src={job.final_audio_url || ''} className="w-full max-w-xs h-8 mt-1"></audio>}
                        </div>
                        <div className="flex-shrink-0">
                            {job.status === 'completed' && <a href={job.final_audio_url || '#'} download={job.original_filename.replace('.txt', '.mp3')} className="hand-drawn-button flex items-center justify-center p-2"><DownloadIcon /></a>}
                            {(job.status !== 'completed') && <span className="text-sm font-semibold capitalize px-2 py-1 rounded-full bg-gray-200 text-gray-700">{job.status}</span>}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t-2 border-gray-300">
                <button onClick={startProcessing} disabled={isProcessing || jobs.filter(j => j.status === 'queued').length === 0} className="w-full hand-drawn-button text-xl font-bold py-3">
                    {isProcessing ? 'Processing...' : `Start Batch (${jobs.filter(j => j.status === 'queued').length})`}
                </button>
                <button onClick={handleClearAll} disabled={isProcessing || jobs.length === 0} className="w-full hand-drawn-button bg-yellow-500 text-xl font-bold py-3">
                    Clear All Jobs
                </button>
            </div>
             <div className="text-center">
                <button onClick={onResetWorkflow} className="text-base text-gray-500 hover:text-gray-800 hover:underline">
                    Start a New Project
                </button>
            </div>
        </div>
    );
};

export default BatchProcessor;
