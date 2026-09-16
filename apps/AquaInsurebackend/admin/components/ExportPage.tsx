import React, { useState, useEffect } from 'react';
import { Box } from '@adminjs/design-system';

const ExportPage: React.FC = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [farmerId, setFarmerId] = useState('');
  const [selectedPondIds, setSelectedPondIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [farmers, setFarmers] = useState<any[]>([]);
  const [ponds, setPonds] = useState<any[]>([]);

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

  // Fetch farmers on mount
  useEffect(() => {
    fetch('/export/farmers')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setFarmers(data.data);
      })
      .catch((err) => console.error('Failed to fetch farmers', err));
  }, []);

  // Fetch ponds when farmerId changes
  useEffect(() => {
    if (!farmerId) {
      setPonds([]);
      setSelectedPondIds([]);
      return;
    }
    fetch(`/export/ponds?farmerId=${farmerId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPonds(data.data);
          setSelectedPondIds([]); // reset selection
        }
      })
      .catch((err) => console.error('Failed to fetch ponds', err));
  }, [farmerId]);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      if (farmerId) params.append('farmerId', farmerId);
      selectedPondIds.forEach((pid) => params.append('pondId', pid));

      const url = `/export/excel?${params.toString()}`;
      window.location.href = url;
    } catch (err: any) {
      setError('Error: ' + err.message);
    } finally {
      setTimeout(() => setLoading(false), 2000);
    }
  };

  return (
    <Box className="bg-surface min-h-screen text-on-surface font-body p-8" style={{ margin: '-20px' }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-3xl">table_chart</span>
            </div>
            <div>
              <h2 className="text-3xl font-headline font-extrabold text-slate-800 tracking-tight">OCR Excel Export</h2>
              <p className="text-on-surface-variant text-sm mt-1">Generate analytical workbooks with automated OCR data.</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-container rounded-3xl p-8 border border-outline-variant/30 shadow-xl">
          <form onSubmit={handleExport}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* From Date */}
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-white border border-outline-variant/50 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                />
              </div>
              
              {/* To Date */}
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-white border border-outline-variant/50 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {/* Farmer ID */}
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Farmer (Optional)</label>
                <select
                  value={farmerId}
                  onChange={(e) => setFarmerId(e.target.value)}
                  className="w-full bg-white border border-outline-variant/50 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none appearance-none"
                >
                  <option value="" className="bg-white text-slate-800">-- All Farmers --</option>
                  {farmers.map((f) => (
                    <option key={f._id} value={f._id} className="bg-white text-slate-800">
                      {f.name} ({f.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Pond IDs */}
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Ponds (Optional)</label>
                {farmerId && ponds.length > 0 ? (
                  <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl p-4 max-h-40 overflow-y-auto space-y-3 custom-scrollbar">
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedPondIds.length === ponds.length && ponds.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedPondIds(ponds.map(p => p._id));
                          else setSelectedPondIds([]);
                        }}
                        className="w-5 h-5 rounded border-outline-variant bg-surface text-primary focus:ring-primary/30"
                      />
                      <span className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors">Select All</span>
                    </label>
                    {ponds.map(p => (
                      <label key={p._id} className="flex items-center space-x-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedPondIds.includes(p._id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedPondIds([...selectedPondIds, p._id]);
                            else setSelectedPondIds(selectedPondIds.filter(id => id !== p._id));
                          }}
                          className="w-5 h-5 rounded border-outline-variant bg-surface text-primary focus:ring-primary/30"
                        />
                        <span className="text-sm text-slate-600 group-hover:text-primary transition-colors">
                          {p.name || `Pond ${p.pondNumber}`}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-3 text-on-surface-variant text-sm italic">
                    {farmerId ? 'No ponds found for this farmer.' : 'Select a farmer to view ponds.'}
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-error-container/20 border border-error/50 rounded-2xl p-4 flex items-start space-x-3 mb-8">
                <span className="material-symbols-outlined text-error text-xl">warning</span>
                <div className="text-error text-sm font-bold">{error}</div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-2xl text-lg font-bold transition-all duration-200 shadow-xl flex items-center justify-center space-x-3 ${
                loading 
                  ? 'bg-outline-variant/30 text-on-surface-variant cursor-not-allowed opacity-50' 
                  : 'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-primary/20 hover:scale-[1.02] active:scale-95'
              }`}
            >
              {loading ? (
                <span className="animate-spin material-symbols-outlined text-2xl">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-2xl">download</span>
              )}
              <span>{loading ? 'Generating Excel Report...' : 'Download Excel Report'}</span>
            </button>
          </form>
        </div>

        {/* Info Card */}
        <div className="mt-10 bg-surface-container-low/50 border border-outline-variant/30 rounded-3xl p-8">
          <div className="flex items-center space-x-3 mb-4">
            <span className="material-symbols-outlined text-primary">lightbulb</span>
            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest">How it works</h4>
          </div>
          <ul className="space-y-3">
            {[
              'Filters are optional. If left blank, all records are exported.',
              'For each Daily Entry, any uploaded bills are scanned using OCR.',
              'The extracted totals are added alongside manual entries for accurate calculation.',
              'Processing may take a few seconds if many images are present.'
            ].map((text, i) => (
              <li key={i} className="flex items-start space-x-3 text-sm text-on-surface-variant leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-2 shrink-0"></span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Box>
  );
};

export default ExportPage;
