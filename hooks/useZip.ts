import { useCallback, useState } from 'react';

// Make JSZip available in the scope, assuming it's loaded from a CDN.
declare const JSZip: any;

interface ZipFile {
  name: string;
  data: Blob;
}

export const useZip = () => {
  const [isZipping, setIsZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAndDownloadZip = useCallback(async (files: ZipFile[], zipName: string) => {
    if (typeof JSZip === 'undefined') {
      setError("JSZip library is not loaded. Please check your internet connection.");
      return;
    }

    setIsZipping(true);
    setError(null);

    try {
      const zip = new JSZip();
      files.forEach(file => {
        zip.file(file.name, file.data);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${zipName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create zip file.");
    } finally {
      setIsZipping(false);
    }
  }, []);

  return { createAndDownloadZip, isZipping, error };
};