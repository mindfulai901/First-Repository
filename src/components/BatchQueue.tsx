
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { BatchJob, VoiceSettings } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { generateVoiceover } from '../services/elevenLabsService';

interface BatchQueueProps {
    paragraphsPerChunk: number;
    modelId: string;
    voiceId: string;
    voiceSettings: VoiceSettings;
    onBack: () => void;
    onResetWorkflow: () => void;
}

const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 15l-4-4m0 0l4-4m-4 4h12" /></svg>;
const Spinner = () => <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[var(--color-primary)]"></div>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
const ErrorIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;

const BatchQueue: React.FC<BatchQueueProps> = (props) => {
    const { user } = useAuth();
    const [jobs, setJobs] = useState<BatchJob[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    }, [user]);

    const handleFileChange = (files: FileList | null) => {
        if (!files || !user) return;
        setIsUploading(true);
        setError(null);
        
        const filePromises = Array.from(files).map(file => {
            return new Promise<{ name: string, content: string }>((resolve, reject) => {
                if (file.type !== 'text/plain') {
                    return reject(new Error(`File ${file.name} is not a .txt file.`));
                }
                const reader = new FileReader();
                reader.onload = (e) => resolve({ name: file.name, content: e.target?.result as string });
                reader.onerror = (e) => reject(new Error(`Failed to read file ${file.name}`));
                reader.readAsText(file);
            });
        });

        Promise.all(filePromises).then(async (fileContents) => {
            const newJobs: Omit<BatchJob, 'id' | 'created_at'>[] = fileContents.map(fc => ({
                user_id: user.id,
                script_content: fc.content,
                original_filename: fc.name,
                status: 'queued',
                voice_id: props.voiceId,
                model_id: props.modelId,
                paragraphs_per_chunk: props.paragraphsPerChunk,
                voice_settings: props.voiceSettings,
            }));

            const { data, error: insertError } = await supabase.from('batch_jobs').insert(newJobs).select();

            if (insertError) {
                setError(insertError.message);
            } else {
                setJobs(prev => [...prev, ...data as BatchJob[]]);
            }
        }).catch(err => {
            setError(err.message);
        }).finally(() => {
            setIsUploading(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        });
    };

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
        if (textChunks.length === 0) {
            throw new Error("Script is empty or could not be split.");
        }
        
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
        
        const { error: uploadError } = await supabase.storage.from('batch_audio').upload(fileName, combinedBlob);
        if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage.from('batch_audio').getPublicUrl(fileName);
        if (!publicUrl) throw new Error('Could not get public URL.');
        
        return publicUrl;

    }, [user]);

    const startProcessing = useCallback(async () => {
        setIsProcessing(true);
        const queuedJobs = jobs.filter(j => j.status === 'queued');

        for (const job of queuedJobs) {
            try {
                // Set status to processing
                setJobs(prev => prev.map(j => j.id === job.id ? {...j, status: 'processing'} : j));
                const { error: updateError } = await supabase.from('batch_jobs').update({ status: 'processing' }).eq('id', job.id);
                if (updateError) throw updateError;
                
                const finalUrl = await processSingleJob(job);
                
                // Set status to completed
                const { data: updatedJob, error: completeError } = await supabase.from('batch_jobs').update({ status: 'completed', final_audio_url: finalUrl }).eq('id', job.id).select().single();
                if (completeError) throw completeError;
                setJobs(prev => prev.map(j => j.id === job.id ? updatedJob as BatchJob : j));

            } catch(err) {
                const message = err instanceof Error ? err.message : "An unknown error occurred.";
                const { data: errorJob, error: dbError } = await supabase.from('batch_jobs').update({ status: 'error', error_message: message }).eq('id', job.id).select().single();
                if(dbError) console.error("Failed to update job status to error:", dbError);
                if(errorJob) setJobs(prev => prev.map(j => j.id === job.id ? errorJob as BatchJob : j));
            }
        }
        setIsProcessing(false);
    }, [jobs, processSingleJob]);

    const handleClearCompleted = async () => {
        const completedJobs = jobs.filter(j => j.status === 'completed');
        if (completedJobs.length === 0) return;

        const { error } = await supabase.from('batch_jobs').delete().in('id', completedJobs.map(j => j.id));
        if (error) {
            setError(error.message);
        } else {
            setJobs(jobs.filter(j => j.status !== 'completed'));
        }
    };
    
    return (
        <div className="space-y-6">
            <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFileChange(e.dataTransfer.files); }}
                className="border-4 border-dashed border-gray-400 rounded-lg p-8 text-center cursor-pointer hover:border-gray-600 transition-colors"
                onClick={() => fileInputRef.current?.click()}
            >
                <input type="file" multiple accept=".txt" ref={fileInputRef} onChange={(e) => handleFileChange(e.target.files)} className="hidden" />
                <UploadIcon />
                <p className="mt-2 font-bold">Drag & Drop .txt files here</p>
                <p className="text-sm text-gray-500">or click to browse</p>
                {isUploading && <p className="mt-2 text-sm text-blue-600">Uploading...</p>}
            </div>

            {error && <p className="text-base text-[var(--color-error-text)] text-center">{error}</p>}
            
            <div className="max-h-72 overflow-y-auto space-y-3 pr-2 border-2 border-gray-300 p-3 rounded-lg bg-gray-50/50">
                {jobs.length === 0 && <p className="text-center text-gray-500 py-4">Your batch queue is empty. Upload some files to get started.</p>}
                {jobs.map(job => (
                    <div key={job.id} className="p-3 bg-white rounded-lg flex items-center gap-4 border-2 border-gray-400">
                        <div className="flex-shrink-0 w-8 text-center">
                            {job.status === 'processing' && <Spinner />}
                            {job.status === 'completed' && <CheckIcon />}
                            {job.status === 'error' && <ErrorIcon />}
                        </div>
                        <div className="flex-grow">
                            <p className="font-bold truncate">{job.original_filename}</p>
                            {job.status === 'processing' && job.progress && <p className="text-sm text-gray-500">Generating chunk {job.progress.current} of {job.progress.total}...</p>}
                            {job.status === 'error' && <p className="text-sm text-red-600 truncate">{job.error_message}</p>}
                            {job.status === 'completed' && <audio controls src={job.final_audio_url || ''} className="w-full max-w-xs h-8 mt-1"></audio>}
                        </div>
                        <div className="flex-shrink-0">
                            {job.status === 'completed' && <a href={job.final_audio_url || '#'} download={job.original_filename.replace('.txt', '.mp3')} className="hand-drawn-button flex items-center justify-center p-2"><DownloadIcon /></a>}
                            {(job.status === 'error' || job.status === 'queued') && <span className="text-sm font-semibold capitalize px-2 py-1 rounded-full bg-gray-200 text-gray-700">{job.status}</span>}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row-reverse gap-4 pt-4 border-t-2 border-gray-300">
                <button onClick={startProcessing} disabled={isProcessing || jobs.filter(j => j.status === 'queued').length === 0} className="w-full hand-drawn-button text-2xl font-bold py-3">
                    {isProcessing ? 'Processing...' : `Start Batch (${jobs.filter(j => j.status === 'queued').length})`}
                </button>
                <button onClick={handleClearCompleted} disabled={isProcessing || jobs.filter(j => j.status === 'completed').length === 0} className="w-full hand-drawn-button bg-yellow-500 text-2xl font-bold py-3">
                    Clear Completed
                </button>
                 <button onClick={props.onBack} className="w-full hand-drawn-button bg-[var(--color-secondary)] text-[var(--color-secondary-text)] text-2xl font-bold py-3">
                    Back to Config
                </button>
            </div>
             <div className="text-center">
                <button onClick={props.onResetWorkflow} className="text-base text-gray-500 hover:text-gray-800 hover:underline">
                    Start over with new settings
                </button>
            </div>
        </div>
    );
};

export default BatchQueue;
