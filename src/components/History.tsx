import React from 'react';
import type { HistoryItem } from '../types';

interface HistoryProps {
  history: HistoryItem[];
  setHistory: (history: HistoryItem[]) => void;
  onBack: () => void;
}

const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;

const History: React.FC<HistoryProps> = ({ history, setHistory, onBack }) => {
  const handleRemove = (id: number) => {
    setHistory(history.filter(item => item.id !== id));
  };

  const handleDownload = (item: HistoryItem) => {
    const link = document.createElement('a');
    link.href = item.audioDataUrl;
    link.download = `${item.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date(item.createdAt).toLocaleDateString().replace(/\//g, '-')}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-4xl p-8 space-y-6 scroll-container">
      <div className="text-center border-b-2 border-gray-300 pb-4">
        <h2 className="text-4xl font-bold">Generation History</h2>
        <p className="mt-2 text-lg text-gray-600">
          Your previously generated and merged voiceovers.
        </p>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
        {history.length > 0 ? (
          history.map(item => (
            <div
              key={item.id}
              className="bg-[#e0f0e0]/50 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-gray-400"
            >
              <div className="flex-grow w-full">
                <p className="font-bold text-xl">{item.name}</p>
                <p className="text-base text-gray-600">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
                <audio controls src={item.audioDataUrl} className="w-full mt-2"></audio>
              </div>
              <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 flex-shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => handleDownload(item)}
                  className="flex items-center justify-center py-2 px-3 rounded-md text-sm font-bold text-black bg-[#e0dcd3] hand-drawn-button w-full sm:w-auto"
                  aria-label={`Download ${item.name}`}
                >
                  <DownloadIcon />
                  <span className="ml-2">Download</span>
                </button>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="p-3 bg-red-200 hover:bg-red-300 text-red-800 rounded-full transition-colors hand-drawn-button border-red-800 shadow-red-800"
                  style={{boxShadow: '4px 4px 0px #c00'}}
                  aria-label={`Remove ${item.name}`}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 py-8 text-lg">
            You haven't generated any voiceovers yet. Your history will appear here.
          </p>
        )}
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

export default History;
