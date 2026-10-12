'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from './ThemeToggle';
import { LogOut } from 'lucide-react';

const pageTitles: Record<string, { title: string; description: string }> = {
  '/': { title: 'Overview', description: 'Key metrics and activity at a glance' },
  '/farmers': { title: 'Farmer Ledger', description: 'Browse, filter, and inspect farmer records' },
  '/insurances': { title: 'Insurances & Claims Ledger', description: 'Monitor policies, review claims, and process payouts' },
  '/images': { title: 'Image Vault', description: 'Visual gallery of uploaded media and legal proofs' },
  '/analytics': { title: 'Analytics & Trends', description: 'Trends, insights, and aggregations' },
};

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [adminUsername, setAdminUsername] = useState('Admin');

  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem('admin-session') || '{}');
      if (session?.username) setAdminUsername(session.username);
    } catch {
      // ignore
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin-session');
    router.replace('/login');
  };

  let page = pageTitles[pathname];
  if (!page) {
    if (pathname.includes('/ponds/')) {
      page = { title: 'Pond Dossier & Telemetry', description: 'Real-time water metrics, biological specs, and telemetry history' };
    } else if (pathname.startsWith('/farmers/')) {
      page = { title: 'Farmer Profile', description: 'Comprehensive farmer details, KYC documents, and farms' };
    } else {
      page = { title: 'Dashboard', description: '' };
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card/85 px-4 md:px-6 backdrop-blur-xl transition-colors">
      {/* Official Shadcn Sidebar Toggle Trigger */}
      <SidebarTrigger className="h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer" />

      <Separator orientation="vertical" className="h-5 mx-1" />

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
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-900 text-xs font-bold text-white shadow-xs shadow-blue-500/20">
            {adminUsername.charAt(0).toUpperCase()}
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-semibold text-foreground leading-none capitalize">{adminUsername}</span>
            <span className="text-[10px] text-muted-foreground leading-none mt-0.5">Underwriting</span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          id="admin-logout-btn"
          onClick={handleLogout}
          title="Logout"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

