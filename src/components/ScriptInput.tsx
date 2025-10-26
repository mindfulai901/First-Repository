import React, { useState, useRef } from 'react';

interface ScriptInputProps {
  script: string;
  setScript: (script: string) => void;
  onFilesChange: (files: File[]) => void;
  setMode: (mode: 'single' | 'batch') => void;
  onNext: () => void;
}

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>;
const TextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm1 4a1 1 0 000 2h5a1 1 0 100-2H5zm7 0a1 1 0 000 2h2a1 1 0 100-2h-2z" clipRule="evenodd" /></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 15l-4-4m0 0l4-4m-4 4h12" /></svg>;

const ScriptInput: React.FC<ScriptInputProps> = ({ script, setScript, onFilesChange, setMode, onNext }) => {
    const [localMode, setLocalMode] = useState<'single' | 'batch'>('single');
    const [stagedFiles, setStagedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleNextClick = () => {
        setMode(localMode);
        onNext();
    };
    
    const handleFileDrop = (files: FileList | null) => {
      if (!files) return;
      const textFiles = Array.from(files).filter(file => file.type === 'text/plain');
      setStagedFiles(textFiles);
      onFilesChange(textFiles);
    };

    const isNextDisabled = localMode === 'single' ? script.trim().length === 0 : stagedFiles.length === 0;

    return (
        <div className="w-full max-w-4xl p-8 space-y-6 scroll-container relative">
            <div className="absolute top-4 right-4 z-10">
                <button 
                    onClick={() => setLocalMode(localMode === 'single' ? 'batch' : 'single')}
                    className="p-2 rounded-full bg-[var(--color-secondary)] text-[var(--color-secondary-text)] hover:bg-[var(--color-secondary-hover)] hand-drawn-button"
                    aria-label={localMode === 'single' ? 'Switch to batch upload' : 'Switch to single script'}
                >
                    {localMode === 'single' ? <PlusIcon /> : <TextIcon />}
                </button>
            </div>

            <div className="text-center">
                <h2 className="text-4xl font-bold">Step 1: Provide Source</h2>
                <p className="mt-2 text-lg text-[var(--color-text-muted)]">
                    {localMode === 'single' 
                        ? "Paste the text you want to convert into a voiceover." 
                        : "Upload one or more .txt files for batch processing."}
                </p>
            </div>

            {localMode === 'single' ? (
                <textarea
                    className="w-full h-64 p-4 themed-input rounded-lg resize-none text-lg"
                    style={{boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.1)'}}
                    placeholder="Once upon a time, in a land far, far away..."
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                />
            ) : (
                <div 
                    className="h-64 flex flex-col items-center justify-center border-4 border-dashed border-gray-400 rounded-lg p-8 text-center cursor-pointer hover:border-[var(--color-primary)] transition-colors bg-[var(--color-accent-bg-translucent)]"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleFileDrop(e.dataTransfer.files); }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input type="file" multiple accept=".txt" ref={fileInputRef} onChange={(e) => handleFileDrop(e.target.files)} className="hidden" />
                    <UploadIcon />
                    {stagedFiles.length === 0 ? (
                        <>
                            <p className="mt-2 font-bold">Drag & Drop .txt files here</p>
                            <p className="text-sm text-[var(--color-text-muted)]">or click to browse</p>
                        </>
                    ) : (
                        <p className="mt-2 font-bold">{stagedFiles.length} file(s) selected</p>
                    )}
                </div>
            )}
            
            <button
                onClick={handleNextClick}
                disabled={isNextDisabled}
                className="w-full flex justify-center py-3 px-4 rounded-md text-2xl font-bold hand-drawn-button"
            >
                Next: Set Paragraphs per File
            </button>
        </div>
    );
};

export default ScriptInput;
