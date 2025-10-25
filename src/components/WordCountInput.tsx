import React from 'react';

interface ParagraphCountInputProps {
  paragraphsPerChunk: number;
  setParagraphsPerChunk: (count: number) => void;
  onNext: () => void;
  onBack: () => void;
}

const ParagraphCountInput: React.FC<ParagraphCountInputProps> = ({ paragraphsPerChunk, setParagraphsPerChunk, onNext, onBack }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0) {
      setParagraphsPerChunk(value);
    } else if (e.target.value === '') {
        setParagraphsPerChunk(0);
    }
  };

  return (
    <div className="w-full max-w-2xl p-8 space-y-8 scroll-container">
      <div className="text-center">
        <h2 className="text-4xl font-bold">Step 2: Set Paragraphs Per File</h2>
        <p className="mt-2 text-lg text-gray-600">
          Define how many paragraphs to include in each audio file.
        </p>
      </div>
      
      <div>
        <label htmlFor="paragraph-count" className="block text-lg font-medium text-center mb-2">
            Paragraphs Per Audio File
        </label>
        <input
            id="paragraph-count"
            type="number"
            min="1"
            step="1"
            className="w-full p-3 bg-white border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-[#9cb89c] focus:border-[#9cb89c] transition duration-300 placeholder-gray-500 text-center text-2xl"
            value={paragraphsPerChunk === 0 ? '' : paragraphsPerChunk}
            onChange={handleInputChange}
        />
        <p className="text-sm text-gray-500 mt-2 text-center">Each group of paragraphs becomes one downloadable audio file.</p>
      </div>
      
      <div className="flex flex-col sm:flex-row-reverse gap-4">
        <button
          onClick={onNext}
          disabled={paragraphsPerChunk < 1}
          className="w-full flex justify-center py-3 px-4 rounded-md text-2xl font-bold text-white hand-drawn-button"
        >
          Next: Select Model
        </button>
        <button 
          onClick={onBack} 
          className="w-full flex justify-center py-3 px-4 rounded-md text-2xl font-bold text-black hand-drawn-button bg-[#e0dcd3]"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default ParagraphCountInput;