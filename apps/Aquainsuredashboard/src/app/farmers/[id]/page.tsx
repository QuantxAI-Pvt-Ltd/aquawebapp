'use client';

import { useEffect, useState, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Phone,
  Calendar,
  MapPin,
  CreditCard,
  FileText,
  Waves,
  ShieldCheck,
  Building2,
  ExternalLink,
  ZoomIn,
  Download,
  AlertCircle,
  Clock,
  Eye,
  Video as VideoIcon,
  Image as ImageIcon,
  Sparkles,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/formatters';
import { apiFetch } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/fileUtils';
import { MediaViewerDialog, type MediaViewerTarget } from '@/components/ui/media-viewer-dialog';
import type {
  FarmerDetailData,
  ApiResponse,
  Pond,
  Farm,
  Insurance,
  DailyEntry,
  OneTimeEntry,
  VaultMediaItem,
} from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function FarmerDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const farmerId = resolvedParams.id;
  const router = useRouter();

  const [farmer, setFarmer] = useState<FarmerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Additional fine-grained farmer entries & vault data
  const [entriesData, setEntriesData] = useState<{ dailyEntries: DailyEntry[]; oneTimeEntries: OneTimeEntry[] }>({
    dailyEntries: [],
    oneTimeEntries: [],
  });
  const [vaultMedia, setVaultMedia] = useState<VaultMediaItem[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  // Unified Media Viewer Lightbox State
  const [activeMedia, setActiveMedia] = useState<MediaViewerTarget | null>(null);

  // Filters for Day-by-Day & Media Vault tabs
  const [selectedPondFilter, setSelectedPondFilter] = useState<string>('all');
  const [vaultCategoryFilter, setVaultCategoryFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchFarmerAndMedia() {
      setLoading(true);
      setError(null);
      try {
        const json = await apiFetch<ApiResponse<FarmerDetailData>>(`/api/dashboard/farmers/${farmerId}`);
        if (json.success && json.data) {
          setFarmer(json.data);
        } else {
          setError(json.error || 'Farmer not found');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load farmer profile';
        setError(message);
      } finally {
        setLoading(false);
      }

      // Fetch all farmer entries and media vault asynchronously
      setEntriesLoading(true);
      try {
        const [entriesRes, vaultRes] = await Promise.all([
          apiFetch<ApiResponse<{ dailyEntries: DailyEntry[]; oneTimeEntries: OneTimeEntry[] }>>(
            `/api/dashboard/farmers/${farmerId}/entries`
          ).catch(() => null),
          apiFetch<ApiResponse<VaultMediaItem[]>>(
            `/api/dashboard/farmers/${farmerId}/media-vault`
          ).catch(() => null),
        ]);

        if (entriesRes && entriesRes.success && entriesRes.data) {
          setEntriesData(entriesRes.data);
        }
        if (vaultRes && vaultRes.success && vaultRes.data) {
          setVaultMedia(vaultRes.data);
        }
      } catch (e) {
        console.error('Error fetching farmer entries / vault:', e);
      } finally {
        setEntriesLoading(false);
      }
    }
    fetchFarmerAndMedia();
  }, [farmerId]);

  // Filtered daily entries based on pond selection
  const filteredDailyEntries = useMemo(() => {
    if (selectedPondFilter === 'all') return entriesData.dailyEntries;
    return entriesData.dailyEntries.filter((e) => String(e.pondId) === selectedPondFilter);
  }, [entriesData.dailyEntries, selectedPondFilter]);

  // Filtered vault media
  const filteredVaultMedia = useMemo(() => {
    return vaultMedia.filter((item) => {
      const matchesPond =
        selectedPondFilter === 'all' || !item.pondId || String(item.pondId) === selectedPondFilter;
      const matchesCategory =
        vaultCategoryFilter === 'all' ||
        (vaultCategoryFilter === 'video' && item.mediaType === 'video') ||
        (vaultCategoryFilter === 'photo' && item.mediaType === 'image') ||
        (vaultCategoryFilter === 'document' && item.mediaType === 'document') ||
        item.category === vaultCategoryFilter;
      return matchesPond && matchesCategory;
    });
  }, [vaultMedia, selectedPondFilter, vaultCategoryFilter]);

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24" />
        </div>
        <Card className="border-border/50 bg-card/60 p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (error || !farmer) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-lg font-semibold">Unable to Load Farmer Profile</h2>
        <p className="text-sm text-muted-foreground max-w-md">{error || 'Farmer profile could not be found.'}</p>
        <Button variant="outline" onClick={() => router.push('/farmers')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Return to Farmers List
        </Button>
      </div>
    );
  }

  const profilePhotoUrl = resolveMediaUrl(farmer.identity?.photo);
  const aadharUrl = resolveMediaUrl(farmer.identity?.aadharFile);
  const panUrl = resolveMediaUrl(farmer.identity?.panFile);
  const regCertUrl = resolveMediaUrl(farmer.registration?.regCertificate);

  return (
    <div className="animate-fade-in space-y-6 pb-16">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/farmers')}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Farmers
        </Button>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">ID: {farmer._id}</span>
          <Badge variant="outline" className="border-blue-500/40 text-blue-400 bg-blue-500/10 uppercase font-semibold tracking-wider">
            🏛️ PMMSY / State Subsidized
          </Badge>
          {farmer.registration?.regType && (
            <Badge variant="outline" className="uppercase font-semibold tracking-wider">
              {farmer.registration.regType} Verified
            </Badge>
          )}
        </div>
      </div>

      {/* ── Hero Profile Header ────────────────────────────────────────────── */}
      <Card className="border-border/50 bg-card/70 backdrop-blur-xl overflow-hidden shadow-lg shadow-black/5">
        <div className="h-2 bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500" />
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Avatar or Photo */}
              <div className="relative group shrink-0">
                {profilePhotoUrl ? (
                  <div className="h-20 w-20 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-md bg-black/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profilePhotoUrl}
                      alt={farmer.name}
                      className="h-full w-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                      onClick={() =>
                        setActiveMedia({
                          title: `${farmer.name}'s Portrait Photo`,
                          url: profilePhotoUrl,
                          category: 'Identity',
                          type: 'image',
                        })
                      }
                    />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-2xl font-bold text-white shadow-md">
                    {farmer.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {profilePhotoUrl && (
                  <button
                    onClick={() =>
                      setActiveMedia({
                        title: `${farmer.name}'s Portrait Photo`,
                        url: profilePhotoUrl,
                        category: 'Identity',
                        type: 'image',
                      })
                    }
                    className="absolute bottom-1 right-1 rounded-full bg-black/70 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Inspect Photo"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Identity info */}
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">{farmer.name}</h1>
                  {farmer.identity?.aadharNumber && (
                    <Badge variant="secondary" className="text-xs font-mono">
                      Aadhaar Linked
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-y-1 gap-x-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Phone className="h-3.5 w-3.5 text-blue-400" />
                    {farmer.phone}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-rose-400" />
                    {[farmer.address?.village, farmer.address?.taluk, farmer.address?.district].filter(Boolean).join(', ')}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs">
                    <Calendar className="h-3.5 w-3.5 text-amber-400" />
                    Enrolled {formatDate(farmer.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-border/50 pt-4 md:pt-0 md:pl-6">
              <div className="text-center px-3">
                <p className="text-2xl font-bold text-foreground">{farmer.farms?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Farms</p>
              </div>
              <div className="h-8 w-px bg-border/50" />
              <div className="text-center px-3">
                <p className="text-2xl font-bold text-cyan-400">{farmer.ponds?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Ponds</p>
              </div>
              <div className="h-8 w-px bg-border/50" />
              <div className="text-center px-3">
                <p className="text-2xl font-bold text-emerald-400">{entriesData.dailyEntries?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Daily Logs</p>
              </div>
              <div className="h-8 w-px bg-border/50" />
              <div className="text-center px-3">
                <p className="text-2xl font-bold text-indigo-400">{vaultMedia?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Media Files</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Main Tabbed Sections Grouped for this Farmer ──────────────────── */}
      <Tabs defaultValue="daily-logs" className="space-y-6">
        <TabsList className="bg-card/70 border border-border/50 p-1.5 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-1">
          <TabsTrigger value="daily-logs" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Clock className="h-4 w-4" /> Day-by-Day Logs & Videos ({entriesData.dailyEntries?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="vault" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Sparkles className="h-4 w-4 text-amber-300" /> Media & Video Vault ({vaultMedia?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="farms" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Waves className="h-4 w-4" /> Farms & Ponds ({farmer.farms?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="kyc" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="h-4 w-4" /> Personal & KYC
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: DAY-BY-DAY DAILY LOGS & VIDEOS ─────────────────────────── */}
        <TabsContent value="daily-logs" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-card/40 p-4 rounded-xl border border-border/40">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" /> Operational Daily Entry Timeline
              </h2>
              <p className="text-xs text-muted-foreground">
                Inspect cast-net sampling videos, shrimp health photos, feed invoices, and water quality tests logged day-by-day.
              </p>
            </div>

            {/* Pond Filter */}
            {farmer.ponds && farmer.ponds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5" /> Pond:
                </span>
                <select
                  value={selectedPondFilter}
                  onChange={(e) => setSelectedPondFilter(e.target.value)}
                  className="bg-background border border-border text-foreground text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Ponds ({farmer.ponds.length})</option>
                  {farmer.ponds.map((p) => (
                    <option key={p._id} value={String(p._id)}>
                      Pond {p.pondNumber}: {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {entriesLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : filteredDailyEntries.length === 0 ? (
            <Card className="border-border/50 bg-card/60 p-12 text-center">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No Daily Log Entries Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                No continuous daily monitoring logs have been submitted by this farmer for the selected pond filter yet.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredDailyEntries.map((entry) => {
                const samplingVideoUrl = resolveMediaUrl(entry.sampling?.samplingVideo);
                const shrimpPhotoUrl = resolveMediaUrl(entry.shrimpHealth?.shrimpPhoto);
                const feedBillsUrl = resolveMediaUrl(entry.feedManagement?.feedBills);
                const waterReportUrl = resolveMediaUrl(entry.waterQuality?.waterReport);
                const miscBillsUrl = resolveMediaUrl(entry.financials?.miscBills);
                const elecBillsUrl = resolveMediaUrl(entry.financials?.electricityBills);
                const labReportUrl = resolveMediaUrl(entry.shrimpHealth?.labReport);

                const hasAnyMedia = Boolean(
                  samplingVideoUrl ||
                    shrimpPhotoUrl ||
                    feedBillsUrl ||
                    waterReportUrl ||
                    miscBillsUrl ||
                    elecBillsUrl ||
                    labReportUrl
                );

                return (
                  <Card key={entry._id} className="border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden hover:border-primary/40 transition-colors">
                    <CardHeader className="pb-3 border-b border-border/30 bg-background/30">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <Badge variant="default" className="bg-gradient-to-r from-blue-600 to-cyan-600 text-xs font-mono font-bold px-2.5 py-0.5">
                            Day {entry.dayNumber}
                          </Badge>
                          <span className="font-semibold text-sm text-foreground">
                            {entry.pondName || 'Aquaculture Pond'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            📅 {formatDate(entry.date)}
                          </span>
                        </div>

                        {entry.shrimpHealth?.status && (
                          <Badge
                            variant={entry.shrimpHealth.status === 'normal' ? 'default' : 'destructive'}
                            className="capitalize text-xs font-semibold px-2"
                          >
                            {entry.shrimpHealth.status === 'normal' ? '✓ Health Normal' : '⚠ Health Deficiency'}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4">
                      {/* Metric summary grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
                        <div className="bg-background/50 p-2.5 rounded-lg border border-border/30">
                          <span className="text-muted-foreground text-[10px] uppercase font-medium block">DO (Oxygen)</span>
                          <span className="font-bold text-cyan-400 text-sm">
                            {entry.waterQuality?.do ? `${entry.waterQuality.do} mg/L` : '—'}
                          </span>
                        </div>
                        <div className="bg-background/50 p-2.5 rounded-lg border border-border/30">
                          <span className="text-muted-foreground text-[10px] uppercase font-medium block">Water pH</span>
                          <span className="font-bold text-foreground text-sm">
                            {entry.waterQuality?.ph ?? '—'}
                          </span>
                        </div>
                        <div className="bg-background/50 p-2.5 rounded-lg border border-border/30">
                          <span className="text-muted-foreground text-[10px] uppercase font-medium block">Temperature</span>
                          <span className="font-bold text-amber-400 text-sm">
                            {entry.waterQuality?.temperature ? `${entry.waterQuality.temperature}°C` : '—'}
                          </span>
                        </div>
                        <div className="bg-background/50 p-2.5 rounded-lg border border-border/30">
                          <span className="text-muted-foreground text-[10px] uppercase font-medium block">Feed Quantity</span>
                          <span className="font-bold text-foreground text-sm">
                            {entry.feedManagement?.feedQuantity ? `${entry.feedManagement.feedQuantity} kg` : '—'}
                          </span>
                        </div>
                        <div className="bg-background/50 p-2.5 rounded-lg border border-border/30">
                          <span className="text-muted-foreground text-[10px] uppercase font-medium block">Survival Rate</span>
                          <span className="font-bold text-emerald-400 text-sm">
                            {entry.sampling?.survival ? `${entry.sampling.survival}%` : '—'}
                          </span>
                        </div>
                        <div className="bg-background/50 p-2.5 rounded-lg border border-border/30">
                          <span className="text-muted-foreground text-[10px] uppercase font-medium block">Est. Biomass</span>
                          <span className="font-bold text-indigo-400 text-sm">
                            {entry.sampling?.biomass ? `${entry.sampling.biomass} kg` : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Attached Media Action Strip */}
                      <div className="pt-2 border-t border-border/30 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-muted-foreground mr-1">Uploaded Evidence:</span>

                          {/* Sampling Video Button */}
                          {samplingVideoUrl ? (
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8 gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm"
                              onClick={() =>
                                setActiveMedia({
                                  title: `Day ${entry.dayNumber} - Field Sampling Video`,
                                  url: samplingVideoUrl,
                                  type: 'video',
                                  category: 'Daily Sampling',
                                  dayNumber: entry.dayNumber,
                                  pondName: entry.pondName,
                                  timestamp: entry.date,
                                  subtitle: `Cast net vitality footage for ${entry.pondName}`,
                                })
                              }
                            >
                              <Play className="h-3.5 w-3.5 fill-current" /> Watch Sampling Video 🎬
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60 italic">No video</span>
                          )}

                          {/* Shrimp Health Photo Button */}
                          {shrimpPhotoUrl && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 gap-1.5 text-xs font-medium border border-cyan-500/30 text-cyan-300"
                              onClick={() =>
                                setActiveMedia({
                                  title: `Day ${entry.dayNumber} - Shrimp Health Photo`,
                                  url: shrimpPhotoUrl,
                                  type: 'image',
                                  category: 'Shrimp Health',
                                  dayNumber: entry.dayNumber,
                                  pondName: entry.pondName,
                                  timestamp: entry.date,
                                  subtitle: `Health inspection photo (${entry.shrimpHealth?.status || 'Normal'})`,
                                })
                              }
                            >
                              <ImageIcon className="h-3.5 w-3.5" /> Shrimp Photo 🦐
                            </Button>
                          )}

                          {/* Feed Purchase Bill */}
                          {feedBillsUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs font-medium"
                              onClick={() =>
                                setActiveMedia({
                                  title: `Day ${entry.dayNumber} - Feed Purchase Invoice`,
                                  url: feedBillsUrl,
                                  type: 'document',
                                  category: 'Feed Invoice',
                                  dayNumber: entry.dayNumber,
                                  pondName: entry.pondName,
                                  timestamp: entry.date,
                                })
                              }
                            >
                              <FileText className="h-3.5 w-3.5 text-amber-400" /> Feed Bill 🧾
                            </Button>
                          )}

                          {/* Water Quality Lab Report */}
                          {waterReportUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs font-medium"
                              onClick={() =>
                                setActiveMedia({
                                  title: `Day ${entry.dayNumber} - Water Test Lab Report`,
                                  url: waterReportUrl,
                                  type: 'document',
                                  category: 'Water Report',
                                  dayNumber: entry.dayNumber,
                                  pondName: entry.pondName,
                                  timestamp: entry.date,
                                })
                              }
                            >
                              <FileText className="h-3.5 w-3.5 text-blue-400" /> Water Report 🧪
                            </Button>
                          )}

                          {/* Misc Bills */}
                          {miscBillsUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                setActiveMedia({
                                  title: `Day ${entry.dayNumber} - Misc Expense Bill`,
                                  url: miscBillsUrl,
                                  type: 'document',
                                  category: 'Misc Expense',
                                  dayNumber: entry.dayNumber,
                                  pondName: entry.pondName,
                                  timestamp: entry.date,
                                })
                              }
                            >
                              <FileText className="h-3.5 w-3.5" /> Misc Bill
                            </Button>
                          )}

                          {/* Electricity / Generator Bills */}
                          {elecBillsUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                setActiveMedia({
                                  title: `Day ${entry.dayNumber} - Power & Fuel Invoice`,
                                  url: elecBillsUrl,
                                  type: 'document',
                                  category: 'Power Bill',
                                  dayNumber: entry.dayNumber,
                                  pondName: entry.pondName,
                                  timestamp: entry.date,
                                })
                              }
                            >
                              <FileText className="h-3.5 w-3.5" /> Power Bill
                            </Button>
                          )}
                        </div>

                        {!hasAnyMedia && (
                          <span className="text-[11px] text-muted-foreground/60 italic">
                            No files attached for this day.
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 2: MASTER MEDIA & VIDEO VAULT ─────────────────────────────── */}
        <TabsContent value="vault" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/40 p-4 rounded-xl border border-border/40">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" /> Centralized Media Vault for {farmer.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                All photos, field videos, invoices, and lab certificates uploaded by this farmer aggregated in one searchable gallery.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Category Filter */}
              <div className="flex items-center gap-1 bg-background/80 p-1 rounded-lg border border-border/40 text-xs">
                {[
                  { label: 'All', val: 'all' },
                  { label: 'Videos 🎬', val: 'video' },
                  { label: 'Photos 📸', val: 'photo' },
                  { label: 'Docs / Bills 🧾', val: 'document' },
                ].map((cat) => (
                  <button
                    key={cat.val}
                    onClick={() => setVaultCategoryFilter(cat.val)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      vaultCategoryFilter === cat.val
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Pond Filter */}
              {farmer.ponds && farmer.ponds.length > 0 && (
                <select
                  value={selectedPondFilter}
                  onChange={(e) => setSelectedPondFilter(e.target.value)}
                  className="bg-background border border-border text-foreground text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Ponds</option>
                  {farmer.ponds.map((p) => (
                    <option key={p._id} value={String(p._id)}>
                      Pond {p.pondNumber}: {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {entriesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : filteredVaultMedia.length === 0 ? (
            <Card className="border-border/50 bg-card/60 p-12 text-center">
              <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No Media Files Matching Filter</h3>
              <p className="text-xs text-muted-foreground mt-1">Try clearing or selecting a different media filter.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredVaultMedia.map((item) => (
                <div
                  key={item.id}
                  onClick={() =>
                    setActiveMedia({
                      title: item.title,
                      url: item.url,
                      type: item.mediaType,
                      category: item.category,
                      subtitle: item.subtitle,
                      pondName: item.pondName,
                      dayNumber: item.dayNumber,
                      timestamp: item.timestamp,
                    })
                  }
                  className="group relative rounded-xl border border-border/40 bg-card/50 overflow-hidden hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer flex flex-col justify-between"
                >
                  {/* Media Visual Area */}
                  <div className="relative h-36 w-full bg-black/40 overflow-hidden flex items-center justify-center">
                    {item.mediaType === 'video' ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
                        <video src={item.url} className="w-full h-full object-cover opacity-60" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="rounded-full bg-rose-600/90 text-white p-3 shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="h-5 w-5 fill-current" />
                          </div>
                        </div>
                        <Badge className="absolute bottom-2 right-2 bg-black/70 text-[10px] text-white">
                          VIDEO 🎬
                        </Badge>
                      </div>
                    ) : item.mediaType === 'document' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-500/10 to-indigo-500/10 p-4 text-center">
                        <FileText className="h-10 w-10 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-medium text-foreground truncate max-w-full">
                          {item.title}
                        </span>
                        <Badge variant="outline" className="mt-2 text-[9px] uppercase tracking-wider">
                          PDF Document
                        </Badge>
                      </div>
                    ) : (
                      <div className="w-full h-full relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.url}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <ZoomIn className="h-6 w-6 text-white drop-shadow-md" />
                        </div>
                      </div>
                    )}

                    {/* Top badging */}
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-background/80 backdrop-blur-md">
                        {item.category}
                      </Badge>
                      {item.dayNumber !== undefined && (
                        <Badge variant="default" className="text-[10px] font-mono bg-blue-600">
                          Day {item.dayNumber}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Metadata Description */}
                  <div className="p-3 bg-card/80 border-t border-border/30 space-y-1">
                    <p className="font-semibold text-xs text-foreground truncate" title={item.title}>
                      {item.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                    <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground/80">
                      <span>{item.pondName || 'General'}</span>
                      {item.timestamp && <span>{new Date(item.timestamp).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 3: FARMS & PONDS SETUP ────────────────────────────────────── */}
        <TabsContent value="farms" className="space-y-6">
          {!farmer.farms || farmer.farms.length === 0 ? (
            <Card className="border-border/50 bg-card/60 p-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No aquaculture farms registered under this farmer.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {farmer.farms.map((farm: Farm, idx: number) => {
                const farmPonds = farmer.ponds?.filter((p) => String(p.farmId) === String(farm._id)) || [];
                const farmPhotoUrl = resolveMediaUrl(farm.farmPhoto);

                return (
                  <Card key={farm._id} className="border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden shadow-sm">
                    <CardHeader className="bg-background/40 border-b border-border/40 pb-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                            #{idx + 1}
                          </div>
                          <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                              {farm.name || `Aquaculture Farm ${idx + 1}`}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {[farm.location?.place, farm.location?.taluk, farm.location?.district].filter(Boolean).join(', ')}
                            </CardDescription>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {farmPhotoUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs gap-1.5"
                              onClick={() =>
                                setActiveMedia({
                                  title: `${farm.name || 'Farm'} Photo`,
                                  url: farmPhotoUrl,
                                  type: 'image',
                                  category: 'Farm Asset',
                                })
                              }
                            >
                              <ImageIcon className="h-3.5 w-3.5 text-cyan-400" /> Farm Photo
                            </Button>
                          )}
                          <Badge variant="outline" className="text-xs font-semibold uppercase">
                            Ownership: {farm.ownership?.type || 'Owned'}
                          </Badge>
                          <Badge variant="secondary" className="text-xs font-semibold">
                            {farmPonds.length} Ponds
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5">
                      {farmPonds.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-3">No ponds configured under this farm.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {farmPonds.map((pond: Pond) => {
                            const pondPhotoUrl = resolveMediaUrl(pond.photo);
                            const oneTime = entriesData.oneTimeEntries.find((ot) => String(ot.pondId) === String(pond._id));
                            const pcrCertUrl = resolveMediaUrl(oneTime?.seedSelection?.pcrCertificate);
                            const seedBillUrl = resolveMediaUrl(oneTime?.seedSelection?.seedBills);
                            const prepBillUrl = resolveMediaUrl(oneTime?.pondPreparation?.pondPrepBills);

                            return (
                              <div
                                key={pond._id}
                                className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-3 flex flex-col justify-between hover:border-primary/40 transition-colors"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="font-semibold text-sm flex items-center gap-1.5">
                                        <Waves className="h-4 w-4 text-cyan-400" />
                                        Pond {pond.pondNumber}: {pond.name}
                                      </p>
                                      {pond.dimensionAcres && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {pond.dimensionAcres} Acres water spread
                                        </p>
                                      )}
                                    </div>

                                    {pondPhotoUrl && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs text-cyan-400 hover:bg-cyan-500/10"
                                        onClick={() =>
                                          setActiveMedia({
                                            title: `Pond ${pond.pondNumber}: ${pond.name} Photo`,
                                            url: pondPhotoUrl,
                                            type: 'image',
                                            category: 'Pond Layout',
                                            pondName: pond.name,
                                          })
                                        }
                                      >
                                        <ImageIcon className="h-3.5 w-3.5 mr-1" /> Photo
                                      </Button>
                                    )}
                                  </div>

                                  {/* One-Time Setup Document Indicators */}
                                  <div className="pt-2 border-t border-border/30 space-y-1.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                      One-Time Setup Records
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {pcrCertUrl ? (
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          className="h-6 text-[10px] px-2 gap-1 text-emerald-400 border border-emerald-500/30"
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
                                          ✓ PCR Seed Cert
                                        </Button>
                                      ) : (
                                        <span className="text-[10px] text-muted-foreground/60 italic border border-dashed border-border/40 px-1.5 py-0.5 rounded">
                                          No PCR Cert
                                        </span>
                                      )}

                                      {seedBillUrl && (
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          className="h-6 text-[10px] px-2 gap-1"
                                          onClick={() =>
                                            setActiveMedia({
                                              title: `Pond ${pond.pondNumber} - Seed Purchase Bill`,
                                              url: seedBillUrl,
                                              type: 'document',
                                              category: 'Seed Bill',
                                              pondName: pond.name,
                                            })
                                          }
                                        >
                                          Seed Bill
                                        </Button>
                                      )}

                                      {prepBillUrl && (
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          className="h-6 text-[10px] px-2 gap-1"
                                          onClick={() =>
                                            setActiveMedia({
                                              title: `Pond ${pond.pondNumber} - Preparation Bills`,
                                              url: prepBillUrl,
                                              type: 'document',
                                              category: 'Pond Prep',
                                              pondName: pond.name,
                                            })
                                          }
                                        >
                                          Prep Bills
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 4: PERSONAL & KYC DOCUMENTS ──────────────────────────────── */}
        <TabsContent value="kyc" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Details */}
            <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-400" /> Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border/30">
                  <span className="text-muted-foreground text-xs uppercase font-medium">Father&apos;s Name</span>
                  <span className="font-medium text-foreground">{farmer.fatherName || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border/30">
                  <span className="text-muted-foreground text-xs uppercase font-medium">Date of Birth</span>
                  <span className="font-medium text-foreground">{farmer.dob || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border/30">
                  <span className="text-muted-foreground text-xs uppercase font-medium">Gender</span>
                  <span className="font-medium capitalize text-foreground">{farmer.gender || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border/30">
                  <span className="text-muted-foreground text-xs uppercase font-medium">SC / ST Category</span>
                  <span className="font-medium text-foreground">{farmer.isScSt ? 'Yes (Subsidized)' : 'General'}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border/30">
                  <span className="text-muted-foreground text-xs uppercase font-medium">State & District</span>
                  <span className="font-medium text-foreground">
                    {[farmer.address?.district, farmer.address?.state].filter(Boolean).join(', ')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Bank Information */}
            <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-400" /> Bank Direct Benefit Transfer (DBT)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border/30">
                  <span className="text-muted-foreground text-xs uppercase font-medium">Account Holder</span>
                  <span className="font-medium text-foreground">{farmer.bankDetails?.accountHolderName || farmer.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border/30">
                  <span className="text-muted-foreground text-xs uppercase font-medium">Bank Name</span>
                  <span className="font-medium text-foreground">{farmer.bankDetails?.bankName || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border/30">
                  <span className="text-muted-foreground text-xs uppercase font-medium">Account Number</span>
                  <span className="font-mono font-medium text-foreground">
                    {farmer.bankDetails?.accountNumber ? `•••• •••• ${farmer.bankDetails.accountNumber.slice(-4)}` : '—'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border/30">
                  <span className="text-muted-foreground text-xs uppercase font-medium">IFSC Code</span>
                  <span className="font-mono font-medium text-foreground">{farmer.bankDetails?.ifscCode || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border/30">
                  <span className="text-muted-foreground text-xs uppercase font-medium">Branch</span>
                  <span className="font-medium text-foreground">{farmer.bankDetails?.branch || '—'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KYC Documents Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-400" /> Government KYC & Registration Documents
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <DocCard
                title="Aadhaar Card"
                subtext={farmer.identity?.aadharNumber ? `UID: ${farmer.identity.aadharNumber}` : 'Govt Identity Document'}
                url={aadharUrl}
                onInspect={() =>
                  aadharUrl &&
                  setActiveMedia({
                    title: `${farmer.name}'s Aadhaar Document`,
                    url: aadharUrl,
                    category: 'KYC Document',
                    subtitle: farmer.identity?.aadharNumber ? `Aadhaar: ${farmer.identity.aadharNumber}` : undefined,
                  })
                }
              />
              <DocCard
                title="PAN Card"
                subtext={farmer.identity?.panNumber ? `PAN: ${farmer.identity.panNumber}` : 'Tax Identity Document'}
                url={panUrl}
                onInspect={() =>
                  panUrl &&
                  setActiveMedia({
                    title: `${farmer.name}'s PAN Card`,
                    url: panUrl,
                    category: 'KYC Document',
                    subtitle: farmer.identity?.panNumber ? `PAN: ${farmer.identity.panNumber}` : undefined,
                  })
                }
              />
              <DocCard
                title="Authority Registration"
                subtext={farmer.registration?.regNumber ? `${farmer.registration.regType?.toUpperCase()}: ${farmer.registration.regNumber}` : 'Aquaculture Registration Certificate'}
                url={regCertUrl}
                onInspect={() =>
                  regCertUrl &&
                  setActiveMedia({
                    title: `${farmer.name}'s ${farmer.registration?.regType?.toUpperCase() || 'Registration'} Certificate`,
                    url: regCertUrl,
                    category: 'KYC Document',
                  })
                }
              />
              <DocCard
                title="Passport Portrait"
                subtext="Verified facial photograph"
                url={profilePhotoUrl}
                onInspect={() =>
                  profilePhotoUrl &&
                  setActiveMedia({
                    title: `${farmer.name}'s Passport Photo`,
                    url: profilePhotoUrl,
                    type: 'image',
                    category: 'Identity',
                  })
                }
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Unified Fine-Grained Media / Video Lightbox Modal ─────────────── */}
      <MediaViewerDialog media={activeMedia} onClose={() => setActiveMedia(null)} />
    </div>
  );
}

// ─── Sub-Component: Document Card ───────────────────────────────────────────

function DocCard({
  title,
  subtext,
  url,
  onInspect,
}: {
  title: string;
  subtext: string;
  url: string | null;
  onInspect: () => void;
}) {
  return (
    <div className="group relative rounded-xl border border-border/50 bg-background/60 p-4 transition-all hover:border-primary/40 hover:shadow-md flex flex-col justify-between min-h-[170px]">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</p>
          <Badge
            variant={url ? 'default' : 'outline'}
            className={`text-[10px] px-1.5 py-0 ${
              url ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'text-muted-foreground'
            }`}
          >
            {url ? 'Available' : 'Missing'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">{subtext}</p>
      </div>

      {url ? (
        <div className="mt-4 flex items-center gap-2">
          <Button variant="secondary" size="sm" className="w-full text-xs gap-1.5" onClick={onInspect}>
            <Eye className="h-3.5 w-3.5" /> Inspect
          </Button>
          <a
            href={url}
            download
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-2.5 text-xs transition-colors"
            title="Download Document"
          >
            <Download className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : (
        <div className="mt-4 text-center py-2 text-[11px] text-muted-foreground/60 italic border border-dashed border-border/40 rounded-lg">
          No file on record
        </div>
      )}
    </div>
  );
}
