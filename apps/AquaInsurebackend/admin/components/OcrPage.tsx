import React, { useState, useRef, useEffect } from 'react';
import { Box } from '@adminjs/design-system';

const OcrPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    total: number;
    textPreview: string;
    filename: string;
    mimeType: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com?plugins=forms,container-queries';
      document.head.appendChild(script);
      script.onload = () => {
        // @ts-ignore
        window.tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              colors: {
                "surface": "#ffffff",
                "surface-container-low": "#f8f9fa",
                "on-surface": "#111827", 
                "on-surface-variant": "#4b5563",
                "primary": "#006876",
                "primary-container": "#e0f2fe",
                "on-primary-container": "#0369a1",
                "background": "#ffffff",
                "surface-bright": "#ffffff",
                "outline-variant": "#e5e7eb"
              },
            },
          },
        };
      };
    }

    if (!document.getElementById('google-fonts-dashboard')) {
      const link = document.createElement('link');
      link.id = 'google-fonts-dashboard';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Inter:wght@300;400;500;600&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResult(null);
    setError('');
    setFile(e.target.files?.[0] || null);
  };

  const handleScan = async () => {
    if (!file) {
      setError('Please select a PDF or image file first.');
      return;
    }
    setLoading(true);
    setResult(null);
    setError('');

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/ocr/scan', { method: 'POST', body: form });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'OCR failed. Please try another file.');
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Box className="bg-surface min-h-screen text-on-surface font-body p-8" style={{ margin: '-20px' }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-3xl">document_scanner</span>
            </div>
            <div>
              <h2 className="text-3xl font-headline font-extrabold text-white tracking-tight">OCR Bill Scanner</h2>
              <p className="text-on-surface-variant text-sm mt-1">Automated data extraction from physical logbooks and bills.</p>
            </div>
          </div>
        </div>

        {/* Upload Box */}
        <div className={`relative overflow-hidden rounded-3xl border-2 transition-all duration-300 p-12 text-center mb-8 ${
          file ? 'border-primary bg-surface-container-high' : 'border-dashed border-outline-variant bg-surface-container-low'
        }`}>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,image/jpeg,image/png,image/jpg,image/webp"
            onChange={handleFileChange}
            className="hidden"
            id="ocr-file-input"
          />

          {!file ? (
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary text-4xl">cloud_upload</span>
              </div>
              <p className="text-xl font-bold text-white mb-2">Drop your bill here or click to browse</p>
              <p className="text-on-surface-variant text-sm mb-6">Supported: PDF, JPG, PNG, WebP · Max 20 MB</p>
              <label htmlFor="ocr-file-input" className="px-8 py-3 bg-primary text-on-primary font-bold rounded-xl cursor-pointer shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                Choose File
              </label>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary text-4xl">
                  {file.type === 'application/pdf' ? 'description' : 'image'}
                </span>
              </div>
              <p className="text-lg font-bold text-primary mb-1">{file.name}</p>
              <p className="text-on-surface-variant text-xs mb-6 px-4 py-1 bg-surface-container-highest rounded-full">
                {(file.size / 1024).toFixed(1)} KB · {file.type}
              </p>
              <button
                onClick={reset}
                className="px-4 py-2 text-on-surface-variant hover:text-white text-sm font-bold flex items-center space-x-2 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                <span>Clear Selection</span>
              </button>
            </div>
          )}
        </div>

        {/* Scan Button */}
        <button
          onClick={handleScan}
          disabled={loading || !file}
          className={`w-full py-4 rounded-2xl text-lg font-bold transition-all duration-200 shadow-xl flex items-center justify-center space-x-3 mb-8 ${
            loading || !file 
              ? 'bg-outline-variant/30 text-on-surface-variant cursor-not-allowed opacity-50' 
              : 'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-primary/20 hover:scale-[1.02] active:scale-95'
          }`}
        >
          {loading ? (
            <span className="animate-spin material-symbols-outlined text-2xl">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-2xl">bolt</span>
          )}
          <span>{loading ? 'Extracting Data...' : 'Extract Total from Bill'}</span>
        </button>

        {/* Error */}
        {error && (
          <div className="bg-error-container/20 border border-error/50 rounded-2xl p-6 flex items-start space-x-4 mb-8">
            <span className="material-symbols-outlined text-error text-2xl">warning</span>
            <div className="text-error font-bold">{error}</div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-surface-container rounded-3xl p-8 border border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-outline-variant/30">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                </div>
                <p className="text-sm font-bold text-primary uppercase tracking-widest">Extracted Result</p>
              </div>
              <div className="text-4xl font-headline font-extrabold text-white">
                ₹{result.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Source File</p>
                <div className="bg-surface-container-low rounded-2xl p-4 flex items-center space-x-3">
                  <span className="material-symbols-outlined text-primary text-2xl">article</span>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-white truncate">{result.filename}</p>
                    <p className="text-[10px] text-on-surface-variant">{result.mimeType}</p>
                  </div>
                </div>
              </div>

              {result.textPreview && (
                <div className="md:col-span-2">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Text Preview</p>
                  <pre className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 text-xs text-on-surface-variant font-mono whitespace-pre-wrap break-words max-h-64 overflow-y-auto custom-scrollbar">
                    {result.textPreview}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Box>
  );
};

export default OcrPage;
