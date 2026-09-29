'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  BarChart3,
  Waves,
  ImageIcon,
} from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarRail,
} from '@/components/ui/sidebar';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/farmers', label: 'Farmer Ledger', icon: Users },
  { href: '/insurances', label: 'Insurances & Claims', icon: ShieldCheck },
  { href: '/analytics', label: 'Analytics & Trends', icon: BarChart3 },
  { href: '/images', label: 'Image Vault', icon: ImageIcon },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      {/* Brand Header */}
      <SidebarHeader className="h-16 shrink-0 border-b border-border flex flex-row items-center px-4 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#E23E57] to-[#311D3F] text-white shadow-sm">
            <Waves className="h-5 w-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden truncate">
            <span className="text-base font-bold tracking-tight text-foreground">AquaInsure</span>
            <span className="text-xs font-medium text-muted-foreground">Govt Scheme Admin</span>
          </div>
        </div>
      </SidebarHeader>

      {/* Sidebar Content Menu */}
      <SidebarContent className="p-2.5 group-data-[collapsible=icon]:p-0">
        <SidebarGroup className="p-0 group-data-[collapsible=icon]:p-0">
          <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2.5 group-data-[collapsible=icon]:hidden mb-1">
            Platform Modules
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5 group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:py-2.5 group-data-[collapsible=icon]:items-center">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href));

                return (
                  <SidebarMenuItem key={item.href} className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.label}
                      className={
                        isActive
                          ? 'bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90'
                          : 'hover:bg-secondary text-foreground font-medium'
                      }
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="text-sm">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer Info */}
      <SidebarFooter className="border-t border-border p-3 group-data-[collapsible=icon]:hidden">
        <div className="p-2.5 rounded-xl bg-secondary/40 border border-border text-[11px] space-y-1">
          <p className="font-bold text-foreground flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> AquaInsure Govt Portal
          </p>
          <p className="text-muted-foreground text-[10px]">Zero Premium Assistance Scheme</p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
