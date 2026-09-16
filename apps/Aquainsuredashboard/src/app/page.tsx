'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Landmark,
  Waves,
  ShieldCheck,
  ShieldOff,
  ClipboardList,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ApexChart from '@/components/charts/ApexChart';
import type { ApexOptions } from 'apexcharts';
import type { DashboardStats } from '@/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  gradient: string;
  loading?: boolean;
}

function StatCard({ title, value, icon, gradient, loading }: StatCardProps) {
  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/60 backdrop-blur-xl transition-all hover:border-border hover:shadow-lg hover:shadow-primary/5">
      <div
        className={`absolute inset-0 opacity-[0.03] transition-opacity group-hover:opacity-[0.06] ${gradient}`}
      />
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-16" />
          ) : (
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Chart theme defaults ─────────────────────────────────────────────────────
const darkChartTheme: ApexOptions = {
  chart: {
    background: 'transparent',
    toolbar: { show: false },
    fontFamily: 'Inter, sans-serif',
  },
  theme: { mode: 'dark' },
  grid: {
    borderColor: 'rgba(255,255,255,0.06)',
    strokeDashArray: 4,
  },
  xaxis: {
    labels: { style: { colors: '#888', fontSize: '11px' } },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: { style: { colors: '#888', fontSize: '11px' } },
  },
  tooltip: { theme: 'dark' },
  dataLabels: { enabled: false },
};

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
          fetch(`${API}/api/dashboard/stats`).then(r => r.json()),
          fetch(`${API}/api/dashboard/analytics/entries-over-time?days=30`).then(r => r.json()),
          fetch(`${API}/api/dashboard/analytics/insurance-status`).then(r => r.json()),
          fetch(`${API}/api/dashboard/analytics/top-farmers?limit=8`).then(r => r.json()),
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

  // ─── Chart configs ────────────────────────────────────────────────────────
  const areaChartOptions: ApexOptions = {
    ...darkChartTheme,
    chart: { ...darkChartTheme.chart, type: 'area', height: 320, sparkline: { enabled: false } },
    stroke: { curve: 'smooth', width: 2.5 },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] },
    },
    colors: ['#818cf8'],
    xaxis: {
      ...darkChartTheme.xaxis,
      categories: entriesOverTime.map(e => e.date.slice(5)), // MM-DD
    },
  };

  const donutOptions: ApexOptions = {
    chart: { type: 'donut', background: 'transparent', fontFamily: 'Inter, sans-serif' },
    theme: { mode: 'dark' },
    colors: ['#34d399', '#fbbf24', '#f87171'],
    labels: insuranceStatus.map(s => s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : 'Unknown'),
    legend: { position: 'bottom', labels: { colors: '#999' } },
    stroke: { show: false },
    plotOptions: {
      pie: {
        donut: { size: '72%', labels: { show: true, total: { show: true, label: 'Total', color: '#999', fontSize: '13px' } } },
      },
    },
    dataLabels: { enabled: false },
  };

  const barOptions: ApexOptions = {
    ...darkChartTheme,
    chart: { ...darkChartTheme.chart, type: 'bar', height: 320 },
    plotOptions: { bar: { borderRadius: 6, horizontal: true, barHeight: '60%' } },
    colors: ['#38bdf8'],
    xaxis: {
      ...darkChartTheme.xaxis,
      categories: topFarmers.map(f => f.name.length > 16 ? f.name.slice(0, 16) + '…' : f.name),
    },
  };

  const statCards = [
    { title: 'Total Farmers', value: stats?.totalFarmers ?? 0, icon: <Users className="h-5 w-5 text-white" />, gradient: 'from-blue-500 to-indigo-500' },
    { title: 'Total Farms', value: stats?.totalFarms ?? 0, icon: <Landmark className="h-5 w-5 text-white" />, gradient: 'from-emerald-500 to-teal-500' },
    { title: 'Active Ponds', value: stats?.totalPonds ?? 0, icon: <Waves className="h-5 w-5 text-white" />, gradient: 'from-cyan-500 to-blue-500' },
    { title: 'Active Insurance', value: stats?.activeInsurances ?? 0, icon: <ShieldCheck className="h-5 w-5 text-white" />, gradient: 'from-green-500 to-emerald-500' },
    { title: 'Expired Insurance', value: stats?.expiredInsurances ?? 0, icon: <ShieldOff className="h-5 w-5 text-white" />, gradient: 'from-amber-500 to-orange-500' },
    { title: 'Daily Entries', value: stats?.totalDailyEntries ?? 0, icon: <ClipboardList className="h-5 w-5 text-white" />, gradient: 'from-violet-500 to-purple-500' },
    { title: 'One-Time Entries', value: stats?.totalOneTimeEntries ?? 0, icon: <Activity className="h-5 w-5 text-white" />, gradient: 'from-pink-500 to-rose-500' },
    { title: 'Total Insurances', value: stats?.totalInsurances ?? 0, icon: <TrendingUp className="h-5 w-5 text-white" />, gradient: 'from-indigo-500 to-blue-500' },
  ];

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
        <Card className="lg:col-span-2 border-border/50 bg-card/60 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Daily Entries — Last 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[320px] w-full rounded-xl" />
            ) : entriesOverTime.length > 0 ? (
              <ApexChart
                type="area"
                height={320}
                options={areaChartOptions}
                series={[{ name: 'Entries', data: entriesOverTime.map(e => e.count) }]}
              />
            ) : (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                No entry data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Donut — Insurance Status */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Insurance Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[320px] w-full rounded-xl" />
            ) : insuranceStatus.length > 0 ? (
              <ApexChart
                type="donut"
                height={320}
                options={donutOptions}
                series={insuranceStatus.map(s => s.count)}
              />
            ) : (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                No insurance data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bar Chart — Top Farmers ────────────────────────────────────────── */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Top Farmers by Daily Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[320px] w-full rounded-xl" />
          ) : topFarmers.length > 0 ? (
            <ApexChart
              type="bar"
              height={320}
              options={barOptions}
              series={[{ name: 'Entries', data: topFarmers.map(f => f.entryCount) }]}
            />
          ) : (
            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
              No farmer data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
