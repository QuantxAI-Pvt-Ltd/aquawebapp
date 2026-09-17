'use client';

import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';
import { useSidebar } from './DashboardShell';

const pageTitles: Record<string, { title: string; description: string }> = {
  '/': { title: 'Overview', description: 'Key metrics and activity at a glance' },
  '/farmers': { title: 'Farmer Data', description: 'Browse, filter, and inspect farmer records' },
  '/insurances': { title: 'Insurances & Claims Ledger', description: 'Monitor policies, review claims, and process payouts' },
  '/images': { title: 'Image Inspection', description: 'Visual gallery of uploaded media' },
  '/analytics': { title: 'Analytics', description: 'Trends, insights, and aggregations' },
};

export default function Topbar() {
  const pathname = usePathname();
  const { setMobileOpen } = useSidebar();

  let page = pageTitles[pathname];
  if (!page) {
    if (pathname.startsWith('/farmers/')) {
      page = { title: 'Farmer Profile', description: 'Comprehensive farmer details, KYC documents, and farms' };
    } else {
      page = { title: 'Dashboard', description: '' };
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/85 px-4 md:px-6 backdrop-blur-xl transition-colors">
      {/* Mobile Hamburger Menu */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setMobileOpen(true)}
        className="md:hidden h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
        aria-label="Open mobile menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Page Title & Breadcrumb Subtext */}
      <div className="flex flex-col min-w-0">
        <h1 className="truncate text-sm md:text-base font-bold tracking-tight text-foreground">
          {page.title}
        </h1>
        {page.description && (
          <p className="hidden sm:block truncate text-xs text-muted-foreground">
            {page.description}
          </p>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        {/* Theme Switcher */}
        <ThemeToggle />

        <Separator orientation="vertical" className="mx-1 h-5 hidden sm:block" />

        {/* User Badge */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 text-xs font-bold text-white shadow-xs">
            A
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-semibold text-foreground leading-none">Admin</span>
            <span className="text-[10px] text-muted-foreground leading-none mt-0.5">Underwriting</span>
          </div>
        </div>
      </div>
    </header>
  );
}
