'use client';

import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from './Sidebar';
import Topbar from './Topbar';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
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
