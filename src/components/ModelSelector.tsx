import React, { useState, useEffect } from 'react';
import { getModels } from '../services/elevenLabsService';
import type { Model } from '../types';

interface ModelSelectorProps {
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const LoadingSpinner = () => <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--color-primary)] mx-auto"></div>;
const ArrowButton: React.FC<{ direction: 'left' | 'right'; onClick: () => void; disabled: boolean }> = ({ direction, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="absolute top-1/2 -translate-y-1/2 p-2 bg-[var(--color-secondary)] border-2 border-[var(--color-border)] rounded-full shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ [direction]: '-20px' }}
    >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={direction === 'left' ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
        </svg>
    </button>
);


const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, setSelectedModel, onNext, onBack }) => {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const modelsPerPage = 2;

  useEffect(() => {
    const fetchModels = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const allModels = await getModels();
        const ttsModels = allModels.filter(m => m.can_do_text_to_speech);
        setModels(ttsModels);

        const currentModelExists = ttsModels.some(m => m.model_id === selectedModel);
        if (!currentModelExists && ttsModels.length > 0) {
          const defaultModel = ttsModels.find(m => m.model_id === 'eleven_multilingual_v2') || ttsModels[0];
          setSelectedModel(defaultModel.model_id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch models.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchModels();
  }, [selectedModel, setSelectedModel]);
  
  const pageCount = Math.ceil(models.length / modelsPerPage);
  const currentModels = models.slice(currentPage * modelsPerPage, (currentPage + 1) * modelsPerPage);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-10 h-64 flex flex-col justify-center">
          <LoadingSpinner />
          <p className="mt-4 text-[var(--color-text-muted)]">Fetching available models...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-10 rounded-lg p-4 h-64 flex flex-col justify-center" style={{backgroundColor: 'var(--color-error-bg)'}}>
          <h3 className="text-lg font-bold" style={{color: 'var(--color-error-text)'}}>Error</h3>
          <p className="mt-2" style={{color: 'var(--color-error-text)'}}>{error}</p>
        </div>
      );
    }
    
    if (models.length === 0) {
        return (
            <div className="text-center py-10 h-64 flex flex-col justify-center">
                <p className="text-[var(--color-text-muted)]">No text-to-speech models found.</p>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-64">
                {currentModels.map(model => (
                <div
                    key={model.model_id}
                    onClick={() => setSelectedModel(model.model_id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 flex flex-col justify-center`}
                    style={selectedModel === model.model_id ? {
                        backgroundColor: 'var(--color-accent-bg-translucent-heavy)',
                        borderColor: 'var(--color-accent)',
                        boxShadow: '4px 4px 0px var(--color-accent)'
                    } : {
                        backgroundColor: 'var(--color-secondary)',
                        borderColor: 'var(--color-border)'
                    }}
                >
                    <h3 className="font-bold text-xl">{model.name}</h3>
                    <p className="text-base text-[var(--color-text-muted)] mt-1">{model.description}</p>
                </div>
                ))}
            </div>
            {pageCount > 1 && <>
              <ArrowButton direction="left" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0} />
              <ArrowButton direction="right" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === pageCount - 1} />
            </>}
        </div>
    );
  };

  return (
    <div className="w-full max-w-4xl p-8 space-y-6 scroll-container">
      <div className="text-center">
        <h2 className="text-4xl font-bold">Step 2: Select a Model</h2>
        <p className="mt-2 text-lg text-[var(--color-text-muted)]">
          Choose the model for voice generation. Your choice will be remembered.
        </p>
      </div>

      {renderContent()}

      <div className="flex justify-center items-center space-x-2 pt-2">
        {Array.from({ length: pageCount }).map((_, i) => (
            <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-3 h-3 rounded-full border-2 border-[var(--color-border)] ${i === currentPage ? 'bg-[var(--color-text)]' : 'bg-transparent'}`}
            />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row-reverse gap-4 pt-6 border-t-2 border-[var(--color-border)]">
        <button
          onClick={onNext}
          disabled={!selectedModel || isLoading || !!error}
          className="w-full flex justify-center py-3 px-4 rounded-md text-2xl font-bold hand-drawn-button"
        >
          Next: Configure Voice
        </button>
        <button
          onClick={onBack}
          className="w-full flex justify-center py-3 px-4 rounded-md text-2xl font-bold hand-drawn-button bg-[var(--color-secondary)] text-[var(--color-secondary-text)]"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default ModelSelector;