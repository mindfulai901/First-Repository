import React, { useState, useRef } from 'react';

interface ScriptInputProps {
  script: string;
  setScript: (script: string) => void;
  onFilesChange: (files: File[]) => void;
  mode: 'single' | 'batch';
  setMode: (mode: 'single' | 'batch') => void;
  onNext: () => void;
}

const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[var(--color-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 15l-4-4m0 0l4-4m-4 4h12" /></svg>;

const ScriptInput: React.FC<ScriptInputProps> = ({ script, setScript, onFilesChange, mode, setMode, onNext }) => {
    const [stagedFiles, setStagedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileDrop = (files: FileList | null) => {
      if (!files) return;
      const textFiles = Array.from(files).filter(file => file.type === 'text/plain' || file.name.endsWith('.txt'));
      setStagedFiles(textFiles);
      onFilesChange(textFiles);
    };

    const isNextDisabled = mode === 'single' ? script.trim().length === 0 : stagedFiles.length === 0;

    return (
        <div className="w-full max-w-4xl p-8 space-y-6 scroll-container">
            <div className="text-center">
                <h2 className="text-4xl font-bold">Step 1: Provide Your Script(s)</h2>
            </div>

            <div className="flex justify-center space-x-2 mb-4">
                <button
                    onClick={() => setMode('single')}
                    className={`px-8 py-2 text-2xl font-bold hand-drawn-tab ${mode === 'single' ? 'active' : ''}`}
                >
                    Single Script
                </button>
                <button
                    onClick={() => setMode('batch')}
                    className={`px-8 py-2 text-2xl font-bold hand-drawn-tab ${mode === 'batch' ? 'active' : ''}`}
                >
                    Batch Production
                </button>
            </div>

            <p className="text-center text-lg text-[var(--color-text-muted)] -mt-2">
                {mode === 'single' 
                    ? "Paste the text you want to convert into a voiceover." 
                    : "Upload one or more .txt files for batch processing."}
            </p>

            {mode === 'single' ? (
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
                    <input type="file" multiple accept=".txt,text/plain" ref={fileInputRef} onChange={(e) => handleFileDrop(e.target.files)} className="hidden" />
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
            
            <div className="flex flex-col sm:flex-row-reverse gap-4">
                <button
                    onClick={onNext}
                    disabled={isNextDisabled}
                    className="w-full flex justify-center py-3 px-4 rounded-md text-2xl font-bold hand-drawn-button"
                >
                    Next: Set Paragraphs per File
                </button>
            </div>
        </div>
    );
};

export default ScriptInput;