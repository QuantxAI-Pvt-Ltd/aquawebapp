'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Waves,
  Eye,
  AlertTriangle,
  FileText,
  Activity,
  User,
  ArrowRight,
  Maximize2,
  DollarSign,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/lib/formatters';
import { api } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/fileUtils';
import type { Insurance, Farmer, Pond, Farm, DailyEntry } from '@/types';

const REASON_LABELS: Record<string, string> = {
  disease_outbreak: 'Disease Outbreak (WSSV/EHP/EMS)',
  mass_mortality: 'Sudden Mass Mortality',
  flooding_calamity: 'Flooding / Calamity',
  water_toxicity: 'Water Toxicity / Crash',
  other: 'Other Incident',
};

export default function InsurancesPage() {
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [serverCounts, setServerCounts] = useState<{
    total: number;
    pending: number;
    approved: number;
    active: number;
  } | null>(null);

  // Fullscreen Review Modal state
  const [selectedPolicy, setSelectedPolicy] = useState<Insurance | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState<number>(0);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [pondEntries, setPondEntries] = useState<{ dailyEntries: DailyEntry[] } | null>(null);
  const [loadingPondEntries, setLoadingPondEntries] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  // Image zoom modal
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (debouncedSearch) params.append('search', debouncedSearch);

        const res = await api.get<{
          success: boolean;
          data: {
            total: number;
            counts?: {
              total: number;
              pending: number;
              approved: number;
              active: number;
            };
            insurances: Insurance[];
          };
        }>(`/api/dashboard/insurances?${params.toString()}`);

        if (isCurrent) {
          setInsurances(res.data.insurances || []);
          if (res.data.counts) {
            setServerCounts(res.data.counts);
          }
        }
      } catch (err) {
        console.error('Failed to fetch insurances:', err);
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      isCurrent = false;
    };
  }, [statusFilter, debouncedSearch, refreshKey]);

  // When opening full screen assessment, load pond recent entries for water quality context
  const handleOpenAssessment = async (policy: Insurance) => {
    setSelectedPolicy(policy);
    setSettlementAmount(policy.claim?.settlementAmount || 0);
    setReviewerNotes(policy.claim?.reviewerNotes || '');
    setModalOpen(true);

    const pId = typeof policy.pondId === 'object' ? policy.pondId?._id : policy.pondId;
    if (pId) {
      setLoadingPondEntries(true);
      try {
        const res = await api.get<{ success: boolean; data: { dailyEntries: DailyEntry[] } }>(
          `/api/dashboard/ponds/${pId}/entries`
        );
        setPondEntries(res.data);
      } catch (err) {
        console.warn('Could not load pond logs:', err);
      } finally {
        setLoadingPondEntries(false);
      }
    }
  };

  const handleReviewClaim = async (action: 'approve' | 'reject') => {
    if (!selectedPolicy) return;

    if (action === 'approve' && settlementAmount <= 0) {
      toast.error('Please enter a valid settlement payout amount (₹).');
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.patch<{ success: boolean; data: Insurance }>(
        `/api/dashboard/insurances/${selectedPolicy._id}/claim`,
        {
          action,
          settlementAmount: Number(settlementAmount),
          reviewerNotes,
        }
      );

      if (res.success) {
        setSelectedPolicy(res.data);
        setRefreshKey((k) => k + 1);
        toast.success(
          action === 'approve'
            ? `Claim authorized! Settlement of ₹${Number(settlementAmount).toLocaleString('en-IN')} approved.`
            : 'Claim officially rejected.'
        );
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
      toast.error('Error saving claim assessment. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const counts = useMemo(() => {
    if (serverCounts) return serverCounts;
    const total = insurances.length;
    const pending = insurances.filter(
      (i) => (i.status === 'claim_pending' || (i.claim?.status === 'pending' || i.claim?.status === 'under_review')) && (!!i.claim?.claimedAt || i.status === 'claim_pending')
    ).length;
    const approved = insurances.filter(
      (i) => (i.status === 'claim_approved' || i.status === 'claimed' || i.claim?.status === 'approved') && (!!i.claim?.claimedAt || i.status.startsWith('claim'))
    ).length;
    const active = insurances.filter((i) => i.status === 'active').length;
    return { total, pending, approved, active };
  }, [insurances, serverCounts]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
            Insurances & Claims Ledger
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Monitor active pond policies, evaluate incident claims, and authorize verified payouts.
          </p>
        </div>

        {counts.pending > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#E23E57]/10 border border-[#E23E57]/30 text-[#E23E57] text-xs font-semibold shadow-xs">
            <AlertTriangle className="h-4 w-4 text-[#E23E57] animate-pulse" />
            <span>{counts.pending} Claim(s) Awaiting Assessment</span>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-[11px] font-bold uppercase text-muted-foreground tracking-wider">All Policies</p>
              <p className="text-xl md:text-2xl font-black text-foreground mt-0.5">{counts.total}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#88304E]/10 border border-[#88304E]/20 flex items-center justify-center text-[#88304E] dark:text-[#E23E57]">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Active Coverage</p>
              <p className="text-xl md:text-2xl font-black text-foreground mt-0.5">{counts.active}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#88304E]/10 border border-[#88304E]/20 flex items-center justify-center text-[#88304E] dark:text-[#E23E57]">
              <Waves className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className={`rounded-2xl shadow-xs transition ${counts.pending > 0 ? 'border-[#E23E57]/40 bg-[#E23E57]/5' : 'border-border bg-card'}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Pending Claims</p>
              <p className="text-xl md:text-2xl font-black text-[#E23E57] mt-0.5">{counts.pending}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#E23E57]/10 border border-[#E23E57]/20 flex items-center justify-center text-[#E23E57]">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Settled Claims</p>
              <p className="text-xl md:text-2xl font-black text-foreground mt-0.5">{counts.approved}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-[#88304E]/10 border border-[#88304E]/20 flex items-center justify-center text-[#88304E] dark:text-[#E23E57]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border bg-card shadow-xs rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Status Filter Tabs */}
            <Tabs
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val)}
              className="w-full md:w-auto"
            >
              <TabsList className="flex flex-wrap gap-1 p-1 bg-secondary/50 rounded-xl text-xs font-semibold text-muted-foreground w-full md:w-auto border border-border">
                {[
                  { id: 'all', label: 'All Policies' },
                  { id: 'claim_pending', label: 'Pending Claims', count: counts.pending },
                  { id: 'claim_approved', label: 'Settled Claims' },
                  { id: 'active', label: 'Active Coverage' },
                  { id: 'claim_rejected', label: 'Rejected Claims' },
                  { id: 'expired', label: 'Expired' },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer gap-1.5 select-none"
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="px-1.5 py-0.2 bg-[#E23E57] text-white rounded-full text-[10px] font-bold">
                        {tab.count}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search farmer, phone, species..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs bg-background/80 border-border rounded-xl"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Policies Table */}
      <Card className="border-border bg-card overflow-hidden shadow-xs rounded-2xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow className="border-border">
                <TableHead className="w-[22%] font-bold text-xs uppercase text-muted-foreground align-middle">Farmer</TableHead>
                <TableHead className="w-[18%] font-bold text-xs uppercase text-muted-foreground align-middle">Pond Details</TableHead>
                <TableHead className="w-[15%] font-bold text-xs uppercase text-muted-foreground align-middle">Species & Density</TableHead>
                <TableHead className="w-[14%] font-bold text-xs uppercase text-muted-foreground align-middle">Policy Status</TableHead>
                <TableHead className="w-[18%] font-bold text-xs uppercase text-muted-foreground align-middle">Claim Assessment</TableHead>
                <TableHead className="w-[13%] text-right font-bold text-xs uppercase text-muted-foreground align-middle pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell className="align-middle"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="align-middle"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="align-middle"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="align-middle"><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="align-middle"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="text-right align-middle pr-4"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : insurances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-sm align-middle">
                    No insurance records found matching this criteria.
                  </TableCell>
                </TableRow>
              ) : (
                insurances.map((policy) => {
                  const farmer = typeof policy.farmerId === 'object' ? (policy.farmerId as Farmer) : null;
                  const pond = typeof policy.pondId === 'object' ? (policy.pondId as Pond) : null;
                  const claim = policy.claim;
                  const hasClaim = !!claim?.claimedAt || policy.status.startsWith('claim');
                  const isClaimPending = hasClaim && (policy.status === 'claim_pending' || claim?.status === 'pending' || claim?.status === 'under_review');
                  const isClaimApproved = hasClaim && (policy.status === 'claim_approved' || policy.status === 'claimed' || claim?.status === 'approved');
                  const isClaimRejected = hasClaim && (policy.status === 'claim_rejected' || claim?.status === 'rejected');

                  return (
                    <TableRow key={policy._id} className="border-border hover:bg-secondary/20 transition-colors">
                      {/* Farmer Name & Contact */}
                      <TableCell className="font-medium text-xs align-middle">
                        {farmer ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground text-sm">{farmer.name}</span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 font-mono">
                              <User size={11} className="text-primary" /> {farmer.phone}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">ID: {String(policy.farmerId).slice(-6)}</span>
                        )}
                      </TableCell>

                      {/* Pond Info */}
                      <TableCell className="text-xs align-middle">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground flex items-center gap-1">
                            <Waves size={13} className="text-primary" />
                            {pond ? `Pond ${pond.pondNumber}: ${pond.name}` : 'Assigned Pond'}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {pond?.dimensionAcres ? `${pond.dimensionAcres} Acres` : 'Standard Pond'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Species */}
                      <TableCell className="text-xs align-middle">
                        <div className="flex flex-col">
                          <span className="font-semibold capitalize text-foreground">{policy.species}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {policy.stockingDensity} PL/m² · {policy.insurancePeriodDays}d
                          </span>
                        </div>
                      </TableCell>

                      {/* Policy Status Badge */}
                      <TableCell className="text-xs align-middle">
                        {policy.status === 'active' ? (
                          <Badge className="bg-primary/15 text-primary border-primary/30">Active</Badge>
                        ) : policy.status === 'expired' ? (
                          <Badge variant="secondary" className="font-medium">Expired</Badge>
                        ) : (
                          <Badge className="bg-[#E23E57]/15 text-[#E23E57] border-[#E23E57]/30 capitalize">
                            {policy.status.replace('_', ' ')}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Claim Status */}
                      <TableCell className="text-xs align-middle">
                        {claim?.claimedAt ? (
                          <div className="flex flex-col gap-0.5">
                            <span className={`inline-flex items-center gap-1 font-bold text-[11px] ${
                              isClaimApproved
                                ? 'text-primary'
                                : isClaimRejected
                                ? 'text-destructive'
                                : 'text-[#E23E57] font-extrabold'
                            }`}>
                              {isClaimApproved ? (
                                <CheckCircle2 size={12} />
                              ) : isClaimRejected ? (
                                <XCircle size={12} />
                              ) : (
                                <Clock size={12} className="animate-spin" />
                              )}
                              {isClaimApproved
                                ? `Settled (₹${Number(claim.settlementAmount || 0).toLocaleString('en-IN')})`
                                : isClaimRejected
                                ? 'Rejected'
                                : 'Decision Pending'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {REASON_LABELS[claim.reason || ''] || claim.reason}
                            </span>
                            <span className="text-[9px] text-muted-foreground/80 font-mono">
                              Filed: {formatDate(claim.claimedAt)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/70 italic">No claim filed</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right text-xs align-middle pr-4">
                        <div className="flex items-center justify-end">
                          {isClaimPending ? (
                            <Button
                              size="sm"
                              onClick={() => handleOpenAssessment(policy)}
                              className="bg-[#E23E57] hover:bg-[#E23E57]/90 text-white font-bold text-xs h-8 px-3 rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <ShieldAlert size={14} />
                              <span>Assess Claim</span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenAssessment(policy)}
                              className="h-8 px-3 text-xs text-foreground hover:bg-secondary rounded-xl cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Maximize2 size={13} className="text-primary" />
                              <span>View Policy</span>
                            </Button>
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

      {/* ── EXPANSIVE FULL-SCREEN POLICY & CLAIM ASSESSMENT WORKSPACE ────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="!max-w-[96vw] !w-[96vw] 2xl:!max-w-[1600px] !h-[92vh] !max-h-[94vh] p-0 rounded-2xl bg-card border-border shadow-2xl flex flex-col overflow-hidden">
          {selectedPolicy && (
            <>
              {/* Header Bar */}
              {(() => {
                const modalHasClaim = !!selectedPolicy.claim?.claimedAt || selectedPolicy.status.startsWith('claim');
                return (
                  <DialogHeader className="px-6 py-4 border-b border-border bg-secondary/30 backdrop-blur-md shrink-0">
                    <div className="flex flex-wrap items-center justify-between gap-4 pr-8">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm ${
                          !modalHasClaim
                            ? 'bg-primary'
                            : selectedPolicy.claim?.status === 'approved'
                            ? 'bg-primary'
                            : selectedPolicy.claim?.status === 'rejected'
                            ? 'bg-destructive'
                            : 'bg-[#E23E57]'
                        }`}>
                          {!modalHasClaim ? <ShieldCheck size={22} /> : <ShieldAlert size={22} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <DialogTitle className="text-lg font-bold text-foreground">
                              {!modalHasClaim ? 'Insurance Policy Dossier' : 'Policy & Claim Assessment Workspace'}
                            </DialogTitle>
                            <Badge variant="outline" className="font-mono text-xs border-border bg-card">
                              ID: #{selectedPolicy._id}
                            </Badge>
                            <Badge className={`uppercase text-xs font-bold px-2 py-0.5 ${
                              !modalHasClaim
                                ? 'bg-primary/20 text-primary border-primary/30'
                                : selectedPolicy.claim?.status === 'approved'
                                ? 'bg-primary text-white'
                                : selectedPolicy.claim?.status === 'rejected'
                                ? 'bg-destructive text-white'
                                : 'bg-[#E23E57] text-white'
                            }`}>
                              {!modalHasClaim ? selectedPolicy.status : (selectedPolicy.claim?.status ? selectedPolicy.claim.status.replace('_', ' ') : selectedPolicy.status)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {!modalHasClaim
                              ? 'Active pond insurance coverage, pond parameters, and historical telemetry dossier.'
                              : 'Technical review, loss assessment telemetry, and official government payout determination.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {typeof selectedPolicy.farmerId === 'object' && (
                          <Link
                            href={`/farmers/${(selectedPolicy.farmerId as Farmer)._id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-foreground transition-colors"
                          >
                            <span>Open Farmer Profile</span>
                            <ExternalLink size={13} className="text-primary" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </DialogHeader>
                );
              })()}

              {/* ── Main Full-Screen Split Assessment Workspace ────────────── */}
              <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-border">
                {/* ── LEFT COLUMN (45%): Incident Evidence & Environmental Telemetry ── */}
                <div className="w-full lg:w-[46%] p-6 overflow-y-auto space-y-6 bg-secondary/10">
                  {/* Linked Farmer & Pond Overview */}
                  <Card className="border-border bg-card rounded-2xl shadow-xs">
                    <CardHeader className="pb-3 border-b border-border bg-secondary/20">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <User size={14} className="text-primary" /> Registered Producer & Pond Dossier
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Farmer Name</span>
                        <span className="font-bold text-foreground text-sm">
                          {typeof selectedPolicy.farmerId === 'object' ? (selectedPolicy.farmerId as Farmer).name : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Contact Phone</span>
                        <span className="font-semibold text-foreground">
                          {typeof selectedPolicy.farmerId === 'object' ? (selectedPolicy.farmerId as Farmer).phone : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Assigned Pond</span>
                        <span className="font-bold text-foreground flex items-center gap-1">
                          <Waves size={13} className="text-primary" />
                          {typeof selectedPolicy.pondId === 'object' ? `${(selectedPolicy.pondId as Pond).name} (${(selectedPolicy.pondId as Pond).dimensionAcres || 0} Ac)` : 'Pond'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Location / Taluk</span>
                        <span className="font-medium text-foreground">
                          {typeof selectedPolicy.farmerId === 'object' ? `${(selectedPolicy.farmerId as Farmer).address?.taluk || ''}, ${(selectedPolicy.farmerId as Farmer).address?.district || ''}` : 'Coastal District'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Incident Description & Reason */}
                  {selectedPolicy.claim?.claimedAt && (
                    <Card className="border-border bg-card rounded-2xl shadow-xs">
                      <CardHeader className="pb-3 border-b border-border bg-secondary/20">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <FileText size={14} className="text-[#E23E57]" /> Claim Incident Dossier
                          </CardTitle>
                          <span className="text-xs text-muted-foreground font-mono">
                            Filed: {formatDate(selectedPolicy.claim.claimedAt)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-secondary/30 border border-border">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Incident Trigger</span>
                            <span className="font-bold text-foreground text-sm">
                              {REASON_LABELS[selectedPolicy.claim.reason || ''] || selectedPolicy.claim.reason}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Reported Mortality</span>
                            <span className="font-extrabold text-[#E23E57] text-base">
                              {selectedPolicy.claim.estimatedLossPercent || 0}% Crop Loss
                            </span>
                          </div>
                        </div>

                        {selectedPolicy.claim.description && (
                          <div>
                            <span className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">
                              Farmer Field Observations:
                            </span>
                            <p className="text-xs text-foreground bg-secondary/20 p-3.5 rounded-xl border border-border leading-relaxed whitespace-pre-wrap">
                              {selectedPolicy.claim.description}
                            </p>
                          </div>
                        )}

                        {/* Photo Evidence */}
                        {selectedPolicy.claim.evidencePhoto && (
                          <div>
                            <span className="text-[11px] font-bold text-muted-foreground uppercase block mb-1">
                              Photographic Loss Evidence:
                            </span>
                            {(() => {
                              const url = resolveMediaUrl(selectedPolicy.claim.evidencePhoto);
                              return url ? (
                                <div
                                  onClick={() => setZoomImage(url)}
                                  className="relative group cursor-pointer rounded-2xl overflow-hidden border border-border h-56 bg-black/60 flex items-center justify-center shadow-sm"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={url} alt="Claim Evidence" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1.5 transition">
                                    <Eye size={16} /> Click to Fullscreen
                                  </div>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Pre-Loss Environmental Telemetry */}
                  <Card className="border-border bg-card rounded-2xl shadow-xs">
                    <CardHeader className="pb-3 border-b border-border bg-secondary/20">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Activity size={14} className="text-primary" /> Pre-Loss Pond Telemetry Audit
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      {loadingPondEntries ? (
                        <Skeleton className="h-20 w-full rounded-xl" />
                      ) : pondEntries?.dailyEntries && pondEntries.dailyEntries.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-xs text-muted-foreground">
                            Audited water parameters from latest daily telemetry log (Day {pondEntries.dailyEntries[0].dayNumber} · {formatDate(pondEntries.dailyEntries[0].date)}):
                          </p>
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div className="bg-secondary/30 p-2.5 rounded-xl border border-border text-center">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">DO (Oxygen)</span>
                              <span className="font-bold text-primary text-sm">
                                {pondEntries.dailyEntries[0].waterQuality?.do ? `${pondEntries.dailyEntries[0].waterQuality.do} mg/L` : '—'}
                              </span>
                            </div>
                            <div className="bg-secondary/30 p-2.5 rounded-xl border border-border text-center">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">pH Level</span>
                              <span className="font-bold text-foreground text-sm">
                                {pondEntries.dailyEntries[0].waterQuality?.ph ?? '—'}
                              </span>
                            </div>
                            <div className="bg-secondary/30 p-2.5 rounded-xl border border-border text-center">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Temp</span>
                              <span className="font-bold text-primary text-sm">
                                {pondEntries.dailyEntries[0].waterQuality?.temperature ? `${pondEntries.dailyEntries[0].waterQuality.temperature}°C` : '—'}
                              </span>
                            </div>
                            <div className="bg-secondary/30 p-2.5 rounded-xl border border-border text-center">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Ammonia</span>
                              <span className="font-bold text-[#E23E57] text-sm">
                                {pondEntries.dailyEntries[0].waterQuality?.ammonia ? `${pondEntries.dailyEntries[0].waterQuality.ammonia} mg/L` : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic bg-secondary/20 p-3 rounded-xl">
                          No previous daily telemetry entries found for this pond.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* ── RIGHT COLUMN (54%): Policy Matrix, Financial Assessment & Determination ── */}
                <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-card">
                  {/* Policy Parameters & Culture Matrix */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-secondary/30 p-3.5 rounded-2xl border border-border">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground block">Species Stocked</span>
                      <span className="font-bold text-foreground text-sm capitalize">{selectedPolicy.species}</span>
                    </div>
                    <div className="bg-secondary/30 p-3.5 rounded-2xl border border-border">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground block">Stocking Density</span>
                      <span className="font-bold text-foreground text-sm">{selectedPolicy.stockingDensity} PL/m²</span>
                    </div>
                    <div className="bg-secondary/30 p-3.5 rounded-2xl border border-border">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground block">Stocking Date</span>
                      <span className="font-bold text-foreground text-sm">{formatDate(selectedPolicy.stockingDate)}</span>
                    </div>
                    <div className="bg-secondary/30 p-3.5 rounded-2xl border border-border">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground block">Policy Plan</span>
                      <span className="font-bold text-primary text-sm capitalize">{selectedPolicy.insuranceType} Plan</span>
                    </div>
                  </div>

                  {/* Compensation & Valuation Benchmarking */}
                  {(() => {
                    const modalHasClaim = !!selectedPolicy.claim?.claimedAt || selectedPolicy.status.startsWith('claim');
                    if (!modalHasClaim) {
                      return (
                        <Card className="border-border bg-secondary/15 rounded-2xl shadow-xs">
                          <CardHeader className="pb-3 border-b border-border">
                            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                              <ShieldCheck size={16} className="text-primary" />
                              Active Insurance Policy Dossier
                            </CardTitle>
                            <CardDescription className="text-xs">
                              Continuous biometric monitoring & coverage status.
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-6 text-center space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
                              <ShieldCheck size={24} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-foreground">Active Coverage — No Incident Claim Filed</h4>
                              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
                                This pond policy is currently in good standing with active coverage. When the farmer files an incident claim through the mobile application, loss assessment evidence, water telemetry alerts, and DBT settlement tools will be activated here.
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    return (
                      <Card className="border-border bg-secondary/15 rounded-2xl shadow-xs">
                        <CardHeader className="pb-3 border-b border-border">
                          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                            <DollarSign size={16} className="text-primary" />
                            Loss Valuation & Payout Determination Matrix
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Calculated benchmark assistance based on registered acreage, stocking density, and validated mortality.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-5 space-y-5">
                          {/* Settlement Payout Entry */}
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-foreground block">
                              Authorized Government Settlement Payout (₹)
                            </label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm text-muted-foreground">₹</span>
                              <Input
                                type="number"
                                min={0}
                                step={1000}
                                placeholder="Enter verified payout amount (e.g. 250000)"
                                value={settlementAmount || ''}
                                onChange={(e) => setSettlementAmount(Number(e.target.value))}
                                className="pl-8 text-base font-bold bg-background border-border rounded-xl h-11"
                                disabled={selectedPolicy.claim?.status === 'approved' || selectedPolicy.claim?.status === 'rejected'}
                              />
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Direct Benefit Transfer (DBT) will disburse this amount to the farmer&apos;s verified bank account.
                            </p>
                          </div>

                          {/* Reviewer Technical Notes */}
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-foreground block">
                              Underwriter Assessment & Field Justification
                            </label>
                            <Textarea
                              rows={4}
                              placeholder="Document observations from site inspections, water parameters, biometric sampling, and biosecurity audits..."
                              value={reviewerNotes}
                              onChange={(e) => setReviewerNotes(e.target.value)}
                              className="w-full text-xs bg-background border border-border rounded-xl p-3 focus-visible:ring-1 focus-visible:ring-primary leading-relaxed"
                              disabled={selectedPolicy.claim?.status === 'approved' || selectedPolicy.claim?.status === 'rejected'}
                            />
                          </div>

                          {/* Status Summary & Execution Buttons */}
                          {selectedPolicy.claim?.status === 'approved' ? (
                            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 text-xs space-y-2">
                              <div className="flex items-center justify-between font-bold text-primary">
                                <span className="flex items-center gap-1.5 text-sm">
                                  <CheckCircle2 size={18} /> Claim Officially Authorized & Settled
                                </span>
                                <span className="text-base font-black">
                                  ₹{Number(selectedPolicy.claim.settlementAmount || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                              {selectedPolicy.claim.reviewedAt && (
                                <p className="text-[11px] text-muted-foreground">
                                  Approved on {formatDate(selectedPolicy.claim.reviewedAt)}
                                </p>
                              )}
                              {selectedPolicy.claim.reviewerNotes && (
                                <p className="text-foreground pt-2 border-t border-primary/20">
                                  <strong>Inspector Notes: </strong>{selectedPolicy.claim.reviewerNotes}
                                </p>
                              )}
                            </div>
                          ) : selectedPolicy.claim?.status === 'rejected' ? (
                            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-xs space-y-2">
                              <div className="font-bold text-destructive flex items-center gap-1.5 text-sm">
                                <XCircle size={18} /> Claim Rejected
                              </div>
                              {selectedPolicy.claim.reviewedAt && (
                                <p className="text-[11px] text-muted-foreground">
                                  Rejected on {formatDate(selectedPolicy.claim.reviewedAt)}
                                </p>
                              )}
                              {selectedPolicy.claim.reviewerNotes && (
                                <p className="text-foreground pt-2 border-t border-destructive/20">
                                  <strong>Rejection Justification: </strong>{selectedPolicy.claim.reviewerNotes}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="pt-2 flex flex-col sm:flex-row gap-3">
                              <Button
                                onClick={() => handleReviewClaim('approve')}
                                disabled={actionLoading}
                                className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold text-xs h-11 rounded-xl shadow-sm gap-2 cursor-pointer"
                              >
                                <CheckCircle2 size={16} />
                                <span>Authorize Verified Settlement Payout</span>
                              </Button>
                              <Button
                                onClick={() => handleReviewClaim('reject')}
                                disabled={actionLoading}
                                variant="destructive"
                                className="flex-1 font-bold text-xs h-11 rounded-xl shadow-sm gap-2 cursor-pointer"
                              >
                                <XCircle size={16} />
                                <span>Reject Claim</span>
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Image zoom modal */}
      <Dialog open={!!zoomImage} onOpenChange={() => setZoomImage(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black border-zinc-800">
          {zoomImage && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={zoomImage} alt="Enlarged" className="max-h-[80vh] w-auto object-contain rounded-md" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
