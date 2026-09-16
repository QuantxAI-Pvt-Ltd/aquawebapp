'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ApexChart from '@/components/charts/ApexChart';
import type { ApexOptions } from 'apexcharts';
import { CalendarDays, TrendingUp, Droplets, Users } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

const darkChart: ApexOptions = {
  chart: { background: 'transparent', toolbar: { show: true, tools: { download: true, zoom: true, pan: true, reset: true, selection: false } }, fontFamily: 'Inter, sans-serif' },
  theme: { mode: 'dark' },
  grid: { borderColor: 'rgba(255,255,255,0.06)', strokeDashArray: 4 },
  xaxis: { labels: { style: { colors: '#888', fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
  yaxis: { labels: { style: { colors: '#888', fontSize: '11px' } } },
  tooltip: { theme: 'dark' },
  dataLabels: { enabled: false },
};

type Period = '7' | '30' | '90' | '180';

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
          fetch(`${API}/api/dashboard/analytics/entries-over-time?days=${period}`).then(r => r.json()),
          fetch(`${API}/api/dashboard/analytics/water-quality?days=${period}`).then(r => r.json()),
          fetch(`${API}/api/dashboard/analytics/farmer-distribution`).then(r => r.json()),
          fetch(`${API}/api/dashboard/analytics/top-farmers?limit=10`).then(r => r.json()),
          fetch(`${API}/api/dashboard/analytics/insurance-status`).then(r => r.json()),
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

  // ─── Chart configs ────────────────────────────────────────────────────────
  const entryAreaOptions: ApexOptions = {
    ...darkChart,
    chart: { ...darkChart.chart, type: 'area', height: 350 },
    stroke: { curve: 'smooth', width: 2.5 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] } },
    colors: ['#818cf8'],
    xaxis: { ...darkChart.xaxis, categories: entriesOverTime.map(e => e.date.slice(5)) },
  };

  const waterLineOptions: ApexOptions = {
    ...darkChart,
    chart: { ...darkChart.chart, type: 'line', height: 350 },
    stroke: { curve: 'smooth', width: 2 },
    colors: ['#38bdf8', '#34d399', '#fbbf24', '#f87171'],
    xaxis: { ...darkChart.xaxis, categories: waterQuality.map(w => w.date.slice(5)) },
    legend: { position: 'top', horizontalAlign: 'right', labels: { colors: '#999' } },
  };

  const distBarOptions: ApexOptions = {
    ...darkChart,
    chart: { ...darkChart.chart, type: 'bar', height: 350 },
    plotOptions: { bar: { borderRadius: 6, horizontal: false, columnWidth: '55%' } },
    colors: ['#a78bfa'],
    xaxis: { ...darkChart.xaxis, categories: farmerDist.map(d => d.district?.length > 12 ? d.district.slice(0, 12) + '…' : d.district) },
  };

  const topFarmerBarOptions: ApexOptions = {
    ...darkChart,
    chart: { ...darkChart.chart, type: 'bar', height: 350 },
    plotOptions: { bar: { borderRadius: 6, horizontal: true, barHeight: '55%' } },
    colors: ['#2dd4bf'],
    xaxis: { ...darkChart.xaxis, categories: topFarmers.map(f => f.name?.length > 18 ? f.name.slice(0, 18) + '…' : f.name) },
  };

  const insDonutOptions: ApexOptions = {
    chart: { type: 'donut', background: 'transparent', fontFamily: 'Inter, sans-serif' },
    theme: { mode: 'dark' },
    colors: ['#34d399', '#fbbf24', '#f87171'],
    labels: insuranceStatus.map(s => s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : 'Unknown'),
    legend: { position: 'bottom', labels: { colors: '#999' } },
    stroke: { show: false },
    plotOptions: { pie: { donut: { size: '72%', labels: { show: true, total: { show: true, label: 'Policies', color: '#999', fontSize: '13px' } } } } },
    dataLabels: { enabled: false },
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Period Selector ────────────────────────────────────────────────── */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Time Period:</span>
          {(['7', '30', '90', '180'] as Period[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p)}
              className="min-w-[64px]"
            >
              {p}d
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* ── Entries Over Time ──────────────────────────────────────────────── */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendingUp className="h-4 w-4" /> Entry Submissions Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-[350px] w-full rounded-xl" /> : entriesOverTime.length > 0 ? (
            <ApexChart type="area" height={350} options={entryAreaOptions} series={[{ name: 'Entries', data: entriesOverTime.map(e => e.count) }]} />
          ) : <Empty />}
        </CardContent>
      </Card>

      {/* ── Two-Column Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Water Quality Trends */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Droplets className="h-4 w-4" /> Water Quality Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[350px] w-full rounded-xl" /> : waterQuality.length > 0 ? (
              <ApexChart
                type="line"
                height={350}
                options={waterLineOptions}
                series={[
                  { name: 'pH', data: waterQuality.map(w => w.ph ?? 0) },
                  { name: 'DO (mg/L)', data: waterQuality.map(w => w.dissolvedOxygen ?? 0) },
                  { name: 'Temp (°C)', data: waterQuality.map(w => w.temperature ?? 0) },
                  { name: 'Ammonia', data: waterQuality.map(w => w.ammonia ?? 0) },
                ]}
              />
            ) : <Empty />}
          </CardContent>
        </Card>

        {/* Farmer Distribution */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" /> Farmers by District
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[350px] w-full rounded-xl" /> : farmerDist.length > 0 ? (
              <ApexChart type="bar" height={350} options={distBarOptions} series={[{ name: 'Farmers', data: farmerDist.map(d => d.count) }]} />
            ) : <Empty />}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top Farmers */}
        <Card className="lg:col-span-2 border-border/50 bg-card/60 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Farmers by Daily Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[350px] w-full rounded-xl" /> : topFarmers.length > 0 ? (
              <ApexChart type="bar" height={350} options={topFarmerBarOptions} series={[{ name: 'Entries', data: topFarmers.map(f => f.entryCount) }]} />
            ) : <Empty />}
          </CardContent>
        </Card>

        {/* Insurance Donut */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Insurance Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[350px] w-full rounded-xl" /> : insuranceStatus.length > 0 ? (
              <ApexChart type="donut" height={350} options={insDonutOptions} series={insuranceStatus.map(s => s.count)} />
            ) : <Empty />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-[350px] items-center justify-center text-sm text-muted-foreground">
      No data available for this period
    </div>
  );
}
