
import React, { useState, useCallback } from 'react';
import type { VoiceSettings, HistoryItem, BatchJob } from '../types';
import { generateVoiceover } from '../services/elevenLabsService';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import ResultsDisplay from './ResultsDisplay';
import BatchQueue from './BatchQueue';

interface ProductionProps {
    paragraphsPerChunk: number;
    modelId: string;
    voiceId: string;
    voiceSettings: VoiceSettings;
    onBack: () => void;
    onHistoryCreated: (item: HistoryItem) => void;
    onResetWorkflow: () => void;
}

type Mode = 'single' | 'batch';

const Production: React.FC<ProductionProps> = (props) => {
    const { user } = useAuth();
    const [mode, setMode] = useState<Mode>('single');
    const [script, setScript] = useState<string>('');

    // State for single generation
    const [audioFiles, setAudioFiles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
    const [showResults, setShowResults] = useState<boolean>(false);

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

    const handleSingleGenerate = useCallback(async () => {
        if (!props.voiceId || !props.modelId || !user) {
            setError("A voice and model must be selected, and you must be logged in.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setAudioFiles([]);
        setShowResults(true);

        const textChunks = splitScriptByParagraphs(script, props.paragraphsPerChunk);
        if (textChunks.length === 0) {
            setError("Your script is empty or could not be split into paragraphs.");
            setIsLoading(false);
            return;
        }
        
        const collectedAudioResults: any[] = [];
        let previousRequestId: string | undefined = undefined;

        try {
            for (let i = 0; i < textChunks.length; i++) {
                const chunk = textChunks[i];
                setProgress({ current: i + 1, total: textChunks.length });

                const result = await generateVoiceover(chunk, props.voiceId, props.voiceSettings, props.modelId, previousRequestId);
                
                const audioUrl = URL.createObjectURL(result.blob);
                collectedAudioResults.push({ id: i + 1, audioUrl, blob: result.blob });
                setAudioFiles(prev => [...prev, { id: i + 1, audioUrl, blob: result.blob }]);
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
                
                props.onHistoryCreated(insertedItem as HistoryItem);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
            setProgress(null);
        }
    }, [script, user, props]);

    const handleResetSingle = () => {
        setScript('');
        setAudioFiles([]);
        setError(null);
        setIsLoading(false);
        setShowResults(false);
    };

    if (showResults) {
        return <ResultsDisplay audioFiles={audioFiles} isLoading={isLoading} error={error} onReset={handleResetSingle} progress={progress} />;
    }

    return (
        <div className="w-full max-w-4xl p-8 space-y-6 scroll-container">
            <div className="text-center">
                <h2 className="text-4xl font-bold">Step 4: Production</h2>
                <p className="mt-2 text-lg text-gray-600">Provide your script(s) to start the generation process.</p>
            </div>

            <div className="flex justify-center border-b-4 border-[var(--color-border)] mb-4">
                <button onClick={() => setMode('single')} className={`w-1/2 py-3 text-2xl font-bold hand-drawn-tab ${mode === 'single' ? 'active' : ''}`}>
                    Single Script
                </button>
                <button onClick={() => setMode('batch')} className={`w-1/2 py-3 text-2xl font-bold hand-drawn-tab ${mode === 'batch' ? 'active' : ''}`}>
                    Batch Production
                </button>
            </div>
            
            {mode === 'single' ? (
                <div className="space-y-6">
                    <div>
                        <label className="block text-xl font-bold mb-2 text-center">Enter your script below</label>
                         <textarea
                            className="w-full h-60 p-4 themed-input rounded-lg resize-none text-lg"
                            placeholder="Once upon a time..."
                            value={script}
                            onChange={(e) => setScript(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row-reverse gap-4 pt-4 border-t-2 border-gray-300">
                        <button onClick={handleSingleGenerate} disabled={!script.trim()} className="w-full hand-drawn-button text-2xl font-bold py-3">
                            Generate Voiceover
                        </button>
                         <button onClick={props.onBack} className="w-full hand-drawn-button bg-[var(--color-secondary)] text-[var(--color-secondary-text)] text-2xl font-bold py-3">
                            Back to Config
                        </button>
                    </div>
                </div>
            ) : (
                <BatchQueue {...props} />
            )}
        </div>
    );
};

export default Production;
