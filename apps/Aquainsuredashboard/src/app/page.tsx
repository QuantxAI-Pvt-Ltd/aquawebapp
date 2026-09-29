'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Landmark,
  Waves,
  ShieldCheck,
  ClipboardList,
  TrendingUp,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardStats } from '@/types';
import { apiFetch } from '@/lib/api';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  href?: string;
}

function StatCard({ title, value, icon: Icon, loading, href }: StatCardProps) {
  const cardContent = (
    <Card className="group relative overflow-hidden border-border/70 bg-card/80 backdrop-blur-xl transition-all duration-200 hover:border-primary/40 hover:shadow-sm rounded-2xl cursor-pointer">
      <CardContent className="flex items-center justify-between p-5">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-16 rounded-md" />
          ) : (
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
          )}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 transition-transform group-hover:scale-105">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{cardContent}</Link> : cardContent;
}

// ─── Shadcn Chart Configurations ──────────────────────────────────────────────
const areaChartConfig = {
  count: {
    label: 'Daily Entries',
    color: '#E23E57',
  },
} satisfies ChartConfig;

const barChartConfig = {
  entryCount: {
    label: 'Entries Logged',
    color: '#88304E',
  },
} satisfies ChartConfig;

const DONUT_PALETTE = ['#E23E57', '#88304E', '#522546', '#D97706', '#311D3F'];

export default function OverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [entriesOverTime, setEntriesOverTime] = useState<{ date: string; count: number }[]>([]);
  const [insuranceStatus, setInsuranceStatus] = useState<{ status: string; count: number }[]>([]);
  const [topFarmers, setTopFarmers] = useState<{ name: string; entryCount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, entriesRes, insRes, farmersRes] = await Promise.all([
          apiFetch<{ success: boolean; data: DashboardStats }>('/api/dashboard/stats'),
          apiFetch<{ success: boolean; data: { date: string; count: number }[] }>('/api/dashboard/analytics/entries-over-time?days=30'),
          apiFetch<{ success: boolean; data: { status: string; count: number }[] }>('/api/dashboard/analytics/insurance-status'),
          apiFetch<{ success: boolean; data: { name: string; entryCount: number }[] }>('/api/dashboard/analytics/top-farmers?limit=8'),
        ]);
        if (statsRes.success) setStats(statsRes.data);
        if (entriesRes.success) setEntriesOverTime(entriesRes.data);
        if (insRes.success) setInsuranceStatus(insRes.data);
        if (farmersRes.success) setTopFarmers(farmersRes.data);
      } catch (err) {
        console.error('Failed to fetch overview data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const statCards: StatCardProps[] = [
    { title: 'Total Farmers', value: stats?.totalFarmers ?? 0, icon: Users, href: '/farmers' },
    { title: 'Total Farms', value: stats?.totalFarms ?? 0, icon: Landmark, href: '/farmers' },
    { title: 'Active Ponds', value: stats?.totalPonds ?? 0, icon: Waves, href: '/farmers' },
    { title: 'Active Coverage', value: stats?.activeInsurances ?? 0, icon: ShieldCheck, href: '/insurances' },
    { title: 'Pending Claims', value: stats?.pendingClaims ?? 0, icon: ShieldAlert, href: '/insurances' },
    { title: 'Settled Claims', value: stats?.claimedInsurances ?? 0, icon: TrendingUp, href: '/insurances' },
    { title: 'Daily Entries', value: stats?.totalDailyEntries ?? 0, icon: ClipboardList },
    { title: 'One-Time Entries', value: stats?.totalOneTimeEntries ?? 0, icon: Activity },
  ];

  // Format entries for Area Chart
  const formattedEntries = entriesOverTime.map((e) => ({
    date: e.date.slice(5),
    count: e.count,
  }));

  // Format donut status
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

  // Format top farmers for Horizontal Bar
  const formattedFarmers = topFarmers.map((f) => ({
    name: f.name.length > 14 ? f.name.slice(0, 14) + '…' : f.name,
    entryCount: f.entryCount,
  }));

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} loading={loading} />
        ))}
      </div>

      {/* ── Charts Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Area Chart — Entries over time */}
        <Card className="lg:col-span-2 border-border/70 bg-card/80 backdrop-blur-xl rounded-2xl shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-foreground">
              Daily Entries Activity
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Submission frequency recorded across all active ponds over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {loading ? (
              <Skeleton className="h-[280px] w-full rounded-xl" />
            ) : formattedEntries.length > 0 ? (
              <ChartContainer config={areaChartConfig} className="h-[280px] w-full">
                <AreaChart
                  data={formattedEntries}
                  margin={{ top: 10, right: 15, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="entriesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E23E57" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#E23E57" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-[11px] font-mono fill-muted-foreground"
                  />
                  <YAxis
                    width={40}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-[11px] font-mono fill-muted-foreground"
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    cursor={{ stroke: '#E23E57', strokeWidth: 1, strokeDasharray: '2 2' }}
                    content={<ChartTooltipContent indicator="line" />}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#E23E57"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#entriesGradient)"
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No entry data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Donut — Insurance Status */}
        <Card className="border-border/70 bg-card/80 backdrop-blur-xl rounded-2xl shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-foreground">
              Insurance Policy Status
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Distribution of active, claimed, and pending scheme policies
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {loading ? (
              <Skeleton className="h-[280px] w-full rounded-xl" />
            ) : donutData.length > 0 ? (
              <ChartContainer config={donutConfig} className="h-[280px] w-full">
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
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No insurance data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bar Chart — Top Farmers ────────────────────────────────────────── */}
      <Card className="border-border/70 bg-card/80 backdrop-blur-xl rounded-2xl shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-foreground">
            Top Farmers by Daily Log Volume
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Farmers with the highest regularity of photographic, feeding, and water quality telemetry
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          {loading ? (
            <Skeleton className="h-[280px] w-full rounded-xl" />
          ) : formattedFarmers.length > 0 ? (
            <ChartContainer config={barChartConfig} className="h-[280px] w-full">
              <BarChart
                data={formattedFarmers}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  className="text-[11px] font-mono fill-muted-foreground"
                  allowDecimals={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  className="text-[12px] font-medium fill-foreground"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="entryCount"
                  fill="#88304E"
                  radius={[0, 6, 6, 0]}
                  barSize={20}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              No farmer data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
