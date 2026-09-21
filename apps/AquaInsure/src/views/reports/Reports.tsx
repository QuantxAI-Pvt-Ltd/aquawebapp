import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Search, Clock, Printer, FileSpreadsheet, Layers, RefreshCw, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import BottomNav from '@/components/BottomNav';
import axios from '@/lib/api';

const API = '/api/entries/daily';

function getDateRange(viewMode: string, customFrom: string, customTo: string): { from?: string; to?: string } {
  const now = new Date();
  const toISO = (d: Date) => d.toISOString().split('T')[0];

  if (viewMode === 'daily') {
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
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [entries, setEntries] = useState<any[]>([]);
  const [ponds, setPonds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load ponds for filter
  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('aqua-session') || '{}');
    const farmerId = session.farmerId;
    if (!farmerId) return;

    axios.get(`/api/farms/ponds?farmerId=${farmerId}`)
      .then((res) => {
        if (res.data.success) {
          setPonds(res.data.data || []);
        }
      })
      .catch((err) => console.error('Failed to load ponds:', err));
  }, []);

  // Fetch entries from backend
  const fetchEntries = useCallback(async () => {
    const session = JSON.parse(localStorage.getItem('aqua-session') || '{}');
    const farmerId = session.farmerId;
    if (!farmerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { from, to } = getDateRange(viewMode, startDate, endDate);
      const params: Record<string, string> = { farmerId };
      if (from) params.from = from;
      if (to) params.to = to;
      if (selectedPond && selectedPond !== 'all') params.pondId = selectedPond;

      const res = await axios.get(API, { params });
      if (res.data.success) {
        setEntries(res.data.data || []);
      } else {
        setError('Failed to load reports');
      }
    } catch (err: any) {
      console.error('Error fetching reports:', err);
      setError(err.response?.data?.error || 'Could not load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [viewMode, startDate, endDate, selectedPond]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Client-side text filter (day number or notes)
  const displayedEntries = entries.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(e.dayNumber).includes(q) ||
      e.shrimpHealth?.status?.toLowerCase().includes(q) ||
      e.shrimpHealth?.measures?.toLowerCase().includes(q)
    );
  });

  // Calculate quick stats from displayedEntries
  const avgPh = displayedEntries.length
    ? (displayedEntries.reduce((acc, e) => acc + (e.waterQuality?.ph || 0), 0) / (displayedEntries.filter(e => e.waterQuality?.ph).length || 1)).toFixed(1)
    : '—';

  const avgBiomass = displayedEntries.length
    ? Math.round(displayedEntries.reduce((acc, e) => acc + (e.sampling?.biomass || 0), 0) / (displayedEntries.filter(e => e.sampling?.biomass).length || 1))
    : '—';

  const exportCSV = () => {
    if (!displayedEntries.length) return;
    const headers = ['Day', 'Date', 'Survival %', 'Biomass (kg)', 'Feed (kg)', 'Feed Cost (₹)', 'DO (mg/L)', 'pH', 'Temp (°C)', 'Health'];
    const rows = displayedEntries.map((e) => [
      e.dayNumber,
      e.date ? new Date(e.date).toLocaleDateString() : '',
      e.sampling?.survival ?? '',
      e.sampling?.biomass ?? '',
      e.feedManagement?.feedQuantity ?? '',
      e.feedManagement?.feedCost ?? '',
      e.waterQuality?.do ?? '',
      e.waterQuality?.ph ?? '',
      e.waterQuality?.temperature ?? '',
      e.shrimpHealth?.status ?? '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aqua-reports-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-[100dvh] pb-4 overflow-x-clip print:bg-white print:pb-0"
      style={{
        fontFamily: "'Outfit', sans-serif",
        background: 'linear-gradient(160deg, #f0fdf9 0%, #ecfdf5 50%, #f8fafc 100%)',
      }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,500&display=swap');
        * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }

        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* HEADER */}
      <div
        className="px-5 pt-8 pb-7 rounded-b-[2.5rem] relative overflow-hidden"
        style={{
          background: 'linear-gradient(140deg, #1c4a3e 0%, #1c6b5a 45%, #2d9b7f 100%)',
          boxShadow: '0 8px 32px -6px rgba(28,74,62,0.28)',
        }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 opacity-10"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />

        <div className="flex items-center justify-between relative z-10 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all no-print"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.2em]">Analytics</p>
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight">
                {t('reports.title')}
              </h1>
            </div>
          </div>
          <span className="text-[10px] font-bold text-white/85 px-2.5 py-1 bg-white/12 rounded-lg border border-white/15 no-print">
            Aqua <span className="text-amber-300">AI</span>nsure
          </span>
        </div>

        {/* Action icons bar */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 no-print">
          <span className="text-xs text-white/70 font-medium">
            {displayedEntries.length} {displayedEntries.length === 1 ? 'record' : 'records'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              title="Export CSV"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold border border-white/20 transition-all"
            >
              <FileSpreadsheet size={13} />
              <span>CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              title="Print / Save PDF"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold border border-white/20 transition-all"
            >
              <Printer size={13} />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-3 space-y-4 relative z-20">

        {/* TIME RANGE TABS */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-1.5 border border-stone-200/80 shadow-sm flex gap-1 no-print">
          {(['daily', 'weekly', 'monthly', 'custom'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                viewMode === mode
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {t(`reports.${mode}`)}
            </button>
          ))}
        </div>

        {/* CUSTOM DATE PICKER */}
        {viewMode === 'custom' && (
          <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm space-y-3 no-print">
            <p className="text-xs font-bold text-stone-500 flex items-center gap-1.5">
              <Calendar size={13} className="text-teal-600" />
              Custom Date Range
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-stone-400 block mb-1">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-700 focus:outline-none focus:border-teal-600 font-medium"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-stone-400 block mb-1">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-stone-200 bg-stone-50 text-xs text-stone-700 focus:outline-none focus:border-teal-600 font-medium"
                />
              </div>
            </div>
          </div>
        )}

        {/* SEARCH & POND FILTER */}
        <div className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-sm space-y-2.5 no-print">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search by day number or health note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl border-stone-200 bg-stone-50/80 text-xs focus-visible:ring-teal-600"
            />
          </div>

          <div className="flex gap-2">
            <Select value={selectedPond} onValueChange={setSelectedPond}>
              <SelectTrigger className="flex-1 h-9 rounded-xl border-stone-200 bg-stone-50 text-xs">
                <SelectValue placeholder="All Ponds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ponds</SelectItem>
                {ponds.map((p, i) => (
                  <SelectItem key={p._id || i} value={p._id || String(i)}>
                    {p.name || `Pond ${p.pondNumber || i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              onClick={fetchEntries}
              title="Refresh"
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-500 transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
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
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-16 rounded-2xl bg-stone-200/80" />
              <Skeleton className="h-16 rounded-2xl bg-stone-200/80" />
              <Skeleton className="h-16 rounded-2xl bg-stone-200/80" />
            </div>
            <Skeleton className="h-44 rounded-3xl bg-white border border-stone-100 shadow-sm" />
            <Skeleton className="h-44 rounded-3xl bg-white border border-stone-100 shadow-sm" />
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
            {displayedEntries.length > 0 ? (
              displayedEntries.map((record: any, idx: number) => (
                <div
                  key={record._id || idx}
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
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
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
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Reports;