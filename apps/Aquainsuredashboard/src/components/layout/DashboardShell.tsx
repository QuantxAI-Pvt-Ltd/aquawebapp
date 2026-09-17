'use client';

import React, { createContext, useContext, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useIsMounted } from '@/hooks/useIsMounted';

interface SidebarContextType {
  collapsed: boolean;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  toggleCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dashboard_sidebar_collapsed') === 'true';
    }
    return false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const mounted = useIsMounted();

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('dashboard_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        toggleCollapsed,
        mobileOpen,
        setMobileOpen,
      }}
    >
      <div className="relative min-h-screen w-full bg-background text-foreground flex">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Mobile Sidebar Sheet */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[260px] p-0 border-r border-border bg-card">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <Sidebar isMobile onMobileNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Main Content Area — dynamically resizing with sidebar */}
        <div
          className={cn(
            'flex min-h-screen w-full flex-1 flex-col transition-[margin-left] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
            mounted && (collapsed ? 'md:ml-[68px]' : 'md:ml-[240px]'),
            !mounted && 'md:ml-[240px]',
            'ml-0'
          )}
        >
          <Topbar />
          <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
