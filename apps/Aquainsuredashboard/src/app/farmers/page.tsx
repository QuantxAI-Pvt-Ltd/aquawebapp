'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  Phone,
  CreditCard,
  User,
  Waves,
  ClipboardList,
  Activity,
  Image as ImageIcon
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/lib/formatters';
import type { Farmer, Pagination } from '@/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export default function FarmersPage() {
  const [data, setData] = useState<Farmer[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, pages: 0 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [farmerDetail, setFarmerDetail] = useState<any>(null);

  const debouncedSearch = useDebounce(search, 300);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const sortBy = sorting[0]?.id || 'createdAt';
      const sortOrder = sorting[0]?.desc ? 'desc' : 'asc';
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        search: debouncedSearch,
        sortBy,
        sortOrder,
      });
      const res = await fetch(`${API}/api/dashboard/farmers?${params}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setPagination(json.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch farmers:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch, sorting]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedSearch]);

  const openDetail = async (farmer: Farmer) => {
    setSelectedFarmer(farmer);
    setDetailLoading(true);
    try {
      const res = await fetch(`${API}/api/dashboard/farmers/${farmer._id}`);
      const json = await res.json();
      if (json.success) setFarmerDetail(json.data);
    } catch (err) {
      console.error('Failed to fetch farmer detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: ColumnDef<Farmer>[] = useMemo(
    () => [
      {
        accessorKey: '_id',
        header: 'Farmer ID',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original._id.slice(-8)}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-xs font-bold text-white">
              {row.original.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <span className="font-medium">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        cell: ({ row }) => <span className="text-sm">{row.original.phone}</span>,
      },
      {
        accessorKey: 'address.district',
        header: 'District',
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-normal">
            {row.original.address?.district || '—'}
          </Badge>
        ),
      },
      {
        accessorKey: 'pondCount',
        header: 'Ponds',
        cell: ({ row }) => <span className="text-sm">{row.original.pondCount ?? 0}</span>,
      },
      {
        accessorKey: 'insuranceCount',
        header: 'Insurances',
        cell: ({ row }) => <span className="text-sm">{row.original.insuranceCount ?? 0}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => {
              const isDesc = sorting[0]?.id === 'createdAt' && sorting[0]?.desc;
              setSorting([{ id: 'createdAt', desc: !isDesc }]);
            }}
          >
            Registered
            <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [sorting]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Filter Bar ─────────────────────────────────────────────────────── */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or district…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {pagination.total} farmer{pagination.total !== 1 ? 's' : ''} found
          </div>
        </CardContent>
      </Card>

      {/* ── Data Table ─────────────────────────────────────────────────────── */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="border-border/50 hover:bg-transparent">
                    {hg.headers.map((header) => (
                      <TableHead key={header.id} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {columns.map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                      No farmers found
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer border-border/30 transition-colors hover:bg-accent/50"
                      onClick={() => openDetail(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── Pagination ──────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
            <div className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.pages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Farmer Detail Modal ────────────────────────────────────────────── */}
      <Dialog open={!!selectedFarmer} onOpenChange={() => { setSelectedFarmer(null); setFarmerDetail(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-sm font-bold text-white">
                {selectedFarmer?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              {selectedFarmer?.name}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : farmerDetail ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <InfoRow icon={<User className="h-4 w-4" />} label="Father's Name" value={farmerDetail.fatherName} />
                <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={farmerDetail.phone} />
                <InfoRow icon={<Calendar className="h-4 w-4" />} label="DOB" value={farmerDetail.dob || '—'} />
                <InfoRow icon={<User className="h-4 w-4" />} label="Gender" value={farmerDetail.gender || '—'} />
              </div>

              {/* Address */}
              {farmerDetail.address && (
                <Section title="Address" icon={<MapPin className="h-4 w-4" />}>
                  <p className="text-sm">
                    {[farmerDetail.address.village, farmerDetail.address.taluk, farmerDetail.address.district, farmerDetail.address.state].filter(Boolean).join(', ')}
                    {farmerDetail.address.pinCode ? ` — ${farmerDetail.address.pinCode}` : ''}
                  </p>
                </Section>
              )}

              {/* Bank Details */}
              {farmerDetail.bankDetails?.bankName && (
                <Section title="Bank Details" icon={<CreditCard className="h-4 w-4" />}>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <InfoRow label="Bank" value={farmerDetail.bankDetails.bankName} />
                    <InfoRow label="Branch" value={farmerDetail.bankDetails.branch} />
                    <InfoRow label="A/C No" value={farmerDetail.bankDetails.accountNumber} />
                    <InfoRow label="IFSC" value={farmerDetail.bankDetails.ifscCode} />
                  </div>
                </Section>
              )}

              {/* Farms & Ponds (Nested) */}
              {farmerDetail.farms?.length > 0 && (
                <Section title={`Farms & Ponds`} icon={<MapPin className="h-4 w-4" />}>
                  <div className="space-y-4">
                    {farmerDetail.farms.map((farm: any) => {
                      const farmPonds = farmerDetail.ponds?.filter((p: any) => p.farmId === farm._id) || [];
                      return (
                        <div key={farm._id} className="rounded-lg border border-border/50 bg-background/50 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-semibold">{farm.location?.place}, {farm.location?.district}</p>
                              <p className="text-xs text-muted-foreground">{farm.ownership?.type} • {farm.totalPonds} ponds total</p>
                            </div>
                          </div>
                          
                          {farmPonds.length > 0 ? (
                            <div className="space-y-3 mt-4 border-t border-border/50 pt-4">
                              {farmPonds.map((pond: any) => (
                                <PondSection key={pond._id} pond={pond} />
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No active ponds found for this farm.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Insurances */}
              {farmerDetail.insurances?.length > 0 && (
                <Section title={`Insurances (${farmerDetail.insurances.length})`} icon={<Activity className="h-4 w-4" />}>
                  <div className="space-y-2">
                    {farmerDetail.insurances.map((ins: any) => (
                      <div key={ins._id} className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-3 text-sm">
                        <div>
                          <span className="capitalize">{ins.species}</span>
                          <span className="mx-2 text-muted-foreground">•</span>
                          <span className="capitalize">{ins.insuranceType}</span>
                        </div>
                        <Badge
                          variant={ins.status === 'active' ? 'default' : ins.status === 'expired' ? 'secondary' : 'destructive'}
                        >
                          {ins.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-Components for Nested Data ──────────────────────────────────────

function PondSection({ pond }: { pond: any }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<{ daily: any[], oneTime: any[] } | null>(null);

  const fetchEntries = async () => {
    if (entries) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/dashboard/ponds/${pond._id}/entries`);
      const json = await res.json();
      if (json.success) {
        setEntries({ daily: json.data.dailyEntries, oneTime: json.data.oneTimeEntries });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!expanded) fetchEntries();
    setExpanded(!expanded);
  };

  return (
    <div className="rounded-lg border border-border/30 bg-card overflow-hidden">
      <div 
        className="flex cursor-pointer items-center justify-between p-3 hover:bg-accent/30 transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2">
          <Waves className="h-4 w-4 text-blue-400" />
          <span className="font-medium text-sm">Pond {pond.pondNumber}: {pond.name}</span>
          {pond.dimensionAcres && <span className="text-xs text-muted-foreground">({pond.dimensionAcres} acres)</span>}
        </div>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </div>

      {expanded && (
        <div className="p-3 border-t border-border/30 bg-background/30 space-y-4">
          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : entries ? (
            <>
              {/* Daily Entries */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5" /> Daily Entries ({entries.daily.length})
                </h4>
                {entries.daily.length > 0 ? (
                  <div className="space-y-2">
                    {entries.daily.map(entry => (
                      <EntryDetailSection key={entry._id} entryId={entry._id} summary={`Day ${entry.dayNumber} — ${formatDate(entry.date)}`} type="daily" />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground pl-5">No daily entries found.</p>
                )}
              </div>

              {/* One-Time Entries */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" /> One-Time Entries ({entries.oneTime.length})
                </h4>
                {entries.oneTime.length > 0 ? (
                  <div className="space-y-2">
                    {entries.oneTime.map(entry => (
                      <div key={entry._id} className="rounded border border-border/20 p-2 text-xs">
                        {formatDate(entry.createdAt)} — Stage: {entry.stage || 'N/A'}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground pl-5">No one-time entries found.</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-red-400">Failed to load entries.</p>
          )}
        </div>
      )}
    </div>
  );
}

function EntryDetailSection({ entryId, summary, type }: { entryId: string, summary: string, type: 'daily' | 'oneTime' }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullEntry, setFullEntry] = useState<any>(null);

  const fetchFullEntry = async () => {
    if (fullEntry) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/dashboard/entries/${entryId}`);
      const json = await res.json();
      if (json.success) setFullEntry(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!expanded) fetchFullEntry();
    setExpanded(!expanded);
  };

  const renderMedia = (label: string, dataUrl?: string) => {
    if (!dataUrl) return null;
    
    // Simple check if it's a video/pdf/image based on data URL prefix
    const isVideo = dataUrl.startsWith('data:video');
    const isPdf = dataUrl.startsWith('data:application/pdf');

    return (
      <div className="mt-2 space-y-1.5">
        <span className="text-[10px] font-medium uppercase text-muted-foreground">{label}</span>
        <div className="rounded-md border border-border/50 overflow-hidden bg-black/20 flex justify-center max-w-sm">
          {isVideo ? (
            <video src={dataUrl} controls className="w-full max-h-48 object-contain" />
          ) : isPdf ? (
            <iframe src={dataUrl} className="w-full h-48" title={label} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt={label} className="w-full max-h-48 object-contain" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded border border-border/30 bg-card/50">
      <div 
        className="flex cursor-pointer items-center justify-between p-2 hover:bg-accent/20 transition-colors"
        onClick={handleToggle}
      >
        <span className="text-xs font-medium">{summary}</span>
        <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </div>

      {expanded && (
        <div className="p-3 border-t border-border/20 text-xs space-y-3">
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : fullEntry ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Data Summary */}
              <div className="space-y-2">
                {fullEntry.waterQuality && (
                  <div>
                    <span className="text-[10px] font-medium uppercase text-muted-foreground block mb-0.5">Water Quality</span>
                    <div className="grid grid-cols-2 gap-1 bg-background/50 p-2 rounded">
                      <span>pH: {fullEntry.waterQuality.ph || '-'}</span>
                      <span>DO: {fullEntry.waterQuality.do || '-'}</span>
                      <span>Temp: {fullEntry.waterQuality.temperature || '-'}</span>
                      <span>Ammonia: {fullEntry.waterQuality.ammonia || '-'}</span>
                    </div>
                  </div>
                )}
                {fullEntry.shrimpHealth && (
                  <div>
                    <span className="text-[10px] font-medium uppercase text-muted-foreground block mb-0.5">Shrimp Health</span>
                    <div className="bg-background/50 p-2 rounded">
                      Status: <Badge variant={fullEntry.shrimpHealth.status === 'normal' ? 'default' : 'destructive'} className="text-[10px] py-0">{fullEntry.shrimpHealth.status}</Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* Photos & Media (All within the entry!) */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold border-b border-border/30 pb-1">
                  <ImageIcon className="h-3.5 w-3.5" /> Media & Attachments
                </div>
                {renderMedia('Sampling Video', fullEntry.sampling?.samplingVideo)}
                {renderMedia('Feed Bills', fullEntry.feedManagement?.feedBills)}
                {renderMedia('Misc Bills', fullEntry.financials?.miscBills)}
                {renderMedia('Electricity Bills', fullEntry.financials?.electricityBills)}
                {renderMedia('Water Report', fullEntry.waterQuality?.waterReport)}
                {renderMedia('Shrimp Photo', fullEntry.shrimpHealth?.shrimpPhoto)}
                {renderMedia('Lab Report', fullEntry.shrimpHealth?.labReport)}
                
                {/* Fallback if no media */}
                {!fullEntry.sampling?.samplingVideo && 
                 !fullEntry.feedManagement?.feedBills &&
                 !fullEntry.financials?.miscBills &&
                 !fullEntry.financials?.electricityBills &&
                 !fullEntry.waterQuality?.waterReport &&
                 !fullEntry.shrimpHealth?.shrimpPhoto &&
                 !fullEntry.shrimpHealth?.labReport && (
                   <p className="text-muted-foreground italic text-[10px]">No attachments uploaded.</p>
                 )}
              </div>
            </div>
          ) : (
            <p className="text-red-400">Failed to load entry details.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Generic Layout Helpers ──────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm">{value || '—'}</p>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {title}
      </h3>
      {children}
    </div>
  );
}
