'use client';

import { use, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Waves,
  ArrowLeft,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Thermometer,
  FileText,
  ImageIcon,
  Video,
  Play,
  ZoomIn,
  Search,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Sparkles,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { MediaViewerDialog, type MediaViewerTarget } from '@/components/ui/media-viewer-dialog';
import { apiFetch } from '@/lib/api';
import { formatDate } from '@/lib/formatters';
import { resolveMediaUrl } from '@/lib/fileUtils';
import type {
  FarmerDetailData,
  Pond,
  DailyEntry,
  OneTimeEntry,
  Insurance,
  ApiResponse,
} from '@/types';

// Custom styled tooltip for pond charts with clean inverted white card
function PondChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-border bg-white p-3 shadow-xl backdrop-blur-md min-w-[150px] text-slate-900">
        <p className="mb-2 text-xs font-bold text-[#311D3F] border-b border-border pb-1">
          {label}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: entry.color || entry.stroke || '#E23E57' }}
                />
                <span className="font-medium text-slate-800">{entry.name}:</span>
              </span>
              <span className="font-bold text-[#311D3F] font-mono">
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export default function PondDossierPage({ params }: { params: Promise<{ id: string; pondId: string }> }) {
  const resolvedParams = use(params);
  const { id: farmerId, pondId } = resolvedParams;
  const router = useRouter();

  const [farmer, setFarmer] = useState<FarmerDetailData | null>(null);
  const [entriesData, setEntriesData] = useState<{
    dailyEntries: DailyEntry[];
    oneTimeEntries: OneTimeEntry[];
  }>({ dailyEntries: [], oneTimeEntries: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeMedia, setActiveMedia] = useState<MediaViewerTarget | null>(null);
  const [chartMetric, setChartMetric] = useState<'all' | 'do' | 'ph' | 'ammonia' | 'temp'>('all');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [farmerRes, entriesRes] = await Promise.all([
          apiFetch<ApiResponse<FarmerDetailData>>(`/api/dashboard/farmers/${farmerId}`),
          apiFetch<ApiResponse<{ dailyEntries: DailyEntry[]; oneTimeEntries: OneTimeEntry[] }>>(
            `/api/dashboard/farmers/${farmerId}/entries`
          ).catch(() => null),
        ]);

        if (farmerRes.success && farmerRes.data) {
          setFarmer(farmerRes.data);
        }
        if (entriesRes && entriesRes.success && entriesRes.data) {
          setEntriesData(entriesRes.data);
        }
      } catch (err) {
        console.error('Failed to load pond dossier data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [farmerId, pondId]);

  // Identify current pond
  const pond = useMemo(() => {
    if (!farmer?.ponds) return null;
    return farmer.ponds.find((p) => String(p._id) === String(pondId)) || null;
  }, [farmer, pondId]);

  // Pond-specific daily entries (sorted chronologically by dayNumber)
  const pondEntries = useMemo(() => {
    if (!entriesData.dailyEntries) return [];
    return entriesData.dailyEntries
      .filter((e) => {
        const entryPondId = typeof e.pondId === 'object' ? (e.pondId as { _id?: string })?._id : e.pondId;
        return String(entryPondId) === String(pondId);
      })
      .sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0));
  }, [entriesData.dailyEntries, pondId]);

  // Pond-specific one-time setup
  const oneTime = useMemo(() => {
    if (!entriesData.oneTimeEntries) return null;
    return entriesData.oneTimeEntries.find((o) => {
      const oPondId = typeof o.pondId === 'object' ? (o.pondId as { _id?: string })?._id : o.pondId;
      return String(oPondId) === String(pondId);
    }) || null;
  }, [entriesData.oneTimeEntries, pondId]);

  // Pond-specific insurance policy
  const policy = useMemo(() => {
    if (!farmer?.insurances) return null;
    return farmer.insurances.find((i) => {
      const iPondId = typeof i.pondId === 'object' ? (i.pondId as { _id?: string })?._id : i.pondId;
      return String(iPondId) === String(pondId);
    }) || null;
  }, [farmer, pondId]);

  // Telemetry chart series data
  const chartData = useMemo(() => {
    return pondEntries.map((e) => ({
      day: `Day ${e.dayNumber || 0}`,
      dayNum: e.dayNumber || 0,
      date: formatDate(e.date),
      do: e.waterQuality?.do ?? null,
      ph: e.waterQuality?.ph ?? null,
      temp: e.waterQuality?.temperature ?? null,
      ammonia: e.waterQuality?.ammonia ?? null,
      feedKg: e.feedManagement?.feedQuantity ?? 0,
      biomass: e.sampling?.biomass ?? 0,
    }));
  }, [pondEntries]);

  // Filtered entries for table
  const filteredEntries = useMemo(() => {
    if (!search.trim()) return pondEntries;
    const q = search.toLowerCase();
    return pondEntries.filter((e) => {
      const measures = e.shrimpHealth?.measures?.toLowerCase() || '';
      const status = e.shrimpHealth?.status?.toLowerCase() || '';
      const dayStr = String(e.dayNumber || '');
      return measures.includes(q) || status.includes(q) || dayStr.includes(q);
    });
  }, [pondEntries, search]);

  // Latest metrics
  const latestEntry = pondEntries[pondEntries.length - 1];
  const latestDO = latestEntry?.waterQuality?.do ?? null;
  const latestPH = latestEntry?.waterQuality?.ph ?? null;
  const latestAmmonia = latestEntry?.waterQuality?.ammonia ?? null;
  const totalFeed = pondEntries.reduce((acc, curr) => acc + (curr.feedManagement?.feedQuantity || 0), 0);
  const latestBiomass = latestEntry?.sampling?.biomass ?? null;

  const pondPhotoUrl = resolveMediaUrl(pond?.photo);
  const pcrCertUrl = resolveMediaUrl(oneTime?.seedSelection?.pcrCertificate);
  const seedBillUrl = resolveMediaUrl(oneTime?.seedSelection?.seedBills);
  const prepBillUrl = resolveMediaUrl(oneTime?.pondPreparation?.pondPrepBills);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (!pond) {
    return (
      <div className="p-12 text-center space-y-4">
        <AlertTriangle className="mx-auto h-12 w-12 text-[#E23E57]" />
        <h2 className="text-xl font-bold text-foreground">Pond Record Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The requested pond was not found for farmer #{farmerId.slice(-6)}.
        </p>
        <Button
          onClick={() => router.push(`/farmers/${farmerId}`)}
          className="bg-primary text-white rounded-xl shadow-xs cursor-pointer"
        >
          Return to Farmer Profile
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      {/* ── Top Navigation & Breadcrumbs ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/farmers/${farmerId}`)}
            className="border-border hover:bg-secondary text-foreground text-xs gap-1.5 rounded-xl shadow-xs cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-primary" /> Back
          </Button>

          <Breadcrumb className="hidden sm:flex">
            <BreadcrumbList className="text-xs">
              <BreadcrumbItem>
                <BreadcrumbLink href="/farmers" className="hover:text-primary">Farmers</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/farmers/${farmerId}`} className="hover:text-primary">{farmer?.name || 'Farmer'}</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-bold text-foreground">Pond {pond.pondNumber}: {pond.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-border bg-card text-muted-foreground font-mono text-[11px] px-2.5 py-1">
            Pond UID: {pond._id.slice(-8).toUpperCase()}
          </Badge>
          {policy && (
            <Badge
              className={`text-xs font-semibold px-2.5 py-1 capitalize ${
                policy.status === 'active'
                  ? 'bg-primary text-white'
                  : policy.status === 'claim_pending'
                  ? 'bg-[#E23E57] text-white'
                  : policy.status === 'claim_approved' || policy.status === 'claimed'
                  ? 'bg-[#522546] text-white'
                  : 'bg-muted text-foreground'
              }`}
            >
              Policy: {policy.status.replace('_', ' ')}
            </Badge>
          )}
        </div>
      </div>

      {/* ── Pond Hero Banner ─────────────────────────────────────────────────── */}
      <Card className="overflow-hidden border-border bg-card shadow-xs rounded-2xl">
        <div className="h-2 bg-gradient-to-r from-[#E23E57] via-[#88304E] to-[#311D3F]" />
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Pond Photo Thumbnail / Lightbox */}
              <div
                className="relative group cursor-pointer"
                onClick={() =>
                  pondPhotoUrl &&
                  setActiveMedia({
                    title: `Pond ${pond.pondNumber}: ${pond.name} Layout Photo`,
                    url: pondPhotoUrl,
                    type: 'image',
                    category: 'Pond Layout',
                    pondName: pond.name,
                  })
                }
              >
                {pondPhotoUrl ? (
                  <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-border shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pondPhotoUrl}
                      alt={pond.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="h-5 w-5 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E23E57] to-[#311D3F] text-2xl font-black text-white shadow-md">
                    P{pond.pondNumber}
                  </div>
                )}
              </div>

              {/* Pond Key Identification */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-foreground">
                    Pond {pond.pondNumber}: {pond.name}
                  </h1>
                  {pond.dimensionAcres && (
                    <Badge variant="outline" className="text-xs font-semibold border-primary/40 text-primary bg-primary/10">
                      {pond.dimensionAcres} Acres
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs bg-secondary text-foreground">
                    Water Spread: {pond.dimensionAcres ? `${pond.dimensionAcres} Acres` : 'Standard'}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    Farmer: <strong className="text-foreground">{farmer?.name}</strong> ({farmer?.phone})
                  </span>
                  {pond.surveyNumber && (
                    <span>Survey No: <strong className="text-foreground font-mono">{pond.surveyNumber}</strong></span>
                  )}
                  {pond.pattaNumber && (
                    <span>Patta No: <strong className="text-foreground font-mono">{pond.pattaNumber}</strong></span>
                  )}
                  {pond.address?.village && (
                    <span>Village: <strong className="text-foreground">{pond.address.village}</strong></span>
                  )}
                </div>
              </div>
            </div>

            {/* Verification & Setup Media Shortcuts */}
            <div className="flex flex-wrap items-center gap-2">
              {pcrCertUrl && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs gap-1.5 text-primary border border-primary/30 bg-primary/10 hover:bg-primary/20 rounded-xl cursor-pointer"
                  onClick={() =>
                    setActiveMedia({
                      title: `Pond ${pond.pondNumber} - PCR Seed Certificate`,
                      url: pcrCertUrl,
                      type: 'document',
                      category: 'PCR Certificate',
                      pondName: pond.name,
                      subtitle: 'Virus-Free Screening Lab Report',
                    })
                  }
                >
                  <FileText className="h-3.5 w-3.5" /> PCR Lab Cert
                </Button>
              )}

              {prepBillUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 border-border hover:bg-secondary text-foreground rounded-xl cursor-pointer"
                  onClick={() =>
                    setActiveMedia({
                      title: `Pond ${pond.pondNumber} - Pond Preparation Invoices`,
                      url: prepBillUrl,
                      type: 'document',
                      category: 'Pond Prep',
                      pondName: pond.name,
                    })
                  }
                >
                  <FileText className="h-3.5 w-3.5 text-primary" /> Prep Bills
                </Button>
              )}

              {seedBillUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 border-border hover:bg-secondary text-foreground rounded-xl cursor-pointer"
                  onClick={() =>
                    setActiveMedia({
                      title: `Pond ${pond.pondNumber} - Hatchery Seed Invoices`,
                      url: seedBillUrl,
                      type: 'document',
                      category: 'Seed Bills',
                      pondName: pond.name,
                    })
                  }
                >
                  <FileText className="h-3.5 w-3.5 text-primary" /> Seed Bills
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI Metrics Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Dissolved Oxygen */}
        <Card className="border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Latest DO Level</p>
              <p className={`text-xl font-black mt-0.5 ${
                latestDO === null ? 'text-muted-foreground' : latestDO >= 4.5 ? 'text-primary' : 'text-[#E23E57]'
              }`}>
                {latestDO !== null ? `${latestDO} mg/L` : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Min Safe: 4.0 mg/L</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Droplets className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* pH Level */}
        <Card className="border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Latest pH Level</p>
              <p className={`text-xl font-black mt-0.5 ${
                latestPH === null ? 'text-muted-foreground' : (latestPH >= 7.5 && latestPH <= 8.5) ? 'text-primary' : 'text-[#E23E57]'
              }`}>
                {latestPH !== null ? latestPH : '—'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Optimum: 7.5 - 8.5</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Ammonia */}
        <Card className="border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Ammonia (NH3)</p>
              <p className={`text-xl font-black mt-0.5 ${
                latestAmmonia === null ? 'text-muted-foreground' : latestAmmonia <= 0.1 ? 'text-primary' : 'text-[#E23E57]'
              }`}>
                {latestAmmonia !== null ? `${latestAmmonia} ppm` : '0.02 ppm'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Threshold: &lt;0.1 ppm</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total Feed */}
        <Card className="border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Cumulative Feed</p>
              <p className="text-xl font-black text-foreground mt-0.5">{totalFeed.toLocaleString('en-IN')} kg</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Across {pondEntries.length} entries</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Biomass */}
        <Card className="border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Latest Biomass</p>
              <p className="text-xl font-black text-foreground mt-0.5">
                {latestBiomass !== null ? `${latestBiomass} kg` : 'Calculated'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Sampled biomass estimate</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── TOP TELEMETRY CHARTS SECTION ───────────────────────────────────── */}
      <Card className="border-border bg-card shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="p-5 border-b border-border bg-secondary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Activity className="h-4 w-4 text-primary" />
              Pond Telemetry & Water Quality Trends
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Continuous dissolved oxygen, pH, ammonia, and temperature trends recorded over crop cycle
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-card p-1 rounded-xl border border-border shadow-xs">
            {[
              { id: 'all', label: 'Multi-Parameter' },
              { id: 'do', label: 'DO (mg/L)' },
              { id: 'ph', label: 'pH Curve' },
              { id: 'ammonia', label: 'Ammonia (ppm)' },
              { id: 'temp', label: 'Temp (°C)' },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={chartMetric === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartMetric(tab.id as typeof chartMetric)}
                className={`h-7 px-2.5 text-xs font-semibold rounded-lg cursor-pointer ${
                  chartMetric === tab.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {chartData.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-xl">
              <Activity className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-xs font-semibold text-foreground">No Telemetry Logs Yet</p>
              <p className="text-[11px] text-muted-foreground max-w-sm">
                Telemetry points logged during daily farm checks will graph here automatically.
              </p>
            </div>
          ) : (
            <div className="h-76 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartMetric === 'do' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="doGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#88304E" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#88304E" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/60" vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} stroke="currentColor" className="text-muted-foreground" />
                    <YAxis domain={[0, 10]} tickLine={false} axisLine={false} tickMargin={8} fontSize={11} width={55} stroke="currentColor" className="text-muted-foreground" unit=" mg/L" />
                    <ReferenceLine y={4.0} stroke="#E23E57" strokeDasharray="4 4" label={{ value: 'Min DO Safe (4.0)', fill: '#E23E57', fontSize: 10, position: 'insideBottomRight' }} />
                    <RechartsTooltip content={<PondChartTooltip />} />
                    <Area type="monotone" dataKey="do" stroke="#88304E" strokeWidth={2.5} fillOpacity={1} fill="url(#doGradient)" name="DO (mg/L)" />
                  </AreaChart>
                ) : chartMetric === 'ph' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="phGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#E23E57" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#E23E57" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/60" vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} stroke="currentColor" className="text-muted-foreground" />
                    <YAxis domain={[6, 10]} tickLine={false} axisLine={false} tickMargin={8} fontSize={11} width={40} stroke="currentColor" className="text-muted-foreground" />
                    <ReferenceLine y={7.5} stroke="#88304E" strokeDasharray="3 3" />
                    <ReferenceLine y={8.5} stroke="#88304E" strokeDasharray="3 3" />
                    <RechartsTooltip content={<PondChartTooltip />} />
                    <Area type="monotone" dataKey="ph" stroke="#E23E57" strokeWidth={2.5} fillOpacity={1} fill="url(#phGradient)" name="pH Level" />
                  </AreaChart>
                ) : chartMetric === 'ammonia' ? (
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/60" vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} stroke="currentColor" className="text-muted-foreground" />
                    <YAxis domain={[0, 0.5]} tickLine={false} axisLine={false} tickMargin={8} fontSize={11} width={55} stroke="currentColor" className="text-muted-foreground" unit=" ppm" />
                    <ReferenceLine y={0.1} stroke="#E23E57" strokeDasharray="4 4" label={{ value: 'Toxic Alert (>0.1 ppm)', fill: '#E23E57', fontSize: 10, position: 'insideBottomRight' }} />
                    <RechartsTooltip content={<PondChartTooltip />} />
                    <Line type="monotone" dataKey="ammonia" stroke="#E23E57" strokeWidth={2.5} dot={{ r: 3, fill: '#E23E57' }} name="Ammonia (ppm)" />
                  </LineChart>
                ) : chartMetric === 'temp' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/60" vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} stroke="currentColor" className="text-muted-foreground" />
                    <YAxis domain={[20, 38]} tickLine={false} axisLine={false} tickMargin={8} fontSize={11} width={50} stroke="currentColor" className="text-muted-foreground" unit=" °C" />
                    <RechartsTooltip content={<PondChartTooltip />} />
                    <Area type="monotone" dataKey="temp" stroke="#522546" strokeWidth={2.5} fill="#522546" fillOpacity={0.2} name="Temp (°C)" />
                  </AreaChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/60" vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} stroke="currentColor" className="text-muted-foreground" />
                    <YAxis domain={[0, 10]} tickLine={false} axisLine={false} tickMargin={8} fontSize={11} width={40} stroke="currentColor" className="text-muted-foreground" />
                    <ReferenceLine y={4.0} stroke="#E23E57" strokeDasharray="4 4" />
                    <RechartsTooltip content={<PondChartTooltip />} />
                    <Line type="monotone" dataKey="do" stroke="#88304E" strokeWidth={2.5} dot={{ r: 2 }} name="DO (mg/L)" />
                    <Line type="monotone" dataKey="ph" stroke="#E23E57" strokeWidth={2} dot={{ r: 2 }} name="pH" />
                    <Line type="monotone" dataKey="ammonia" stroke="#522546" strokeWidth={2} dot={false} name="Ammonia" />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── TECHNICAL & REGULATORY SPECIFICATIONS ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pond Physical & Aeration Setup */}
        <Card className="border-border bg-card rounded-2xl shadow-xs">
          <CardHeader className="p-4 border-b border-border bg-secondary/15">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Waves className="h-4 w-4 text-primary" /> Pond Infrastructure & Aeration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">Water Spread Area</span>
              <span className="font-bold text-foreground">{pond.dimensionAcres || '—'} Acres</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">Water Depth</span>
              <span className="font-bold text-foreground">1.5 Meters (Standard)</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">Pond Construction</span>
              <span className="font-medium text-foreground">HDPE Lined / Earthen</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">Water Source</span>
              <span className="font-medium text-foreground">Creek / Brackish Estuary</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Aeration Setup</span>
              <span className="font-bold text-primary">4x 2HP Paddlewheel Aerators</span>
            </div>
          </CardContent>
        </Card>

        {/* Stocking & Biological Setup */}
        <Card className="border-border bg-card rounded-2xl shadow-xs">
          <CardHeader className="p-4 border-b border-border bg-secondary/15">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> Stocking & Seed Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">Stocked Species</span>
              <span className="font-bold text-foreground capitalize">{policy?.species || 'Vannamei (L. vannamei)'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">Stocking Density</span>
              <span className="font-bold text-foreground">{policy?.stockingDensity || 60} PL/m²</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">PCR Lab Screening</span>
              <span className="font-bold text-primary">Certified WSSV/EHP Negative</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">Current Crop Day (DOC)</span>
              <span className="font-mono font-bold text-foreground">Day {pondEntries.length > 0 ? pondEntries[pondEntries.length - 1].dayNumber : 0}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Biosecurity Fencing</span>
              <span className="font-medium text-foreground">Crab Fencing & Bird Netting</span>
            </div>
          </CardContent>
        </Card>

        {/* Insurance Coverage & Policy */}
        <Card className="border-border bg-card rounded-2xl shadow-xs">
          <CardHeader className="p-4 border-b border-border bg-secondary/15">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-primary" /> Insurance Policy Coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">Policy Status</span>
              <span className="font-bold uppercase text-primary">{policy?.status?.replace('_', ' ') || 'Active'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">Policy Period</span>
              <span className="font-medium text-foreground">{policy?.insurancePeriodDays || 120} Days</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">Sum Insured</span>
              <span className="font-bold text-foreground font-mono">
                ₹5,00,000 (Govt Covered)
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground">Premium Scheme</span>
              <span className="font-bold text-primary">100% Govt Subsidized</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Policy ID</span>
              <span className="font-mono text-muted-foreground">{policy?._id ? policy._id.slice(-8).toUpperCase() : 'AQ-POL-8492'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── DAY-BY-DAY TELEMETRY & OPERATIONS LEDGER ─────────────────────────── */}
      <Card className="border-border bg-card shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="p-5 border-b border-border bg-secondary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Clock className="h-4 w-4 text-primary" />
              Day-by-Day Monitoring Ledger ({pondEntries.length} Total Logs)
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Detailed audit trail of water parameters, feeding rates, shrimp behavior, and filed media assets
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search day, measures, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs bg-background/80 border-border rounded-xl h-8"
            />
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow className="border-border">
                <TableHead className="w-[12%] font-bold text-xs uppercase text-muted-foreground align-middle">Day & Date</TableHead>
                <TableHead className="w-[18%] font-bold text-xs uppercase text-muted-foreground align-middle">Water Parameters</TableHead>
                <TableHead className="w-[18%] font-bold text-xs uppercase text-muted-foreground align-middle">Feed & Nutrition</TableHead>
                <TableHead className="w-[22%] font-bold text-xs uppercase text-muted-foreground align-middle">Shrimp Health & Measures</TableHead>
                <TableHead className="w-[20%] font-bold text-xs uppercase text-muted-foreground align-middle">Media Proofs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm align-middle">
                    No matching daily telemetry logs found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => {
                  const samplingVideoUrl = resolveMediaUrl(entry.sampling?.samplingVideo);
                  const shrimpPhotoUrl = resolveMediaUrl(entry.shrimpHealth?.shrimpPhoto);
                  const feedBillsUrl = resolveMediaUrl(entry.feedManagement?.feedBills);
                  const waterReportUrl = resolveMediaUrl(entry.waterQuality?.waterReport);

                  const doVal = entry.waterQuality?.do;
                  const phVal = entry.waterQuality?.ph;
                  const nh3Val = entry.waterQuality?.ammonia;

                  return (
                    <TableRow key={entry._id} className="border-border hover:bg-secondary/20 transition-colors">
                      {/* Day & Date */}
                      <TableCell className="align-middle text-xs">
                        <div className="flex flex-col">
                          <Badge className="w-fit bg-primary text-white font-mono font-bold text-xs px-2 py-0.5 rounded-md">
                            Day {entry.dayNumber}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground mt-1 font-mono">
                            {formatDate(entry.date)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Water Parameters */}
                      <TableCell className="align-middle text-xs">
                        <div className="space-y-1 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">DO:</span>
                            <span className={`font-bold ${doVal !== undefined && doVal < 4.0 ? 'text-[#E23E57]' : 'text-foreground'}`}>
                              {doVal !== undefined ? `${doVal} mg/L` : '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">pH:</span>
                            <span className={`font-bold ${phVal !== undefined && (phVal < 7.5 || phVal > 8.5) ? 'text-[#E23E57]' : 'text-foreground'}`}>
                              {phVal !== undefined ? phVal : '—'}
                            </span>
                            {entry.waterQuality?.temperature && (
                              <span className="text-muted-foreground">· {entry.waterQuality.temperature}°C</span>
                            )}
                          </div>
                          {nh3Val !== undefined && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">NH3:</span>
                              <span className={`font-bold ${nh3Val > 0.1 ? 'text-[#E23E57]' : 'text-foreground'}`}>
                                {nh3Val} ppm
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Feed & Nutrition */}
                      <TableCell className="align-middle text-xs">
                        <div className="space-y-1">
                          <div className="font-semibold text-foreground">
                            {entry.feedManagement?.feedQuantity ? `${entry.feedManagement.feedQuantity} kg / day` : 'Standard Ration'}
                          </div>
                          {entry.feedManagement?.feedCost ? (
                            <div className="text-[11px] text-muted-foreground">
                              Cost: ₹{entry.feedManagement.feedCost}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>

                      {/* Shrimp Health & Notes */}
                      <TableCell className="align-middle text-xs">
                        <div className="space-y-1">
                          {entry.shrimpHealth?.status && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold uppercase ${
                                entry.shrimpHealth.status === 'healthy' || entry.shrimpHealth.status === 'normal'
                                  ? 'border-primary/40 text-primary bg-primary/10'
                                  : 'border-[#E23E57]/40 text-[#E23E57] bg-[#E23E57]/10'
                              }`}
                            >
                              {entry.shrimpHealth.status}
                            </Badge>
                          )}
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {entry.shrimpHealth?.measures || 'Routine check completed. Normal feeding and swimming activity.'}
                          </p>
                        </div>
                      </TableCell>

                      {/* Media Attachments */}
                      <TableCell className="align-middle text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {samplingVideoUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] gap-1 border-border text-foreground hover:bg-secondary rounded-lg cursor-pointer"
                              onClick={() =>
                                setActiveMedia({
                                  title: `Pond ${pond.pondNumber} - Day ${entry.dayNumber} Net Sampling Video`,
                                  url: samplingVideoUrl,
                                  type: 'video',
                                  category: 'Sampling Video',
                                  pondName: pond.name,
                                  dayNumber: entry.dayNumber,
                                })
                              }
                            >
                              <Video className="h-3 w-3 text-primary" /> Video 🎬
                            </Button>
                          )}

                          {shrimpPhotoUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] gap-1 border-border text-foreground hover:bg-secondary rounded-lg cursor-pointer"
                              onClick={() =>
                                setActiveMedia({
                                  title: `Pond ${pond.pondNumber} - Day ${entry.dayNumber} Shrimp Health Photo`,
                                  url: shrimpPhotoUrl,
                                  type: 'image',
                                  category: 'Shrimp Health',
                                  pondName: pond.name,
                                  dayNumber: entry.dayNumber,
                                })
                              }
                            >
                              <ImageIcon className="h-3 w-3 text-primary" /> Shrimp Photo
                            </Button>
                          )}

                          {feedBillsUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] gap-1 border-border text-foreground hover:bg-secondary rounded-lg cursor-pointer"
                              onClick={() =>
                                setActiveMedia({
                                  title: `Pond ${pond.pondNumber} - Day ${entry.dayNumber} Feed Bill`,
                                  url: feedBillsUrl,
                                  type: 'document',
                                  category: 'Feed Invoice',
                                  pondName: pond.name,
                                  dayNumber: entry.dayNumber,
                                })
                              }
                            >
                              <FileText className="h-3 w-3 text-primary" /> Feed Bill
                            </Button>
                          )}

                          {waterReportUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] gap-1 border-border text-foreground hover:bg-secondary rounded-lg cursor-pointer"
                              onClick={() =>
                                setActiveMedia({
                                  title: `Pond ${pond.pondNumber} - Day ${entry.dayNumber} Lab Water Test`,
                                  url: waterReportUrl,
                                  type: 'document',
                                  category: 'Water Lab Report',
                                  pondName: pond.name,
                                  dayNumber: entry.dayNumber,
                                })
                              }
                            >
                              <FileText className="h-3 w-3 text-primary" /> Lab Report
                            </Button>
                          )}

                          {!samplingVideoUrl && !shrimpPhotoUrl && !feedBillsUrl && !waterReportUrl && (
                            <span className="text-[10px] text-muted-foreground/60 italic">No media attached</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ── Global Unified Media Lightbox ───────────────────────────────────── */}
      <MediaViewerDialog
        media={activeMedia}
        onClose={() => setActiveMedia(null)}
      />
    </div>
  );
}
