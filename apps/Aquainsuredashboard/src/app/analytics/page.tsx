'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarDays, TrendingUp, Droplets, Users, ShieldCheck } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { ApiResponse } from '@/types';

type Period = '7' | '30' | '90' | '180';

// ─── Shadcn Chart Configurations ──────────────────────────────────────────────
const entriesConfig = {
  count: {
    label: 'Entries Logged',
    color: '#E23E57',
  },
} satisfies ChartConfig;

const waterQualityConfig = {
  ph: {
    label: 'pH Level',
    color: '#E23E57',
  },
  dissolvedOxygen: {
    label: 'DO (mg/L)',
    color: '#88304E',
  },
  temperature: {
    label: 'Temp (°C)',
    color: '#D97706',
  },
  ammonia: {
    label: 'Ammonia (ppm)',
    color: '#522546',
  },
} satisfies ChartConfig;

const districtConfig = {
  count: {
    label: 'Farmers Registered',
    color: '#88304E',
  },
} satisfies ChartConfig;

const topFarmersConfig = {
  entryCount: {
    label: 'Daily Telemetry Entries',
    color: '#E23E57',
  },
} satisfies ChartConfig;

const DONUT_PALETTE = ['#E23E57', '#88304E', '#522546', '#D97706', '#311D3F'];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30');
  const [loading, setLoading] = useState(true);

  // Data states
  const [entriesOverTime, setEntriesOverTime] = useState<{ date: string; count: number }[]>([]);
  const [waterQuality, setWaterQuality] = useState<{ date: string; ph: number | null; dissolvedOxygen: number | null; temperature: number | null; ammonia: number | null }[]>([]);
  const [farmerDist, setFarmerDist] = useState<{ district: string; count: number }[]>([]);
  const [topFarmers, setTopFarmers] = useState<{ name: string; entryCount: number }[]>([]);
  const [insuranceStatus, setInsuranceStatus] = useState<{ status: string; count: number }[]>([]);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [eRes, wRes, dRes, fRes, iRes] = await Promise.all([
          apiFetch<ApiResponse<{ date: string; count: number }[]>>(`/api/dashboard/analytics/entries-over-time?days=${period}`),
          apiFetch<ApiResponse<{ date: string; ph: number | null; dissolvedOxygen: number | null; temperature: number | null; ammonia: number | null }[]>>(`/api/dashboard/analytics/water-quality?days=${period}`),
          apiFetch<ApiResponse<{ district: string; count: number }[]>>('/api/dashboard/analytics/farmer-distribution'),
          apiFetch<ApiResponse<{ name: string; entryCount: number }[]>>('/api/dashboard/analytics/top-farmers?limit=10'),
          apiFetch<ApiResponse<{ status: string; count: number }[]>>('/api/dashboard/analytics/insurance-status'),
        ]);
        if (eRes.success) setEntriesOverTime(eRes.data);
        if (wRes.success) setWaterQuality(wRes.data);
        if (dRes.success) setFarmerDist(dRes.data);
        if (fRes.success) setTopFarmers(fRes.data);
        if (iRes.success) setInsuranceStatus(iRes.data);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [period]);

  // Formatted data arrays
  const formattedEntries = entriesOverTime.map((e) => ({
    date: e.date.slice(5),
    count: e.count,
  }));

  const formattedWater = waterQuality.map((w) => ({
    date: w.date.slice(5),
    ph: w.ph ?? 0,
    dissolvedOxygen: w.dissolvedOxygen ?? 0,
    temperature: w.temperature ?? 0,
    ammonia: w.ammonia ?? 0,
  }));

  const formattedDistrict = farmerDist.map((d) => ({
    district: d.district?.length > 12 ? d.district.slice(0, 12) + '…' : d.district,
    count: d.count,
  }));

  const formattedTopFarmers = topFarmers.map((f) => ({
    name: f.name?.length > 16 ? f.name.slice(0, 16) + '…' : f.name,
    entryCount: f.entryCount,
  }));

  const donutData = insuranceStatus.map((item, idx) => ({
    name: item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('_', ' ') : 'Unknown',
    value: item.count,
    fill: DONUT_PALETTE[idx % DONUT_PALETTE.length],
  }));

  const donutConfig = insuranceStatus.reduce((acc, curr, idx) => {
    const key = curr.status || `status_${idx}`;
    acc[key] = {
      label: curr.status ? curr.status.charAt(0).toUpperCase() + curr.status.slice(1) : 'Status',
      color: DONUT_PALETTE[idx % DONUT_PALETTE.length],
    };
    return acc;
  }, {} as ChartConfig);

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Period Selector ────────────────────────────────────────────────── */}
      <Card className="border-border/70 bg-card/80 backdrop-blur-xl rounded-2xl shadow-xs">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <CalendarDays className="h-4 w-4" />
            </div>
            <span>Analytics Time Window:</span>
          </div>
          <div className="flex items-center gap-1.5 bg-secondary/50 p-1 rounded-xl border border-border">
            {(['7', '30', '90', '180'] as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPeriod(p)}
                className={`h-7 px-3 text-xs font-semibold rounded-lg cursor-pointer ${
                  period === p ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p} Days
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Entries Over Time ──────────────────────────────────────────────── */}
      <Card className="border-border/70 bg-card/80 backdrop-blur-xl rounded-2xl shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" /> Daily Entry Submissions Over Time
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Telemetry ingestion patterns across registered aquaculture sites
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {loading ? (
            <Skeleton className="h-[300px] w-full rounded-xl" />
          ) : formattedEntries.length > 0 ? (
            <ChartContainer config={entriesConfig} className="h-[300px] w-full">
              <AreaChart data={formattedEntries} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="analyticsEntriesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E23E57" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#E23E57" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} className="text-[11px] font-mono fill-muted-foreground" />
                <YAxis width={40} tickLine={false} axisLine={false} tickMargin={8} className="text-[11px] font-mono fill-muted-foreground" allowDecimals={false} />
                <ChartTooltip cursor={{ stroke: '#E23E57', strokeWidth: 1, strokeDasharray: '2 2' }} content={<ChartTooltipContent indicator="line" />} />
                <Area type="monotone" dataKey="count" stroke="#E23E57" strokeWidth={2.5} fillOpacity={1} fill="url(#analyticsEntriesGrad)" />
              </AreaChart>
            </ChartContainer>
          ) : (
            <Empty />
          )}
        </CardContent>
      </Card>

      {/* ── Two-Column Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Water Quality Trends */}
        <Card className="border-border/70 bg-card/80 backdrop-blur-xl rounded-2xl shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Droplets className="h-4 w-4 text-primary" /> Water Quality Parameter Averages
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Comparative pH, Dissolved Oxygen, Temperature, and Ammonia metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : formattedWater.length > 0 ? (
              <ChartContainer config={waterQualityConfig} className="h-[300px] w-full">
                <LineChart data={formattedWater} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} className="text-[11px] font-mono fill-muted-foreground" />
                  <YAxis width={40} tickLine={false} axisLine={false} tickMargin={8} className="text-[11px] font-mono fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="ph" stroke="#E23E57" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="dissolvedOxygen" stroke="#88304E" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="temperature" stroke="#D97706" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="ammonia" stroke="#522546" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>

        {/* Farmer Distribution */}
        <Card className="border-border/70 bg-card/80 backdrop-blur-xl rounded-2xl shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Users className="h-4 w-4 text-primary" /> Farmer Distribution by District
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Geographical distribution of registered aquaculture producers
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : formattedDistrict.length > 0 ? (
              <ChartContainer config={districtConfig} className="h-[300px] w-full">
                <BarChart data={formattedDistrict} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                  <XAxis dataKey="district" tickLine={false} axisLine={false} tickMargin={8} className="text-[11px] font-mono fill-muted-foreground" />
                  <YAxis width={40} tickLine={false} axisLine={false} tickMargin={8} className="text-[11px] font-mono fill-muted-foreground" allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#88304E" radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ChartContainer>
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top Farmers */}
        <Card className="lg:col-span-2 border-border/70 bg-card/80 backdrop-blur-xl rounded-2xl shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-foreground">
              Top Farmers by Activity Rank
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Volume of photographic updates, pond parameters, and feeding schedules
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : formattedTopFarmers.length > 0 ? (
              <ChartContainer config={topFarmersConfig} className="h-[300px] w-full">
                <BarChart data={formattedTopFarmers} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis type="number" tickLine={false} axisLine={false} className="text-[11px] font-mono fill-muted-foreground" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={10} className="text-[12px] font-medium fill-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="entryCount" fill="#E23E57" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ChartContainer>
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>

        {/* Insurance Donut */}
        <Card className="border-border/70 bg-card/80 backdrop-blur-xl rounded-2xl shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" /> Insurance Breakdown
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Policy ratio by claim status
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-xl" />
            ) : donutData.length > 0 ? (
              <ChartContainer config={donutConfig} className="h-[300px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={65}
                    outerRadius={95}
                    stroke="var(--card)"
                    strokeWidth={3}
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
      No telemetry data recorded for this window
    </div>
  );
}
