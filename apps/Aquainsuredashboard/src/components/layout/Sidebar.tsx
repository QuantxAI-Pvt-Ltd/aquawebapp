'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Image,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Waves,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/farmers', label: 'Farmer Data', icon: Users },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-card transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400">
          <Waves className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-semibold tracking-tight">
              AquaInsure
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              Dashboard
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          const linkContent = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'h-[18px] w-[18px] shrink-0 transition-colors',
                  isActive
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground group-hover:text-accent-foreground'
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-border p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-2 text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
