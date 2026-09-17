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
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/lib/formatters';
import { api } from '@/lib/api';
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

  // Review Drawer state
  const [selectedPolicy, setSelectedPolicy] = useState<Insurance | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
            insurances: Insurance[];
          };
        }>(`/api/dashboard/insurances?${params.toString()}`);

        if (isCurrent) {
          setInsurances(res.data.insurances || []);
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

  // When opening review drawer, load pond recent entries for water quality context
  const handleOpenDrawer = async (policy: Insurance) => {
    setSelectedPolicy(policy);
    setSettlementAmount(policy.claim?.settlementAmount || 0);
    setReviewerNotes(policy.claim?.reviewerNotes || '');
    setDrawerOpen(true);

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
      alert('Please enter a valid settlement payout amount (₹).');
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
        setDrawerOpen(false);
      }
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to process claim review.');
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics
  const counts = useMemo(() => {
    const total = insurances.length;
    const pending = insurances.filter(
      (i) => i.status === 'claim_pending' || i.claim?.status === 'pending'
    ).length;
    const approved = insurances.filter(
      (i) => i.status === 'claim_approved' || i.claim?.status === 'approved'
    ).length;
    const active = insurances.filter((i) => i.status === 'active').length;
    return { total, pending, approved, active };
  }, [insurances]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 md:h-7 md:w-7 text-primary" />
            Insurances & Claims Ledger
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Monitor active pond policies, evaluate incident claims, and authorize verified payouts.
          </p>
        </div>

        {counts.pending > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold shadow-xs">
            <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" />
            <span>{counts.pending} Claim(s) Awaiting Decision</span>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-xl shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-[11px] font-bold uppercase text-muted-foreground tracking-wider">All Policies</p>
              <p className="text-xl md:text-2xl font-black text-foreground mt-0.5">{counts.total}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xl shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Active Coverage</p>
              <p className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{counts.active}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Waves className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className={`shadow-xs transition backdrop-blur-xl ${counts.pending > 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-border/60 bg-card/60'}`}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Pending Claims</p>
              <p className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{counts.pending}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-xl shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Approved / Settled</p>
              <p className="text-xl md:text-2xl font-black text-primary mt-0.5">{counts.approved}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-xl shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-muted rounded-xl text-xs font-semibold text-muted-foreground w-full md:w-auto">
              {[
                { id: 'all', label: 'All Policies' },
                { id: 'claim_pending', label: 'Pending Claims', count: counts.pending },
                { id: 'claim_approved', label: 'Settled Claims' },
                { id: 'active', label: 'Active Coverage' },
                { id: 'claim_rejected', label: 'Rejected Claims' },
                { id: 'expired', label: 'Expired' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-card text-foreground shadow-xs font-bold'
                      : 'hover:text-foreground'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

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

      {/* Data Table */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Policy</TableHead>
                <TableHead className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Farmer</TableHead>
                <TableHead className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Pond & Farm</TableHead>
                <TableHead className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Culture Details</TableHead>
                <TableHead className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Policy Status</TableHead>
                <TableHead className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">Claim Status</TableHead>
                <TableHead className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7} className="py-4">
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : insurances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm font-semibold text-foreground">No insurance records found</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Try clearing filters or search terms</p>
                  </TableCell>
                </TableRow>
              ) : (
                insurances.map((policy) => {
                  const farmer = typeof policy.farmerId === 'object' ? (policy.farmerId as Farmer) : null;
                  const pond = typeof policy.pondId === 'object' ? (policy.pondId as Pond) : null;
                  const farm = typeof policy.farmId === 'object' ? (policy.farmId as Farm) : null;
                  const claim = policy.claim;
                  const isClaimPending = policy.status === 'claim_pending' || claim?.status === 'pending';
                  const isClaimApproved = policy.status === 'claim_approved' || claim?.status === 'approved';
                  const isClaimRejected = policy.status === 'claim_rejected' || claim?.status === 'rejected';

                  return (
                    <TableRow key={policy._id} className="hover:bg-muted/40 transition-colors">
                      {/* Policy Info */}
                      <TableCell className="font-medium text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isClaimPending ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary'
                          }`}>
                            {isClaimPending ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                          </div>
                          <div>
                            <span className="font-bold text-foreground block capitalize">
                              {policy.insuranceType} Plan
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              #{policy._id.slice(-6).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Farmer Profile Link */}
                      <TableCell className="text-xs">
                        {farmer ? (
                          <Link
                            href={`/farmers/${farmer._id}`}
                            className="group flex flex-col hover:opacity-80 transition"
                          >
                            <span className="font-bold text-primary group-hover:underline flex items-center gap-1">
                              {farmer.name}
                              <ExternalLink size={10} className="text-primary/60 group-hover:opacity-100" />
                            </span>
                            <span className="text-[11px] text-muted-foreground">{farmer.phone}</span>
                            <span className="text-[10px] text-muted-foreground/80">{farmer.address?.district || 'District N/A'}</span>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">ID: {String(policy.farmerId).slice(-6)}</span>
                        )}
                      </TableCell>

                      {/* Pond & Farm */}
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">
                            {pond?.name || `Pond ${pond?.pondNumber || ''}`}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {farm?.name || farm?.location?.place || 'Farm'} {pond?.dimensionAcres ? `· ${pond.dimensionAcres} ac` : ''}
                          </span>
                        </div>
                      </TableCell>

                      {/* Culture Details */}
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          <span className="font-semibold capitalize text-foreground">{policy.species}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {policy.stockingDensity} PL/m² · {policy.insurancePeriodDays}d
                          </span>
                        </div>
                      </TableCell>

                      {/* Policy Status Badge */}
                      <TableCell className="text-xs">
                        {policy.status === 'active' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Active</Badge>
                        ) : policy.status === 'expired' ? (
                          <Badge variant="secondary" className="font-medium">Expired</Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 capitalize">
                            {policy.status.replace('_', ' ')}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Claim Status */}
                      <TableCell className="text-xs">
                        {claim?.claimedAt ? (
                          <div className="flex flex-col gap-0.5">
                            <span className={`inline-flex items-center gap-1 font-bold text-[11px] ${
                              isClaimApproved
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isClaimRejected
                                ? 'text-destructive'
                                : 'text-amber-600 dark:text-amber-400 font-extrabold'
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
                            <span className="text-[9px] text-muted-foreground/80">
                              Filed: {formatDate(claim.claimedAt)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/70 italic">No claim filed</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right text-xs">
                        {isClaimPending ? (
                          <Button
                            size="sm"
                            onClick={() => handleOpenDrawer(policy)}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 px-3 rounded-lg shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <ShieldAlert size={14} />
                            <span>Review Claim</span>
                          </Button>
                        ) : claim?.claimedAt ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDrawer(policy)}
                            className="h-8 px-2.5 text-xs text-foreground hover:bg-accent cursor-pointer"
                          >
                            <Eye size={14} className="mr-1 text-primary" />
                            View Claim
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDrawer(policy)}
                            className="h-8 px-2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                          >
                            Details
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Slide-over Claim Review & Details using shadcn Sheet */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col border-l border-border bg-card">
          {selectedPolicy && (
            <>
              {/* Drawer Header */}
              <SheetHeader className="p-5 border-b border-border bg-muted/40 text-left">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    selectedPolicy.claim?.status === 'approved'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : selectedPolicy.claim?.status === 'rejected'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}>
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <SheetTitle className="text-base font-bold text-foreground">
                      Policy & Claim Assessment
                    </SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground font-mono">
                      ID: #{selectedPolicy._id}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Linked Farmer & Pond Card */}
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                      <User size={12} /> Farmer Information
                    </span>
                    {typeof selectedPolicy.farmerId === 'object' && (
                      <Link
                        href={`/farmers/${(selectedPolicy.farmerId as Farmer)._id}`}
                        className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                      >
                        <span>Full Farmer Dossier</span>
                        <ArrowRight size={12} />
                      </Link>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Farmer Name</span>
                      <span className="font-bold text-foreground">
                        {typeof selectedPolicy.farmerId === 'object' ? (selectedPolicy.farmerId as Farmer).name : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Contact</span>
                      <span className="font-semibold text-foreground">
                        {typeof selectedPolicy.farmerId === 'object' ? (selectedPolicy.farmerId as Farmer).phone : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Pond Name</span>
                      <span className="font-semibold text-foreground">
                        {typeof selectedPolicy.pondId === 'object' ? (selectedPolicy.pondId as Pond).name : 'Pond'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Culture Details</span>
                      <span className="font-semibold text-foreground capitalize">
                        {selectedPolicy.species} ({selectedPolicy.stockingDensity} PL/m²)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Claim Evaluation Section */}
                {selectedPolicy.claim?.claimedAt ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        <FileText size={16} className="text-primary" />
                        Claim Incident Dossier
                      </h4>
                      <Badge className={`uppercase text-xs font-bold ${
                        selectedPolicy.claim.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : selectedPolicy.claim.status === 'rejected'
                          ? 'bg-destructive/10 text-destructive border-destructive/30'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      }`}>
                        {selectedPolicy.claim.status === 'approved'
                          ? 'Settled'
                          : selectedPolicy.claim.status === 'rejected'
                          ? 'Rejected'
                          : 'Under Review'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Primary Reason</span>
                        <span className="font-bold text-foreground">
                          {REASON_LABELS[selectedPolicy.claim.reason || ''] || selectedPolicy.claim.reason}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Estimated Loss</span>
                        <span className="font-bold text-destructive">
                          {selectedPolicy.claim.estimatedLossPercent || 0}% Mortality
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Notice Date</span>
                        <span className="font-semibold text-foreground">
                          {formatDate(selectedPolicy.claim.claimedAt)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Insurance Plan</span>
                        <span className="font-semibold text-foreground capitalize">
                          {selectedPolicy.insuranceType} Coverage
                        </span>
                      </div>
                    </div>

                    {/* Incident Observations */}
                    {selectedPolicy.claim.description && (
                      <div>
                        <span className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                          Farmer Observations
                        </span>
                        <p className="text-xs text-foreground bg-muted/30 p-3 rounded-xl border border-border whitespace-pre-wrap leading-relaxed">
                          {selectedPolicy.claim.description}
                        </p>
                      </div>
                    )}

                    {/* Photo Evidence */}
                    {selectedPolicy.claim.evidencePhoto && (
                      <div>
                        <span className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                          Incident Evidence Photo
                        </span>
                        {(() => {
                          const url =
                            typeof selectedPolicy.claim.evidencePhoto === 'object'
                              ? selectedPolicy.claim.evidencePhoto?.url
                              : (selectedPolicy.claim.evidencePhoto as string);

                          return (
                            <div
                              onClick={() => url && setZoomImage(url)}
                              className="relative group cursor-pointer rounded-xl overflow-hidden border border-border h-44 bg-muted flex items-center justify-center"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt="Incident Evidence" className="h-full w-full object-cover group-hover:scale-105 transition duration-300" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold gap-1 transition">
                                <Eye size={16} /> Click to Expand
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Pre-Loss Water Quality History */}
                    <div className="border-t border-border pt-4">
                      <h5 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Activity size={14} className="text-primary" />
                        Pre-Loss Pond Water Quality Log Check
                      </h5>

                      {loadingPondEntries ? (
                        <Skeleton className="h-16 w-full rounded-xl" />
                      ) : pondEntries?.dailyEntries && pondEntries.dailyEntries.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-[11px] text-muted-foreground">
                            Latest recorded daily entry (Day {pondEntries.dailyEntries[0].dayNumber} · {formatDate(pondEntries.dailyEntries[0].date)}):
                          </p>
                          <div className="grid grid-cols-4 gap-2 bg-primary/5 p-2.5 rounded-xl border border-primary/20 text-xs">
                            <div>
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">pH</span>
                              <span className="font-bold text-primary">
                                {pondEntries.dailyEntries[0].waterQuality?.ph ?? 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">DO (mg/L)</span>
                              <span className="font-bold text-primary">
                                {pondEntries.dailyEntries[0].waterQuality?.do ?? 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">Temp (°C)</span>
                              <span className="font-bold text-primary">
                                {pondEntries.dailyEntries[0].waterQuality?.temperature ?? 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block">Ammonia</span>
                              <span className="font-bold text-primary">
                                {pondEntries.dailyEntries[0].waterQuality?.ammonia ?? 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic bg-muted/40 p-2.5 rounded-xl">
                          No previous daily entries logged for this pond.
                        </p>
                      )}
                    </div>

                    {/* Decision Action Area */}
                    <div className="border-t border-border pt-5 space-y-4">
                      <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Insurance Inspector Determination
                      </h5>

                      {selectedPolicy.claim.status === 'approved' ? (
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-2">
                          <div className="flex items-center justify-between font-bold text-emerald-600 dark:text-emerald-400">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 size={16} /> Settlement Approved
                            </span>
                            <span className="text-sm font-extrabold">
                              ₹{Number(selectedPolicy.claim.settlementAmount || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          {selectedPolicy.claim.reviewedAt && (
                            <p className="text-[10px] text-muted-foreground">
                              Approved on {formatDate(selectedPolicy.claim.reviewedAt)}
                            </p>
                          )}
                          {selectedPolicy.claim.reviewerNotes && (
                            <p className="text-foreground pt-1 border-t border-emerald-500/20">
                              <span className="font-bold">Inspector Notes: </span>
                              {selectedPolicy.claim.reviewerNotes}
                            </p>
                          )}
                        </div>
                      ) : selectedPolicy.claim.status === 'rejected' ? (
                        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-xs space-y-2">
                          <div className="font-bold text-destructive flex items-center gap-1">
                            <XCircle size={16} /> Claim Rejected
                          </div>
                          {selectedPolicy.claim.reviewedAt && (
                            <p className="text-[10px] text-muted-foreground">
                              Rejected on {formatDate(selectedPolicy.claim.reviewedAt)}
                            </p>
                          )}
                          {selectedPolicy.claim.reviewerNotes && (
                            <p className="text-foreground pt-1 border-t border-destructive/20">
                              <span className="font-bold">Rejection Reason: </span>
                              {selectedPolicy.claim.reviewerNotes}
                            </p>
                          )}
                        </div>
                      ) : (
                        /* Pending Claim Form */
                        <div className="space-y-3.5 bg-amber-500/5 p-4 rounded-xl border border-amber-500/30">
                          <div>
                            <label className="text-[11px] font-bold text-foreground uppercase tracking-wider block mb-1">
                              Settlement Payout Amount (₹ INR)
                            </label>
                            <Input
                              type="number"
                              min="0"
                              step="1000"
                              value={settlementAmount}
                              onChange={(e) => setSettlementAmount(Number(e.target.value))}
                              placeholder="e.g. 150000"
                              className="bg-background text-sm font-bold text-foreground border-border"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-foreground uppercase tracking-wider block mb-1">
                              Inspection Remarks & Audit Justification
                            </label>
                            <textarea
                              rows={3}
                              value={reviewerNotes}
                              onChange={(e) => setReviewerNotes(e.target.value)}
                              placeholder="Enter notes on pond inspection, verification of evidence, and settlement rationale..."
                              className="w-full text-xs p-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>

                          <div className="flex gap-2.5 pt-2">
                            <Button
                              onClick={() => handleReviewClaim('approve')}
                              disabled={actionLoading}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 size={16} />
                              <span>Approve & Authorize Payout</span>
                            </Button>
                            <Button
                              onClick={() => handleReviewClaim('reject')}
                              disabled={actionLoading}
                              variant="destructive"
                              className="font-bold text-xs h-9 rounded-xl shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <XCircle size={16} />
                              <span>Reject Claim</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <ShieldCheck size={36} className="mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm font-semibold text-foreground">Active Policy Coverage</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      No insurance claims have been submitted on this policy yet.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Image Zoom Modal using shadcn Dialog */}
      <Dialog open={Boolean(zoomImage)} onOpenChange={(open) => !open && setZoomImage(null)}>
        <DialogContent className="max-w-2xl p-2 bg-black/90 border-border/40 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Incident Evidence Zoom</DialogTitle>
          </DialogHeader>
          {zoomImage && (
            <div className="flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={zoomImage} alt="Zoomed Evidence" className="max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
