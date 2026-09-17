'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronRightIcon,
  Waves,
  ShieldCheck,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/lib/formatters';
import { apiFetch } from '@/lib/api';
import type { Farmer, Pagination, ApiResponse } from '@/types';

export default function FarmersPage() {
  const router = useRouter();
  const [data, setData] = useState<Farmer[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, pages: 0 });
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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
      const json = await apiFetch<ApiResponse<Farmer[]>>(`/api/dashboard/farmers?${params}`);
      if (json.success) {
        setData(json.data);
        if (json.pagination) {
          setPagination(json.pagination);
        }
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

  const columns: ColumnDef<Farmer>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Farmer Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
              {row.original.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground group-hover:text-primary transition-colors">
                {row.original.name}
              </p>
              <p className="truncate text-xs text-muted-foreground font-mono">
                ID: {row.original._id.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        cell: ({ row }) => (
          <span className="font-mono text-sm text-foreground/90">
            {row.original.phone || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'address.district',
        header: 'District & State',
        cell: ({ row }) => (
          <div>
            <span className="text-sm font-medium text-foreground">
              {row.original.address?.district || '—'}
            </span>
            {row.original.address?.state && (
              <span className="text-xs text-muted-foreground block">
                {row.original.address.state}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'pondCount',
        header: 'Ponds',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-sm">
            <Waves className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-semibold">{row.original.pondCount ?? 0}</span>
          </div>
        ),
      },
      {
        accessorKey: 'insuranceCount',
        header: 'Policies',
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-semibold">{row.original.insuranceCount ?? 0}</span>
          </div>
        ),
      },
      {
        accessorKey: 'registration.regType',
        header: 'Registration',
        cell: ({ row }) => {
          const reg = row.original.registration?.regType;
          return reg ? (
            <Badge variant="secondary" className="uppercase text-[11px] font-semibold tracking-wider bg-accent/60">
              {reg}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground italic">None</span>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: () => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
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
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary hover:text-primary-foreground hover:bg-primary gap-1 transition-all"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/farmers/${row.original._id}`);
              }}
            >
              View Profile
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [sorting, router]
  );

  // eslint-disable-next-line react-hooks/incompatible-library
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
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or district…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          <div className="text-xs font-medium text-muted-foreground">
            {pagination.total} registered farmer{pagination.total !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>

      {/* ── Data Table ─────────────────────────────────────────────────────── */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="border-border/50 bg-muted/20 hover:bg-muted/20">
                    {hg.headers.map((header) => (
                      <TableHead key={header.id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i} className="border-border/30">
                      {columns.map((_, j) => (
                        <TableCell key={j} className="py-4">
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-40 text-center text-muted-foreground">
                      No farmers found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="group cursor-pointer border-border/30 transition-colors hover:bg-accent/40"
                      onClick={() => router.push(`/farmers/${row.original._id}`)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3.5">
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
          <div className="flex items-center justify-between border-t border-border/50 px-5 py-3.5 bg-card/30">
            <div className="text-xs text-muted-foreground font-medium">
              Showing page {pagination.page} of {pagination.pages || 1} ({pagination.total} total)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

