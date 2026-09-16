'use client';

import { usePathname } from 'next/navigation';
import { Separator } from '@/components/ui/separator';

const pageTitles: Record<string, { title: string; description: string }> = {
  '/': { title: 'Overview', description: 'Key metrics and activity at a glance' },
  '/farmers': { title: 'Farmer Data', description: 'Browse, filter, and inspect farmer records' },
  '/images': { title: 'Image Inspection', description: 'Visual gallery of uploaded media' },
  '/analytics': { title: 'Analytics', description: 'Trends, insights, and aggregations' },
};

export default function Topbar() {
  const pathname = usePathname();
  const page = pageTitles[pathname] || { title: 'Dashboard', description: '' };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/80 px-6 backdrop-blur-xl">
      <div className="flex flex-col">
        <h1 className="text-base font-semibold tracking-tight">{page.title}</h1>
        <p className="text-xs text-muted-foreground">{page.description}</p>
      </div>
      <Separator orientation="vertical" className="mx-2 h-6" />
      <div className="ml-auto flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-xs font-bold text-white">
          A
        </div>
      </div>
    </header>
  );
}
