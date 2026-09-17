'use client';

import { useEffect, useState, use } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDate } from '@/lib/formatters';
import { apiFetch, API_BASE } from '@/lib/api';
import type { FarmerDetailData, ApiResponse, Pond, Farm, Insurance, MediaObject, DailyEntry, OneTimeEntry } from '@/types';

// Helper to safely extract image/document URL from MediaObject, string, or legacy object
function getMediaUrl(media?: MediaObject | string | null): string | null {
  if (!media) return null;
  if (typeof media === 'string') {
    if (media.startsWith('http://') || media.startsWith('https://') || media.startsWith('/')) {
      return media;
    }
    if (media.startsWith('data:')) return media;
    return `${API_BASE}${media.startsWith('/') ? '' : '/'}${media}`;
  }
  if (typeof media === 'object' && media.url) {
    return media.url;
  }
  return null;
}

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

  // Modal inspection state for documents/images
  const [inspectModal, setInspectModal] = useState<{
    title: string;
    url: string;
    mimeType?: string;
  } | null>(null);

  useEffect(() => {
    async function fetchFarmer() {
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
    }
    fetchFarmer();
  }, [farmerId]);

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

  const profilePhotoUrl = getMediaUrl(farmer.identity?.photo);
  const aadharUrl = getMediaUrl(farmer.identity?.aadharFile);
  const panUrl = getMediaUrl(farmer.identity?.panFile);
  const regCertUrl = getMediaUrl(farmer.registration?.regCertificate);

  return (
    <div className="animate-fade-in space-y-6 pb-12">
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
                  <div className="h-20 w-20 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profilePhotoUrl}
                      alt={farmer.name}
                      className="h-full w-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                      onClick={() => setInspectModal({ title: `${farmer.name}'s Photo`, url: profilePhotoUrl })}
                    />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-2xl font-bold text-white shadow-md">
                    {farmer.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {profilePhotoUrl && (
                  <button
                    onClick={() => setInspectModal({ title: `${farmer.name}'s Photo`, url: profilePhotoUrl })}
                    className="absolute bottom-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
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
                <p className="text-2xl font-bold text-emerald-400">{farmer.insurances?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Policies</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Main Tabbed Sections ───────────────────────────────────────────── */}
      <Tabs defaultValue="kyc" className="space-y-6">
        <TabsList className="bg-card/60 border border-border/50 p-1 rounded-xl">
          <TabsTrigger value="kyc" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="h-4 w-4" /> Personal & KYC
          </TabsTrigger>
          <TabsTrigger value="farms" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Waves className="h-4 w-4" /> Farms & Ponds ({farmer.farms?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="insurance" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ShieldCheck className="h-4 w-4" /> Insurance Policies ({farmer.insurances?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: PERSONAL & KYC DOCUMENTS ──────────────────────────────── */}
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
                  <span className="text-muted-foreground text-xs uppercase font-medium">Community</span>
                  <span className="font-medium text-foreground">{farmer.community || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2">
                  <span className="text-muted-foreground text-xs uppercase font-medium">SC / ST Category</span>
                  <span className="font-medium text-foreground">{farmer.isScSt ? 'Yes' : 'No'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Bank Details */}
            <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-400" /> Bank & Settlement Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border/30">
                  <span className="text-muted-foreground text-xs uppercase font-medium">Bank Name</span>
                  <span className="font-medium text-foreground">{farmer.bankDetails?.bankName || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border/30">
                  <span className="text-muted-foreground text-xs uppercase font-medium">Branch</span>
                  <span className="font-medium text-foreground">{farmer.bankDetails?.branch || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border/30">
                  <span className="text-muted-foreground text-xs uppercase font-medium">Account Holder</span>
                  <span className="font-medium text-foreground">{farmer.bankDetails?.accountHolderName || farmer.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2 border-b border-border/30">
                  <span className="text-muted-foreground text-xs uppercase font-medium">Account Number</span>
                  <span className="font-mono font-medium text-foreground">{farmer.bankDetails?.accountNumber || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 py-2">
                  <span className="text-muted-foreground text-xs uppercase font-medium">IFSC Code</span>
                  <span className="font-mono font-medium text-foreground">{farmer.bankDetails?.ifscCode || '—'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KYC Document Verification Cards (SeaweedFS storage) */}
          <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-cyan-400" /> KYC & Regulatory Document Verification
              </CardTitle>
              <CardDescription className="text-xs">
                Official documents uploaded by the farmer and verified via SeaweedFS storage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Farmer Photo */}
                <DocCard
                  title="Profile Photo"
                  subtext="Farmer face capture"
                  url={profilePhotoUrl}
                  onInspect={() => profilePhotoUrl && setInspectModal({ title: 'Farmer Photo', url: profilePhotoUrl })}
                />

                {/* Aadhaar Card */}
                <DocCard
                  title="Aadhaar Card"
                  subtext={farmer.identity?.aadharNumber ? `No: ${farmer.identity.aadharNumber}` : 'Government UID'}
                  url={aadharUrl}
                  onInspect={() => aadharUrl && setInspectModal({ title: 'Aadhaar Card Document', url: aadharUrl })}
                />

                {/* PAN Card */}
                <DocCard
                  title="PAN Card"
                  subtext={farmer.identity?.panNumber ? `PAN: ${farmer.identity.panNumber}` : 'Income Tax ID'}
                  url={panUrl}
                  onInspect={() => panUrl && setInspectModal({ title: 'PAN Card Document', url: panUrl })}
                />

                {/* Registration Certificate */}
                <DocCard
                  title={`${farmer.registration?.regType?.toUpperCase() || 'CAA / MPEDA'} Cert`}
                  subtext={farmer.registration?.regNumber ? `Reg: ${farmer.registration.regNumber}` : 'Aquaculture License'}
                  url={regCertUrl}
                  onInspect={() => regCertUrl && setInspectModal({ title: 'Registration Certificate', url: regCertUrl })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: FARMS & PONDS ─────────────────────────────────────────── */}
        <TabsContent value="farms" className="space-y-6">
          {!farmer.farms || farmer.farms.length === 0 ? (
            <Card className="border-border/50 bg-card/60 p-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No registered farms associated with this farmer.</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {farmer.farms.map((farm: Farm) => {
                const farmPonds = farmer.ponds?.filter((p: Pond) => String(p.farmId) === String(farm._id)) || [];
                const farmPhotoUrl = getMediaUrl(farm.farmPhoto);

                return (
                  <Card key={farm._id} className="border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden shadow-sm">
                    <CardHeader className="bg-muted/10 border-b border-border/30 pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-semibold">
                              {farm.location?.place || 'Unnamed Farm'}, {farm.location?.district}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {farm.ownership?.type ? `Ownership: ${farm.ownership.type.toUpperCase()}` : ''}
                              {farm.ownership?.patta ? ` • Patta: ${farm.ownership.patta}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {farmPhotoUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs gap-1.5"
                              onClick={() => setInspectModal({ title: `Farm Photo — ${farm.location?.place}`, url: farmPhotoUrl })}
                            >
                              <Eye className="h-3.5 w-3.5" /> Farm Photo
                            </Button>
                          )}
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
                          {farmPonds.map((pond: Pond) => (
                            <PondCard
                              key={pond._id}
                              pond={pond}
                              onInspectPhoto={(url) => setInspectModal({ title: `Pond ${pond.pondNumber}: ${pond.name}`, url })}
                              onInspectMedia={(title, url) => setInspectModal({ title, url })}
                            />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 3: INSURANCE POLICIES ────────────────────────────────────── */}
        <TabsContent value="insurance" className="space-y-6">
          {!farmer.insurances || farmer.insurances.length === 0 ? (
            <Card className="border-border/50 bg-card/60 p-12 text-center">
              <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No insurance policies registered for this farmer.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {farmer.insurances.map((ins: Insurance) => {
                const pond = farmer.ponds?.find(p => String(p._id) === String(ins.pondId));

                return (
                  <Card key={ins._id} className="border-border/50 bg-card/60 backdrop-blur-xl">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-base capitalize">{ins.species} Shrimp</p>
                          <p className="text-xs text-muted-foreground">
                            {pond ? `Pond ${pond.pondNumber}: ${pond.name}` : `Pond ID: ${String(typeof ins.pondId === 'object' ? (ins.pondId as Pond)._id : ins.pondId).slice(-6)}`}
                          </p>
                        </div>
                        <Badge
                          variant={ins.status === 'active' ? 'default' : ins.status === 'expired' ? 'secondary' : 'destructive'}
                          className="capitalize font-semibold text-xs px-2.5 py-0.5"
                        >
                          {ins.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/30">
                        <div>
                          <span className="text-muted-foreground uppercase block font-medium">Policy Type</span>
                          <span className="font-semibold capitalize text-foreground">{ins.insuranceType}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground uppercase block font-medium">Coverage Period</span>
                          <span className="font-semibold text-foreground">{ins.insurancePeriodDays} Days</span>
                        </div>
                        <div className="mt-2">
                          <span className="text-muted-foreground uppercase block font-medium">Stocking Date</span>
                          <span className="font-semibold text-foreground">{formatDate(ins.stockingDate)}</span>
                        </div>
                        <div className="mt-2">
                          <span className="text-muted-foreground uppercase block font-medium">Stocking Density</span>
                          <span className="font-semibold text-foreground">{ins.stockingDensity} / m²</span>
                        </div>
                        {ins.plannedHarvestDate && (
                          <div className="mt-2 col-span-2">
                            <span className="text-muted-foreground uppercase block font-medium">Planned Harvest</span>
                            <span className="font-semibold text-foreground">{formatDate(ins.plannedHarvestDate)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Document Inspection Modal ──────────────────────────────────────── */}
      <Dialog open={!!inspectModal} onOpenChange={() => setInspectModal(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-card border-border p-0">
          <DialogHeader className="p-5 border-b border-border/50">
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-base font-semibold">{inspectModal?.title}</DialogTitle>
              {inspectModal?.url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => window.open(inspectModal.url, '_blank')}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open in New Tab
                </Button>
              )}
            </div>
          </DialogHeader>

          {inspectModal && (
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] flex flex-col items-center justify-center bg-background/50">
              {inspectModal.url.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={inspectModal.url}
                  className="w-full h-[65vh] rounded-lg border border-border/50"
                  title={inspectModal.title}
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={inspectModal.url}
                  alt={inspectModal.title}
                  className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain shadow-lg"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
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
            className={`text-[10px] px-1.5 py-0 ${url ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'text-muted-foreground'}`}
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
          <Button
            variant="outline"
            size="sm"
            className="px-2.5"
            onClick={() => window.open(url, '_blank')}
            title="Download Document"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="mt-4 text-center py-2 text-[11px] text-muted-foreground/60 italic border border-dashed border-border/40 rounded-lg">
          No file on record
        </div>
      )}
    </div>
  );
}

// ─── Sub-Component: Pond Card with Live Entries ──────────────────────────────

function PondCard({
  pond,
  onInspectPhoto,
  onInspectMedia,
}: {
  pond: Pond;
  onInspectPhoto: (url: string) => void;
  onInspectMedia: (title: string, url: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<{ daily: DailyEntry[]; oneTime: OneTimeEntry[] } | null>(null);

  const pondPhotoUrl = getMediaUrl(pond.photo);

  const fetchEntries = async () => {
    if (entries) return;
    setLoading(true);
    try {
      const json = await apiFetch<ApiResponse<{ dailyEntries: DailyEntry[]; oneTimeEntries: OneTimeEntry[] }>>(
        `/api/dashboard/ponds/${pond._id}/entries`
      );
      if (json.success) {
        setEntries({ daily: json.data.dailyEntries, oneTime: json.data.oneTimeEntries });
      }
    } catch (err) {
      console.error('Failed to load pond entries', err);
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    if (!expanded) fetchEntries();
    setExpanded(!expanded);
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden flex flex-col justify-between">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm flex items-center gap-1.5">
              <Waves className="h-4 w-4 text-cyan-400" />
              Pond {pond.pondNumber}: {pond.name}
            </p>
            {pond.dimensionAcres && (
              <p className="text-xs text-muted-foreground mt-0.5">{pond.dimensionAcres} Acres dimension</p>
            )}
          </div>
          {pondPhotoUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
              onClick={() => onInspectPhoto(pondPhotoUrl)}
            >
              Photo
            </Button>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs justify-between"
          onClick={toggle}
        >
          <span>{expanded ? 'Hide Entries' : 'View Operations & Entries'}</span>
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>

      {expanded && (
        <div className="p-4 border-t border-border/30 bg-background/40 space-y-3">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : entries ? (
            <div className="space-y-3">
              {/* Daily entries count */}
              <div>
                <p className="text-[11px] font-semibold uppercase text-muted-foreground mb-1.5">
                  Daily Entries ({entries.daily.length})
                </p>
                {entries.daily.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No daily entries submitted.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {entries.daily.slice(0, 5).map((e) => (
                      <DailyEntryItem
                        key={e._id}
                        entryId={e._id}
                        summary={`Day ${e.dayNumber} — ${formatDate(e.date)}`}
                        onInspectMedia={onInspectMedia}
                      />
                    ))}
                    {entries.daily.length > 5 && (
                      <p className="text-[11px] text-center text-muted-foreground pt-1">
                        + {entries.daily.length - 5} older entries
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* One time entries */}
              {entries.oneTime.length > 0 && (
                <div className="pt-2 border-t border-border/20">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground mb-1.5">
                    One-Time Entries ({entries.oneTime.length})
                  </p>
                  <div className="space-y-1 text-xs">
                    {entries.oneTime.map((ot) => (
                      <div key={ot._id} className="bg-card/50 p-2 rounded border border-border/20">
                        <span className="font-medium">{formatDate(ot.createdAt)}</span>
                        {ot.stage && <span className="text-muted-foreground ml-2">Stage: {ot.stage}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-destructive">Failed to load entries.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-Component: Daily Entry Item with SeaweedFS Media ───────────────────

function DailyEntryItem({
  entryId,
  summary,
  onInspectMedia,
}: {
  entryId: string;
  summary: string;
  onInspectMedia: (title: string, url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<DailyEntry | null>(null);

  const fetchDetail = async () => {
    if (entry) return;
    setLoading(true);
    try {
      const json = await apiFetch<ApiResponse<DailyEntry>>(`/api/dashboard/entries/${entryId}`);
      if (json.success) setEntry(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    if (!open) fetchDetail();
    setOpen(!open);
  };

  return (
    <div className="rounded border border-border/30 bg-card/60 text-xs">
      <button
        onClick={toggle}
        className="w-full text-left p-2 flex items-center justify-between hover:bg-accent/30 transition-colors"
      >
        <span className="font-medium">{summary}</span>
        <span className="text-[10px] text-muted-foreground">{open ? 'Close' : 'Inspect'}</span>
      </button>

      {open && (
        <div className="p-3 border-t border-border/20 space-y-2 bg-background/50">
          {loading ? (
            <Skeleton className="h-12 w-full" />
          ) : entry ? (
            <div className="space-y-2">
              {entry.waterQuality && (
                <div className="grid grid-cols-2 gap-1 text-[11px] bg-card p-2 rounded">
                  <span>pH: <strong>{entry.waterQuality.ph ?? '—'}</strong></span>
                  <span>DO: <strong>{entry.waterQuality.do ?? '—'}</strong></span>
                  <span>Temp: <strong>{entry.waterQuality.temperature ?? '—'}°C</strong></span>
                  <span>Ammonia: <strong>{entry.waterQuality.ammonia ?? '—'}</strong></span>
                </div>
              )}

              {/* Media Attachments (Bills & Shrimp photos) */}
              <div className="flex flex-wrap gap-2 pt-1">
                {entry.shrimpHealth?.shrimpPhoto && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => onInspectMedia('Shrimp Health Photo', getMediaUrl(entry.shrimpHealth?.shrimpPhoto)!)}
                  >
                    Shrimp Photo
                  </Button>
                )}
                {entry.feedManagement?.feedBills && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => onInspectMedia('Feed Bill Document', getMediaUrl(entry.feedManagement?.feedBills)!)}
                  >
                    Feed Bill
                  </Button>
                )}
                {entry.financials?.miscBills && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => onInspectMedia('Misc Bill Document', getMediaUrl(entry.financials?.miscBills)!)}
                  >
                    Misc Bill
                  </Button>
                )}
                {entry.waterQuality?.waterReport && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => onInspectMedia('Water Quality Report', getMediaUrl(entry.waterQuality?.waterReport)!)}
                  >
                    Water Report
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-destructive">Failed to load details.</p>
          )}
        </div>
      )}
    </div>
  );
}
