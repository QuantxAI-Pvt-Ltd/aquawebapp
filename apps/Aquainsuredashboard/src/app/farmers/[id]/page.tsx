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
  Building2,
  ZoomIn,
  Download,
  AlertCircle,
  Clock,
  Eye,
  Image as ImageIcon,
  Sparkles,
  Filter,
  Play,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Activity,
  Droplets,
  Layers,
  Maximize2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { formatDate } from '@/lib/formatters';
import { apiFetch } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/fileUtils';
import { MediaViewerDialog, type MediaViewerTarget } from '@/components/ui/media-viewer-dialog';
import type {
  FarmerDetailData,
  ApiResponse,
  Pond,
  Farm,
  DailyEntry,
  OneTimeEntry,
  VaultMediaItem,
  Insurance,
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

  // Interactive Selected Pond (can be 'all' or specific pond ID)
  const [selectedPondId, setSelectedPondId] = useState<string>('all');
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

  // List of ponds to display (all ponds or single filtered pond)
  const pondsToDisplay = useMemo(() => {
    if (!farmer?.ponds || farmer.ponds.length === 0) return [];
    if (selectedPondId === 'all') return farmer.ponds;
    return farmer.ponds.filter((p) => String(p._id) === selectedPondId);
  }, [farmer?.ponds, selectedPondId]);

  // Map of daily entries grouped by Pond ID
  const entriesByPond = useMemo(() => {
    const map: Record<string, DailyEntry[]> = {};
    entriesData.dailyEntries.forEach((entry) => {
      const pId = String(entry.pondId);
      if (!map[pId]) map[pId] = [];
      map[pId].push(entry);
    });
    // Sort each pond's entries by dayNumber or date descending
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => b.dayNumber - a.dayNumber);
    });
    return map;
  }, [entriesData.dailyEntries]);

  // Map of one-time setup entries by Pond ID
  const oneTimeByPond = useMemo(() => {
    const map: Record<string, OneTimeEntry> = {};
    entriesData.oneTimeEntries.forEach((ot) => {
      map[String(ot.pondId)] = ot;
    });
    return map;
  }, [entriesData.oneTimeEntries]);

  // Map of insurance policies by Pond ID
  const insuranceByPond = useMemo(() => {
    const map: Record<string, Insurance> = {};
    if (farmer?.insurances) {
      farmer.insurances.forEach((ins) => {
        const pId = typeof ins.pondId === 'object' ? String(ins.pondId?._id) : String(ins.pondId);
        map[pId] = ins;
      });
    }
    return map;
  }, [farmer?.insurances]);

  // Filtered vault media
  const filteredVaultMedia = useMemo(() => {
    return vaultMedia.filter((item) => {
      const matchesPond =
        selectedPondId === 'all' || !item.pondId || String(item.pondId) === selectedPondId;
      const matchesCategory =
        vaultCategoryFilter === 'all' ||
        (vaultCategoryFilter === 'video' && item.mediaType === 'video') ||
        (vaultCategoryFilter === 'photo' && item.mediaType === 'image') ||
        (vaultCategoryFilter === 'document' && item.mediaType === 'document') ||
        item.category === vaultCategoryFilter;
      return matchesPond && matchesCategory;
    });
  }, [vaultMedia, selectedPondId, vaultCategoryFilter]);

  if (loading) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
        <Card className="border-border bg-card p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (error || !farmer) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-lg font-semibold text-foreground">Unable to Load Farmer Profile</h2>
        <p className="text-sm text-muted-foreground max-w-md">{error || 'Farmer profile could not be found.'}</p>
        <Button variant="outline" onClick={() => router.push('/farmers')} className="border-border hover:bg-secondary">
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
    <div className="animate-fade-in space-y-6">
      {/* ── Top Action Bar & Breadcrumbs ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/farmers')}
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
                <BreadcrumbPage className="font-bold text-foreground">{farmer.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-border bg-card text-muted-foreground font-mono text-[11px] px-2.5 py-1">
            UID: {farmer._id.slice(-8).toUpperCase()}
          </Badge>
          <Badge className="bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1">
            Verified Dossier
          </Badge>
        </div>
      </div>

      {/* ── Farmer Hero Card ───────────────────────────────────────────────── */}
      <Card className="overflow-hidden border-border bg-card shadow-xs rounded-2xl">
        <div className="h-2 bg-gradient-to-r from-[#E23E57] via-[#88304E] to-[#311D3F]" />
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Profile Photo Avatar with Lightbox Preview */}
              <div
                className="relative group cursor-pointer"
                onClick={() =>
                  profilePhotoUrl &&
                  setActiveMedia({
                    title: `${farmer.name}'s Profile Photo`,
                    url: profilePhotoUrl,
                    type: 'image',
                    category: 'Farmer Identity',
                  })
                }
              >
                {profilePhotoUrl ? (
                  <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-border shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profilePhotoUrl}
                      alt={farmer.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="h-5 w-5 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E23E57] to-[#311D3F] text-2xl font-bold text-white shadow-md">
                    {farmer.name ? farmer.name.charAt(0).toUpperCase() : 'F'}
                  </div>
                )}
              </div>

              {/* Farmer Core Metadata */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-foreground">{farmer.name}</h1>
                  {farmer.registration?.regType && (
                    <Badge variant="outline" className="text-xs uppercase font-bold border-primary/40 text-primary bg-primary/10">
                      {farmer.registration.regType} Verified
                    </Badge>
                  )}
                  {farmer.isScSt && (
                    <Badge variant="secondary" className="text-xs bg-secondary text-foreground">
                      Subsidized Category
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-primary" /> {farmer.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {[farmer.address?.village, farmer.address?.taluk, farmer.address?.district].filter(Boolean).join(', ')}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Registered: {formatDate(farmer.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stat Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-secondary/40 p-3 rounded-2xl border border-border">
              <div className="text-center px-3 py-1">
                <p className="text-lg font-black text-foreground">{farmer.farms?.length ?? 0}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Farms</p>
              </div>
              <div className="text-center px-3 py-1 border-l border-border">
                <p className="text-lg font-black text-primary">{farmer.ponds?.length ?? 0}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Ponds</p>
              </div>
              <div className="text-center px-3 py-1 border-l border-border">
                <p className="text-lg font-black text-foreground">{entriesData.dailyEntries?.length ?? 0}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Daily Logs</p>
              </div>
              <div className="text-center px-3 py-1 border-l border-border">
                <p className="text-lg font-black text-primary">{vaultMedia?.length ?? 0}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Media Files</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Interactive Pond Filter Bar ────────────────────────────────────── */}
      {farmer.ponds && farmer.ponds.length > 0 && (
        <Card className="border-border bg-card/80 backdrop-blur-xl rounded-2xl shadow-xs">
          <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Waves className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Filter Records by Pond:</p>
                <p className="text-[11px] text-muted-foreground">Select a specific pond or view all ponds simultaneously</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 bg-secondary/40 p-1 rounded-xl border border-border">
              <Button
                variant={selectedPondId === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedPondId('all')}
                className={`h-7 px-3 text-xs font-semibold rounded-lg cursor-pointer ${
                  selectedPondId === 'all' ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Ponds ({farmer.ponds.length})
              </Button>
              {farmer.ponds.map((p) => {
                const isSelected = selectedPondId === String(p._id);
                const count = entriesByPond[String(p._id)]?.length ?? 0;
                return (
                  <Button
                    key={p._id}
                    variant={isSelected ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedPondId(String(p._id))}
                    className={`h-7 px-3 text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1.5 ${
                      isSelected ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>Pond {p.pondNumber}: {p.name}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-card/80 text-foreground font-mono">
                      {count} logs
                    </Badge>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Main Tabbed Sections Grouped for this Farmer ──────────────────── */}
      <Tabs defaultValue="pond-records" className="space-y-6">
        <TabsList className="bg-card border border-border p-1.5 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-1.5 shadow-xs">
          <TabsTrigger value="pond-records" className="gap-2 cursor-pointer font-semibold rounded-lg">
            <Waves className="h-4 w-4 text-primary" /> Pond Records & Telemetry ({entriesData.dailyEntries?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="vault" className="gap-2 cursor-pointer font-semibold rounded-lg">
            <Sparkles className="h-4 w-4 text-primary" /> Media & Video Vault ({vaultMedia?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="farms" className="gap-2 cursor-pointer font-semibold rounded-lg">
            <Building2 className="h-4 w-4 text-primary" /> Farms & Infrastructure ({farmer.farms?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="kyc" className="gap-2 cursor-pointer font-semibold rounded-lg">
            <User className="h-4 w-4 text-primary" /> Personal & KYC
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: POND-BY-POND GROUPED DOSSIERS & DAILY LOGS ──────────────── */}
        <TabsContent value="pond-records" className="space-y-8">
          {entriesLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          ) : pondsToDisplay.length === 0 ? (
            <Card className="border-border bg-card p-12 text-center rounded-2xl">
              <Waves className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-semibold text-foreground">No Ponds Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                No ponds have been registered for this farmer yet.
              </p>
            </Card>
          ) : (
            <div className="space-y-8">
              {pondsToDisplay.map((pond: Pond) => {
                const pondIdStr = String(pond._id);
                const pondEntries = entriesByPond[pondIdStr] || [];
                const oneTime = oneTimeByPond[pondIdStr];
                const policy = insuranceByPond[pondIdStr];
                const pondPhotoUrl = resolveMediaUrl(pond.photo);
                const pcrCertUrl = resolveMediaUrl(oneTime?.seedSelection?.pcrCertificate);
                const seedBillUrl = resolveMediaUrl(oneTime?.seedSelection?.seedBills);
                const prepBillUrl = resolveMediaUrl(oneTime?.pondPreparation?.pondPrepBills);

                return (
                  <div key={pond._id} className="space-y-4">
                    {/* ── POND SECTION HEADER DOSSIER CARD ────────────────── */}
                    <Card className="border-2 border-primary/30 bg-card rounded-2xl shadow-sm overflow-hidden">
                      <div className="bg-secondary/30 border-b border-border p-4 sm:p-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          {/* Pond title and specs */}
                          <div className="flex items-start sm:items-center gap-3.5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white font-black text-base shadow-sm">
                              P{pond.pondNumber}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-bold text-foreground">
                                  Pond {pond.pondNumber}: {pond.name}
                                </h3>
                                {pond.dimensionAcres && (
                                  <Badge variant="outline" className="text-xs font-semibold border-primary/40 text-primary bg-primary/10">
                                    {pond.dimensionAcres} Acres
                                  </Badge>
                                )}
                                {policy && (
                                  <Badge
                                    className={`text-xs font-semibold px-2 py-0.5 capitalize ${
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
                              <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-3">
                                {pond.pattaNumber && <span>Patta: <strong className="text-foreground">{pond.pattaNumber}</strong></span>}
                                {pond.surveyNumber && <span>Survey No: <strong className="text-foreground">{pond.surveyNumber}</strong></span>}
                                {pond.address?.village && (
                                  <span>Location: {[pond.address.village, pond.address.taluk].filter(Boolean).join(', ')}</span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Quick Actions & One-time Setup Records for this Pond */}
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-xs cursor-pointer"
                              onClick={() => router.push(`/farmers/${farmer._id}/ponds/${pond._id}`)}
                            >
                              <Maximize2 className="h-3.5 w-3.5" /> Full Pond Dossier & Charts ↗
                            </Button>

                            {pondPhotoUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1.5 border-border hover:bg-secondary text-foreground rounded-xl cursor-pointer"
                                onClick={() =>
                                  setActiveMedia({
                                    title: `Pond ${pond.pondNumber}: ${pond.name} Layout Photo`,
                                    url: pondPhotoUrl,
                                    type: 'image',
                                    category: 'Pond Layout',
                                    pondName: pond.name,
                                  })
                                }
                              >
                                <ImageIcon className="h-3.5 w-3.5 text-primary" /> Photo
                              </Button>
                            )}

                            {pcrCertUrl && (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-8 text-xs gap-1 text-primary border border-primary/30 bg-primary/10 hover:bg-primary/20 rounded-xl cursor-pointer"
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
                                ✓ PCR Cert
                              </Button>
                            )}

                            {prepBillUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1 border-border text-foreground hover:bg-secondary rounded-xl"
                                onClick={() =>
                                  setActiveMedia({
                                    title: `Pond ${pond.pondNumber} - Prep Invoices`,
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

                            <Badge variant="secondary" className="h-8 px-2.5 text-xs font-mono bg-card border border-border text-foreground flex items-center">
                              {pondEntries.length} Telemetry Records
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* ── DAILY ENTRIES SPECIFICALLY FOR THIS POND ──────────── */}
                      <CardContent className="p-4 sm:p-5">
                        {pondEntries.length === 0 ? (
                          <div className="text-center py-8 border border-dashed border-border rounded-xl bg-secondary/10">
                            <Clock className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
                            <p className="text-xs font-semibold text-foreground">No Daily Telemetry Entries for Pond {pond.pondNumber}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Continuous day-by-day telemetry logs submitted for Pond {pond.pondNumber} will appear here.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 pb-1">
                              <Activity className="h-3.5 w-3.5 text-primary" /> Daily Monitoring Logs for Pond {pond.pondNumber} ({pond.name}):
                            </p>

                            {pondEntries.map((entry) => {
                              const samplingVideoUrl = resolveMediaUrl(entry.sampling?.samplingVideo);
                              const shrimpPhotoUrl = resolveMediaUrl(entry.shrimpHealth?.shrimpPhoto);
                              const feedBillsUrl = resolveMediaUrl(entry.feedManagement?.feedBills);
                              const waterReportUrl = resolveMediaUrl(entry.waterQuality?.waterReport);
                              const miscBillsUrl = resolveMediaUrl(entry.financials?.miscBills);
                              const elecBillsUrl = resolveMediaUrl(entry.financials?.electricityBills);
                              const labReportUrl = resolveMediaUrl(entry.shrimpHealth?.labReport);

                              const hasMedia = Boolean(
                                samplingVideoUrl ||
                                  shrimpPhotoUrl ||
                                  feedBillsUrl ||
                                  waterReportUrl ||
                                  miscBillsUrl ||
                                  elecBillsUrl ||
                                  labReportUrl
                              );

                              return (
                                <Card key={entry._id} className="border-border bg-card/90 overflow-hidden rounded-xl shadow-2xs hover:border-primary/50 transition-colors">
                                  <div className="p-3.5 sm:p-4 space-y-3">
                                    {/* Entry Header */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                                      <div className="flex items-center gap-2.5">
                                        <Badge className="bg-primary text-white text-xs font-mono font-bold px-2 py-0.5 rounded-md">
                                          Day {entry.dayNumber}
                                        </Badge>
                                        <Badge variant="outline" className="text-[11px] border-border text-muted-foreground font-mono">
                                          Pond {pond.pondNumber}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground font-medium">
                                          📅 {formatDate(entry.date)}
                                        </span>
                                      </div>

                                      {entry.shrimpHealth?.status && (
                                        <Badge
                                          variant="secondary"
                                          className={`capitalize text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                            entry.shrimpHealth.status === 'normal'
                                              ? 'bg-primary/15 text-primary border border-primary/20'
                                              : 'bg-destructive/15 text-destructive border border-destructive/20'
                                          }`}
                                        >
                                          {entry.shrimpHealth.status === 'normal' ? '✓ Health Normal' : '⚠ Health Deficiency'}
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                                      <div className="bg-secondary/30 p-2 rounded-lg border border-border">
                                        <span className="text-muted-foreground text-[10px] uppercase font-semibold block">DO (Oxygen)</span>
                                        <span className="font-bold text-primary text-sm">
                                          {entry.waterQuality?.do ? `${entry.waterQuality.do} mg/L` : '—'}
                                        </span>
                                      </div>
                                      <div className="bg-secondary/30 p-2 rounded-lg border border-border">
                                        <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Water pH</span>
                                        <span className="font-bold text-foreground text-sm">
                                          {entry.waterQuality?.ph ?? '—'}
                                        </span>
                                      </div>
                                      <div className="bg-secondary/30 p-2 rounded-lg border border-border">
                                        <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Temperature</span>
                                        <span className="font-bold text-primary text-sm">
                                          {entry.waterQuality?.temperature ? `${entry.waterQuality.temperature}°C` : '—'}
                                        </span>
                                      </div>
                                      <div className="bg-secondary/30 p-2 rounded-lg border border-border">
                                        <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Feed Quantity</span>
                                        <span className="font-bold text-foreground text-sm">
                                          {entry.feedManagement?.feedQuantity ? `${entry.feedManagement.feedQuantity} kg` : '—'}
                                        </span>
                                      </div>
                                      <div className="bg-secondary/30 p-2 rounded-lg border border-border">
                                        <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Survival Rate</span>
                                        <span className="font-bold text-primary text-sm">
                                          {entry.sampling?.survival ? `${entry.sampling.survival}%` : '—'}
                                        </span>
                                      </div>
                                      <div className="bg-secondary/30 p-2 rounded-lg border border-border">
                                        <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Biomass Est.</span>
                                        <span className="font-bold text-foreground text-sm">
                                          {entry.sampling?.biomass ? `${entry.sampling.biomass} kg` : '—'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Uploaded Evidence Action Bar */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-[11px] font-semibold text-muted-foreground mr-1">Evidence:</span>

                                        {samplingVideoUrl && (
                                          <Button
                                            variant="default"
                                            size="sm"
                                            className="h-7 gap-1 text-[11px] bg-primary text-white font-semibold rounded-lg shadow-xs"
                                            onClick={() =>
                                              setActiveMedia({
                                                title: `Pond ${pond.pondNumber} • Day ${entry.dayNumber} - Field Sampling Video`,
                                                url: samplingVideoUrl,
                                                type: 'video',
                                                category: 'Daily Sampling',
                                                dayNumber: entry.dayNumber,
                                                pondName: `Pond ${pond.pondNumber}: ${pond.name}`,
                                                timestamp: entry.date,
                                                subtitle: `Cast net vitality footage for Pond ${pond.pondNumber}`,
                                                metrics: {
                                                  do: entry.waterQuality?.do,
                                                  ph: entry.waterQuality?.ph,
                                                  temperature: entry.waterQuality?.temperature,
                                                  feedQuantity: entry.feedManagement?.feedQuantity,
                                                  survival: entry.sampling?.survival,
                                                  biomass: entry.sampling?.biomass,
                                                  healthStatus: entry.shrimpHealth?.status,
                                                },
                                              })
                                            }
                                          >
                                            <Play className="h-3 w-3 fill-current" /> Watch Video 🎬
                                          </Button>
                                        )}

                                        {shrimpPhotoUrl && (
                                          <Button
                                            variant="secondary"
                                            size="sm"
                                            className="h-7 gap-1 text-[11px] bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-lg"
                                            onClick={() =>
                                              setActiveMedia({
                                                title: `Pond ${pond.pondNumber} • Day ${entry.dayNumber} - Shrimp Health Photo`,
                                                url: shrimpPhotoUrl,
                                                type: 'image',
                                                category: 'Shrimp Health',
                                                dayNumber: entry.dayNumber,
                                                pondName: `Pond ${pond.pondNumber}: ${pond.name}`,
                                                timestamp: entry.date,
                                                subtitle: `Shrimp inspection (${entry.shrimpHealth?.status || 'Normal'})`,
                                                metrics: {
                                                  do: entry.waterQuality?.do,
                                                  ph: entry.waterQuality?.ph,
                                                  temperature: entry.waterQuality?.temperature,
                                                  feedQuantity: entry.feedManagement?.feedQuantity,
                                                  survival: entry.sampling?.survival,
                                                  biomass: entry.sampling?.biomass,
                                                  healthStatus: entry.shrimpHealth?.status,
                                                },
                                              })
                                            }
                                          >
                                            <ImageIcon className="h-3 w-3 text-primary" /> Shrimp Photo 🦐
                                          </Button>
                                        )}

                                        {feedBillsUrl && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 gap-1 text-[11px] border-border text-foreground hover:bg-secondary rounded-lg"
                                            onClick={() =>
                                              setActiveMedia({
                                                title: `Pond ${pond.pondNumber} • Day ${entry.dayNumber} - Feed Invoice`,
                                                url: feedBillsUrl,
                                                type: 'document',
                                                category: 'Feed Invoice',
                                                dayNumber: entry.dayNumber,
                                                pondName: `Pond ${pond.pondNumber}: ${pond.name}`,
                                                timestamp: entry.date,
                                              })
                                            }
                                          >
                                            <FileText className="h-3 w-3 text-primary" /> Feed Bill 🧾
                                          </Button>
                                        )}

                                        {waterReportUrl && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 gap-1 text-[11px] border-border text-foreground hover:bg-secondary rounded-lg"
                                            onClick={() =>
                                              setActiveMedia({
                                                title: `Pond ${pond.pondNumber} • Day ${entry.dayNumber} - Water Lab Report`,
                                                url: waterReportUrl,
                                                type: 'document',
                                                category: 'Water Report',
                                                dayNumber: entry.dayNumber,
                                                pondName: `Pond ${pond.pondNumber}: ${pond.name}`,
                                                timestamp: entry.date,
                                              })
                                            }
                                          >
                                            <FileText className="h-3 w-3 text-primary" /> Water Lab 🧪
                                          </Button>
                                        )}

                                        {!hasMedia && (
                                          <span className="text-[11px] text-muted-foreground/60 italic">No files attached</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 2: MASTER MEDIA & VIDEO VAULT ─────────────────────────────── */}
        <TabsContent value="vault" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border shadow-xs">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Centralized Media Vault for {farmer.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                All photos, field videos, invoices, and lab certificates uploaded for each pond aggregated in one gallery.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border text-xs">
                {[
                  { label: 'All', val: 'all' },
                  { label: 'Videos 🎬', val: 'video' },
                  { label: 'Photos 📸', val: 'photo' },
                  { label: 'Docs / Bills 🧾', val: 'document' },
                ].map((cat) => (
                  <button
                    key={cat.val}
                    onClick={() => setVaultCategoryFilter(cat.val)}
                    className={`px-3 py-1 rounded-lg transition-colors text-xs cursor-pointer ${
                      vaultCategoryFilter === cat.val
                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {entriesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : filteredVaultMedia.length === 0 ? (
            <Card className="border-border bg-card p-12 text-center rounded-2xl">
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
                  className="group relative rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/60 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  {/* Media Visual Area */}
                  <div className="relative h-36 w-full bg-black/40 overflow-hidden flex items-center justify-center">
                    {item.mediaType === 'video' ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-zinc-950">
                        <video src={item.url} className="w-full h-full object-cover opacity-60" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="rounded-full bg-primary/90 text-white p-3 shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="h-5 w-5 fill-current" />
                          </div>
                        </div>
                        <Badge className="absolute bottom-2 right-2 bg-black/70 text-[10px] text-white">
                          VIDEO 🎬
                        </Badge>
                      </div>
                    ) : item.mediaType === 'document' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-secondary/30 p-4 text-center">
                        <FileText className="h-10 w-10 text-primary mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px] font-medium text-foreground truncate max-w-full">
                          {item.title}
                        </span>
                        <Badge variant="outline" className="mt-2 text-[9px] uppercase tracking-wider border-border bg-card">
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
                      <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-card/90 backdrop-blur-md text-foreground border border-border">
                        {item.category}
                      </Badge>
                      {item.dayNumber !== undefined && (
                        <Badge className="text-[10px] font-mono bg-primary text-white">
                          Day {item.dayNumber}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Metadata Description */}
                  <div className="p-3 bg-card border-t border-border space-y-1">
                    <p className="font-semibold text-xs text-foreground truncate" title={item.title}>
                      {item.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                    <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground/80">
                      <span className="font-semibold text-primary">{item.pondName || 'General'}</span>
                      {item.timestamp && <span>{new Date(item.timestamp).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 3: FARMS & INFRASTRUCTURE ──────────────────────────────────── */}
        <TabsContent value="farms" className="space-y-6">
          {!farmer.farms || farmer.farms.length === 0 ? (
            <Card className="border-border bg-card p-12 text-center rounded-2xl">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No aquaculture farms registered under this farmer.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {farmer.farms.map((farm: Farm, idx: number) => {
                const farmPonds = farmer.ponds?.filter((p) => String(p.farmId) === String(farm._id)) || [];
                const farmPhotoUrl = resolveMediaUrl(farm.farmPhoto);

                return (
                  <Card key={farm._id} className="border-border bg-card overflow-hidden shadow-xs rounded-2xl">
                    <CardHeader className="bg-secondary/20 border-b border-border pb-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                            #{idx + 1}
                          </div>
                          <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
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
                              className="text-xs gap-1.5 border-border hover:bg-secondary rounded-xl text-foreground"
                              onClick={() =>
                                setActiveMedia({
                                  title: `${farm.name || 'Farm'} Photo`,
                                  url: farmPhotoUrl,
                                  type: 'image',
                                  category: 'Farm Asset',
                                })
                              }
                            >
                              <ImageIcon className="h-3.5 w-3.5 text-primary" /> Farm Photo
                            </Button>
                          )}
                          <Badge variant="outline" className="text-xs font-semibold uppercase border-border bg-card text-foreground">
                            Ownership: {farm.ownership?.type || 'Owned'}
                          </Badge>
                          <Badge variant="secondary" className="text-xs font-semibold bg-secondary text-foreground">
                            {farmPonds.length} Ponds
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {farmPonds.map((pond: Pond) => {
                          const count = entriesByPond[String(pond._id)]?.length ?? 0;
                          return (
                            <div
                              key={pond._id}
                              onClick={() => router.push(`/farmers/${farmer._id}/ponds/${pond._id}`)}
                              className="rounded-2xl border border-border bg-card p-4 space-y-3 flex flex-col justify-between hover:border-primary hover:shadow-md transition-all cursor-pointer group"
                            >
                              <div className="space-y-1">
                                <p className="font-bold text-sm flex items-center gap-1.5 text-foreground group-hover:text-primary transition-colors">
                                  <Waves className="h-4 w-4 text-primary" />
                                  Pond {pond.pondNumber}: {pond.name}
                                </p>
                                {pond.dimensionAcres && (
                                  <p className="text-xs text-muted-foreground">
                                    {pond.dimensionAcres} Acres water spread
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                                <span className="text-muted-foreground font-medium">{count} Daily Records</span>
                                <span className="text-primary font-bold text-[11px] group-hover:translate-x-0.5 transition-transform">
                                  View Pond Dossier →
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
            <Card className="border-border bg-card rounded-2xl shadow-xs">
              <CardHeader className="pb-3 border-b border-border bg-secondary/15">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <User className="h-4 w-4 text-primary" /> Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border">
                  <span className="text-muted-foreground text-xs uppercase font-medium">Father&apos;s Name</span>
                  <span className="font-medium text-foreground">{farmer.fatherName || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border">
                  <span className="text-muted-foreground text-xs uppercase font-medium">Date of Birth</span>
                  <span className="font-medium text-foreground">{farmer.dob || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border">
                  <span className="text-muted-foreground text-xs uppercase font-medium">Gender</span>
                  <span className="font-medium capitalize text-foreground">{farmer.gender || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border">
                  <span className="text-muted-foreground text-xs uppercase font-medium">SC / ST Category</span>
                  <span className="font-medium text-foreground">{farmer.isScSt ? 'Yes (Subsidized)' : 'General'}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border">
                  <span className="text-muted-foreground text-xs uppercase font-medium">State & District</span>
                  <span className="font-medium text-foreground">
                    {[farmer.address?.district, farmer.address?.state].filter(Boolean).join(', ')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Bank Information */}
            <Card className="border-border bg-card rounded-2xl shadow-xs">
              <CardHeader className="pb-3 border-b border-border bg-secondary/15">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <CreditCard className="h-4 w-4 text-primary" /> Bank Direct Benefit Transfer (DBT)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border">
                  <span className="text-muted-foreground text-xs uppercase font-medium">Account Holder</span>
                  <span className="font-medium text-foreground">{farmer.bankDetails?.accountHolderName || farmer.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border">
                  <span className="text-muted-foreground text-xs uppercase font-medium">Bank Name</span>
                  <span className="font-medium text-foreground">{farmer.bankDetails?.bankName || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border">
                  <span className="text-muted-foreground text-xs uppercase font-medium">Account Number</span>
                  <span className="font-mono font-medium text-foreground">
                    {farmer.bankDetails?.accountNumber ? `•••• •••• ${farmer.bankDetails.accountNumber.slice(-4)}` : '—'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border">
                  <span className="text-muted-foreground text-xs uppercase font-medium">IFSC Code</span>
                  <span className="font-mono font-medium text-foreground">{farmer.bankDetails?.ifscCode || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border">
                  <span className="text-muted-foreground text-xs uppercase font-medium">Branch</span>
                  <span className="font-medium text-foreground">{farmer.bankDetails?.branch || '—'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KYC Documents Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Government KYC & Registration Documents
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
    <div className="group relative rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/60 hover:shadow-sm flex flex-col justify-between min-h-[170px]">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</p>
          <Badge
            variant={url ? 'default' : 'outline'}
            className={`text-[10px] px-1.5 py-0 rounded-md ${
              url ? 'bg-primary/20 text-primary border border-primary/30' : 'text-muted-foreground border-border'
            }`}
          >
            {url ? 'Available' : 'Missing'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">{subtext}</p>
      </div>

      {url ? (
        <div className="mt-4 flex items-center gap-2">
          <Button variant="secondary" size="sm" className="w-full text-xs gap-1.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl cursor-pointer" onClick={onInspect}>
            <Eye className="h-3.5 w-3.5 text-primary" /> Inspect
          </Button>
          <a
            href={url}
            download
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-card hover:bg-secondary text-foreground h-8 px-2.5 text-xs transition-colors"
            title="Download Document"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
          </a>
        </div>
      ) : (
        <div className="mt-4 text-center py-2 text-[11px] text-muted-foreground/60 italic border border-dashed border-border rounded-xl">
          No file on record
        </div>
      )}
    </div>
  );
}
