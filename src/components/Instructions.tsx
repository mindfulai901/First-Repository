import React from 'react';

interface InstructionsProps {
  onBack: () => void;
}

const Instructions: React.FC<InstructionsProps> = ({ onBack }) => {
  return (
    <div className="w-full max-w-4xl p-8 space-y-6 scroll-container">
      <div className="text-center">
        <h2 className="text-4xl font-bold">How to Use the Voice Generator</h2>
        <p className="mt-2 text-lg text-gray-600">
          Follow these simple steps to create your voiceover.
        </p>
      </div>

      <div className="space-y-4 text-lg text-left text-gray-700">
        <p>
          <strong>Step 1: Enter Your Script</strong><br/>
          Paste your full text into the text area. The app will automatically split it into paragraphs for processing.
        </p>
        <p>
          <strong>Step 2: Set Paragraphs Per File</strong><br/>
          Decide how many paragraphs you want in each generated audio file. For long scripts, keeping this at 1 is often best for managing files.
        </p>
        <p>
          <strong>Step 3: Select a Model</strong><br/>
          Choose from a list of available ElevenLabs models. Your selection is saved for future sessions. A model must be selected to proceed.
        </p>
        <p>
          <strong>Step 4: Configure Voice</strong><br/>
          Find a voice by entering its Voice ID. You can search for voices in your own library or public ones from the Voice Library. Adjust settings like stability and clarity, then save your favorite configurations.
        </p>
        <p>
          <strong>Finally: Generate & Download</strong><br/>
          Click 'Generate' and watch the progress! Once complete, you can preview the full audio, listen to individual chunks, and download everything as a convenient ZIP file.
        </p>
      </div>

      <div className="pt-6 border-t-2 border-gray-300">
        <button
          onClick={onBack}
          className="w-full flex justify-center py-3 px-4 rounded-md text-2xl font-bold text-white hand-drawn-button"
        >
          Back to App
        </button>
      </div>
    </div>
  );
};

export default Instructions;
