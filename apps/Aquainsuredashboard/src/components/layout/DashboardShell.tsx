'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from './Sidebar';
import Topbar from './Topbar';
import { Loader2 } from 'lucide-react';

/** Routes that are publicly accessible without admin authentication */
const PUBLIC_PATHS = ['/login'];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Allow public pages without auth check
    if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
      setIsAuthenticated(true);
      setAuthChecked(true);
      return;
    }

    // Check for a valid admin session token
    try {
      const session = JSON.parse(localStorage.getItem('admin-session') || '{}');
      if (session?.token) {
        setIsAuthenticated(true);
        setAuthChecked(true);
        return;
      }
    } catch {
      localStorage.removeItem('admin-session');
    }

    // No valid token — redirect to login
    router.replace('/login');
    setAuthChecked(true);
  }, [pathname, router]);

  // Show a full-screen spinner while the auth check resolves
  if (!authChecked) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Render the public page (e.g., /login) without sidebar chrome
  if (!isAuthenticated || PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return <>{children}</>;
  }

  // Render the protected dashboard layout
  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen w-full bg-background text-foreground overflow-x-hidden">
        <Topbar />
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

