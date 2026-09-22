import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Search, Clock, Printer, FileSpreadsheet, Layers, RefreshCw, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BottomNav from '@/components/BottomNav';
import axios, { API_BASE_URL } from '@/lib/api';

const EASE = [0.16, 1, 0.3, 1] as const;

const API = '/api/entries/daily';

function getDateRange(viewMode: string, customFrom: string, customTo: string): { from?: string; to?: string } {
  const now = new Date();
  const toISO = (d: Date) => d.toISOString().split('T')[0];

  if (viewMode === 'daily') {
    // All entries up to today
    return { to: toISO(now) };
  }

  if (viewMode === 'weekly') {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    return { from: toISO(from), to: toISO(now) };
  }

  if (viewMode === 'monthly') {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from: toISO(from), to: toISO(now) };
  }

  if (viewMode === 'custom') {
    return {
      from: customFrom || undefined,
      to: customTo || undefined,
    };
  }

  return {};
}

const Reports = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPond, setSelectedPond] = useState('all');
  const [viewMode, setViewMode] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [ponds, setPonds] = useState<any[]>([]);

  const session = JSON.parse(localStorage.getItem('aqua-session') || '{}');

  useEffect(() => {
    if (!session.farmerId) { navigate('/login', { replace: true }); return; }
    axios.get(`/api/farms/ponds?farmerId=${session.farmerId}`)
      .then(r => setPonds(r.data.data || []))
      .catch(() => { });
  }, []);

  const fetchEntries = useCallback(async () => {
    if (viewMode === 'custom' && (!startDate || !endDate)) return;

    setLoading(true);
    setError('');

    try {
      const { from, to } = getDateRange(viewMode, startDate, endDate);
      const params: Record<string, string> = { farmerId: session.farmerId };
      if (selectedPond !== 'all') params.pondId = selectedPond;
      if (from) params.from = from;
      if (to) params.to = to;

      const res = await axios.get(API, { params });
      setEntries(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load records');
    } finally {
      setLoading(false);
    }
  }, [viewMode, selectedPond, startDate, endDate]);

  // Fetch when mode / pond / date range changes
  useEffect(() => {
    if (viewMode !== 'custom') fetchEntries();
  }, [viewMode, selectedPond]);

  // For custom, only fetch when both dates are set
  useEffect(() => {
    if (viewMode === 'custom' && startDate && endDate) fetchEntries();
  }, [startDate, endDate, viewMode, selectedPond]);

  // Client-side text search on top of server-filtered data
  const displayedEntries = entries.filter(e => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const dateStr = e.date ? new Date(e.date).toLocaleDateString() : '';
    const pondStr = (e.pondId || '').toString().toLowerCase();
    const dayStr = `day ${e.dayNumber}`;
    return dateStr.toLowerCase().includes(q) || pondStr.includes(q) || dayStr.includes(q);
  });

  const exportToExcel = async () => {
    try {
      setLoading(true);
      setError('');
      const { from, to } = getDateRange(viewMode, startDate, endDate);
      const params = new URLSearchParams({ farmerId: session.farmerId });
      if (selectedPond !== 'all') params.append('pondId', selectedPond);
      if (from) params.append('from', from);
      if (to) params.append('to', to);

      const response = await fetch(`${API_BASE_URL}/api/export/excel?${params.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to export to Excel');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AquaInsure_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setError(err.message || 'Failed to export');
    } finally {
      setLoading(false);
    }
  };

  // Summary stats
  const avgPh = displayedEntries.length
    ? (displayedEntries.reduce((a: number, e: any) => a + (e.waterQuality?.ph || 0), 0) / displayedEntries.length).toFixed(1)
    : '—';
  const avgBiomass = displayedEntries.length
    ? (displayedEntries.reduce((a: number, e: any) => a + (e.sampling?.biomass || 0), 0) / displayedEntries.length).toFixed(0)
    : '—';

  const viewLabels: Record<string, string> = {
    daily: 'All',
    weekly: '7 Days',
    monthly: '30 Days',
    custom: 'Custom',
  };

  return (
    <div className="h-full min-h-[100dvh] bg-stone-50 overflow-hidden flex flex-col"
      style={{
        fontFamily: "'Sora', sans-serif",
        background: 'linear-gradient(160deg, #f0fdf9 0%, #ecfdf5 50%, #f8fafc 100%)',
      }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,500&display=swap');
        * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }
        @media print {
          .no-print { display: none !important; }
          .print-show { display: block !important; }
        }
        .search-field { background: rgba(255,255,255,0.15) !important; border: 1px solid rgba(255,255,255,0.25) !important; border-radius: 14px !important; color: #fff !important; }
        .search-field::placeholder { color: rgba(255,255,255,0.45) !important; }
        .search-field input { color: #fff !important; background: transparent !important; }
        .search-field input::placeholder { color: rgba(255,255,255,0.45) !important; }
      `}</style>

      {/* SCROLLABLE INNER BODY */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pb-8">
        {/* HEADER */}
      <div className="no-print relative overflow-hidden z-10 px-5 pt-8 pb-6"
        style={{
          background: 'linear-gradient(135deg, #0a2e2b 0%, #0f766e 45%, #0d9488 80%, #14b8a6 100%)',
          borderRadius: '0 0 2.5rem 2.5rem',
          boxShadow: '0 16px 48px -8px rgba(15,118,110,0.45)',
        }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />
        <div className="absolute right-5 bottom-2 opacity-10 text-7xl">📊</div>

        <div className="flex items-center justify-between relative z-10 mb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.20)' }}>
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
                {t('reports.title')}
              </h1>
              <p className="text-[10px] text-white/50">Farm performance data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-white/80 px-2.5 py-1 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
              Aqua <span style={{ color: '#fcd34d' }}>AI</span>nsure
            </span>
            <button onClick={exportToExcel}
              title="Export to Excel (CSV)"
              className="w-10 h-10 flex items-center justify-center rounded-2xl text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
              <FileSpreadsheet size={16} />
            </button>
            <button onClick={() => window.print()}
              title="Print Report"
              className="w-10 h-10 flex items-center justify-center rounded-2xl text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
              <Printer size={16} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative z-10">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" size={16} />
          <Input
            placeholder={`Search by date, pond, or day...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-field pl-10 h-12 text-base sm:text-sm border-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* FILTERS */}
        <div className="no-print flex gap-2 overflow-x-auto pb-1">
          <Select onValueChange={setSelectedPond} value={selectedPond}>
            <SelectTrigger className="w-[130px] h-9 rounded-xl border-0 text-xs font-bold shrink-0"
              style={{ background: 'rgba(255,255,255,0.90)', border: '1.5px solid rgba(20,184,166,0.18)', color: '#0d9488', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <Layers size={12} className="mr-1" /><SelectValue placeholder={t('reports.allPonds')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('reports.allPonds')}</SelectItem>
              {ponds.map((p: any) => (
                <SelectItem key={p._id || p.pondId} value={p._id || p.pondId}>
                  {p.name || `Pond ${p.pondNumber || p.pondId}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View mode toggles */}
          <div className="flex rounded-xl p-0.5 shrink-0"
            style={{ background: 'rgba(255,255,255,0.90)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1.5px solid rgba(20,184,166,0.14)' }}>
            {(['daily', 'weekly', 'monthly', 'custom'] as const).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                style={{
                  background: viewMode === mode ? 'linear-gradient(110deg, #0f766e, #14b8a6)' : 'transparent',
                  color: viewMode === mode ? '#fff' : '#64748b',
                  boxShadow: viewMode === mode ? '0 2px 8px rgba(15,118,110,0.30)' : 'none',
                }}>
                {viewLabels[mode]}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button onClick={fetchEntries}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl transition-all"
            style={{ background: 'rgba(255,255,255,0.90)', border: '1.5px solid rgba(20,184,166,0.18)', color: '#0d9488' }}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* CUSTOM DATE RANGE */}
        <AnimatePresence>
          {viewMode === 'custom' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl p-4 grid grid-cols-2 gap-3"
                style={{
                  background: 'rgba(255,255,255,0.80)',
                  border: '1.5px solid rgba(20,184,166,0.14)',
                  boxShadow: '0 4px 16px rgba(15,118,110,0.06)',
                }}>
                {[
                  { label: 'From', value: startDate, setter: setStartDate },
                  { label: 'To', value: endDate, setter: setEndDate },
                ].map(({ label, value, setter }) => (
                  <div key={label} className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 pl-1" style={{ color: '#94a3b8' }}>
                      <Calendar size={10} /> {label}
                    </label>
                    <Input type="date" value={value} onChange={(e) => setter(e.target.value)}
                      className="h-11 rounded-xl border-0 focus-visible:ring-0 text-base sm:text-sm font-medium"
                      style={{ background: 'rgba(248,250,252,0.90)', border: '1.5px solid rgba(20,184,166,0.18)', color: '#1e293b' }} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active filter label */}
        {!loading && displayedEntries.length > 0 && (
          <p className="text-[10px] font-semibold no-print" style={{ color: '#94a3b8' }}>
            Showing <span style={{ color: '#0d9488' }}>{displayedEntries.length}</span> records •{' '}
            {viewMode === 'custom' ? `${startDate} → ${endDate}` : viewMode === 'daily' ? 'All time' : viewMode === 'weekly' ? 'Last 7 days' : 'Last 30 days'}
          </p>
        )}

        {/* Print header (hidden on screen) */}
        <div className="hidden print-show mb-6 pb-4" style={{ borderBottom: '2px solid #0f766e' }}>
          <h1 className="text-2xl font-black" style={{ color: '#0f766e' }}>Aqua AInsure Report</h1>
          <div className="mt-1 text-sm flex justify-between" style={{ color: '#64748b' }}>
            <span>Generated: {new Date().toLocaleDateString()}</span>
            <span>Filter: {selectedPond === 'all' ? 'All Ponds' : `Pond ${selectedPond}`}</span>
          </div>
        </div>

        {/* Summary strip */}
        {displayedEntries.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-print">
            {[
              { label: 'Records', value: displayedEntries.length, color: '#0d9488', bg: 'rgba(20,184,166,0.10)', border: 'rgba(20,184,166,0.22)' },
              { label: 'Avg pH', value: avgPh, color: '#d97706', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.22)' },
              { label: 'Avg Biomass', value: `${avgBiomass}kg`, color: '#059669', bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.22)' },
            ].map(({ label, value, color, bg, border }) => (
              <div key={label} className="flex-1 shrink-0 rounded-2xl px-3 py-2.5 text-center"
                style={{ background: bg, border: `1px solid ${border}`, minWidth: 90 }}>
                <p className="text-base font-black" style={{ color }}>{value}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-3" style={{ color: '#0d9488' }}>
            <RefreshCw size={20} className="animate-spin" />
            <span className="text-sm font-semibold">Loading records...</span>
          </div>
        )}

        {/* ERROR */}
        {error && !loading && (
          <div className="rounded-2xl p-4 text-center"
            style={{ background: 'rgba(254,226,226,0.80)', border: '1px solid rgba(239,68,68,0.20)' }}>
            <p className="text-sm font-bold text-red-600">{error}</p>
          </div>
        )}

        {/* DATA LIST */}
        {!loading && !error && (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {displayedEntries.length > 0 ? (
                displayedEntries.map((record: any, idx: number) => (
                  <motion.div
                    key={record._id || idx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.04, ease: EASE }}
                    className="rounded-3xl p-4 print:shadow-none print:border-b print:rounded-none print:bg-white"
                    style={{
                      background: 'rgba(255,255,255,0.80)',
                      backdropFilter: 'blur(14px)',
                      border: '1.5px solid rgba(20,184,166,0.14)',
                      boxShadow: '0 4px 16px rgba(15,118,110,0.06)',
                    }}
                  >
                    {/* Card Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(20,184,166,0.12)', color: '#0d9488', border: '1px solid rgba(20,184,166,0.22)' }}>
                            🐠 {record.pondId?.name || `Pond ${record.pondId}`}
                          </span>
                          <span className="text-[10px] font-medium flex items-center gap-1" style={{ color: '#94a3b8' }}>
                            <Clock size={10} />{record.date ? new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold" style={{ color: '#1e293b' }}>
                          Day {record.dayNumber}
                        </h3>
                      </div>
                      <div className="text-right px-3 py-1.5 rounded-2xl"
                        style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.18)' }}>
                        <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: '#94a3b8' }}>pH</p>
                        <p className="text-lg font-black" style={{ color: '#0d9488' }}>{record.waterQuality?.ph ?? '—'}</p>
                      </div>
                    </div>

                    {/* Primary metrics */}
                    <div className="grid grid-cols-3 gap-2 mb-3 pt-3"
                      style={{ borderTop: '1px dashed rgba(20,184,166,0.15)' }}>
                      {[
                        { label: 'Avg Body Wt', value: `${record.productionEstimation?.expectedAbw ?? '—'}g`, icon: '⚖️' },
                        { label: 'Biomass', value: `${record.sampling?.biomass ?? '—'}kg`, icon: '📦' },
                        { label: 'Temp', value: `${record.waterQuality?.temperature ?? '—'}°C`, icon: '🌡️' },
                      ].map(({ label, value, icon }) => (
                        <div key={label} className="text-center rounded-xl p-2"
                          style={{ background: 'rgba(248,250,252,0.80)', border: '1px solid rgba(20,184,166,0.10)' }}>
                          <span className="text-base">{icon}</span>
                          <p className="text-xs font-black mt-0.5" style={{ color: '#1e293b' }}>{value}</p>
                          <p className="text-[8px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Secondary metrics */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: 'Feed Qty', value: `${record.feedManagement?.feedQuantity ?? '—'} kg` },
                        { label: 'Feed Cost', value: record.feedManagement?.feedCost != null ? `₹${record.feedManagement.feedCost}` : '—' },
                        { label: 'DO Level', value: `${record.waterQuality?.do ?? '—'} mg/L` },
                        { label: 'Survival', value: `${record.sampling?.survival ?? '—'}%` },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center px-3 py-1.5 rounded-xl"
                          style={{ background: 'rgba(248,250,252,0.70)', border: '1px solid rgba(20,184,166,0.08)' }}>
                          <span className="text-[10px] font-medium" style={{ color: '#94a3b8' }}>{label}</span>
                          <span className="text-xs font-bold" style={{ color: '#334155' }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-4"
                    style={{ background: 'rgba(255,255,255,0.80)', border: '1.5px solid rgba(20,184,166,0.14)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
                    📋
                  </div>
                  <h3 className="font-bold text-base mb-1" style={{ color: '#1e293b' }}>{t('reports.noData')}</h3>
                  <p className="text-sm max-w-[200px] mx-auto" style={{ color: '#94a3b8' }}>
                    {viewMode === 'custom' && (!startDate || !endDate)
                      ? 'Select both From and To dates to load records.'
                      : 'No entries found for this period.'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Reports;