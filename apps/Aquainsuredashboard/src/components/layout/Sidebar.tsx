'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  BarChart3,
  ChevronLeft,
  Waves,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSidebar } from './DashboardShell';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/farmers', label: 'Farmer Data', icon: Users },
  { href: '/insurances', label: 'Insurances & Claims', icon: ShieldCheck },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

interface SidebarProps {
  isMobile?: boolean;
  onMobileNavigate?: () => void;
}

export default function Sidebar({ isMobile = false, onMobileNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed } = useSidebar();

  const isActuallyCollapsed = !isMobile && collapsed;

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-card overflow-hidden select-none',
        'transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
        isMobile
          ? 'h-full w-full'
          : cn(
              'fixed left-0 top-0 z-40 h-screen',
              isActuallyCollapsed ? 'w-[68px]' : 'w-[240px]'
            )
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center border-b border-border px-3.5 overflow-hidden">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-400 text-white shadow-sm shadow-teal-500/20">
          <Waves className="h-5 w-5" />
        </div>
        <div
          className={cn(
            'flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ml-3',
            isActuallyCollapsed
              ? 'max-w-0 opacity-0 -translate-x-2 pointer-events-none'
              : 'max-w-[160px] opacity-100 translate-x-0'
          )}
        >
          <span className="text-sm font-bold tracking-tight text-foreground truncate">
            AquaInsure
          </span>
          <span className="text-[11px] font-medium text-muted-foreground truncate">
            Platform Admin
          </span>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col gap-1.5 p-3 overflow-y-auto overflow-x-hidden w-full">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          const navLink = (
            <Link
              href={item.href}
              onClick={() => {
                if (isMobile && onMobileNavigate) {
                  onMobileNavigate();
                }
              }}
              className={cn(
                'group relative flex items-center h-10 w-full rounded-xl px-0.5 text-sm font-medium transition-colors duration-150 select-none overflow-hidden cursor-pointer',
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground'
              )}
            >
              {/* Rigid Icon Box: Center is always at X=34px from sidebar edge */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                <item.icon
                  className={cn(
                    'h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-105',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                  )}
                />
              </div>

              {/* Sliding Text Label */}
              <div
                className={cn(
                  'overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center pr-2',
                  isActuallyCollapsed
                    ? 'max-w-0 opacity-0 -translate-x-2 pointer-events-none'
                    : 'max-w-[160px] opacity-100 translate-x-0 ml-1.5'
                )}
              >
                <span className="truncate">{item.label}</span>
              </div>
            </Link>
          );

          if (isActuallyCollapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger render={navLink} />
                <TooltipContent
                  side="right"
                  sideOffset={10}
                  className="font-medium text-xs py-1.5 px-2.5 shadow-md bg-foreground text-background"
                >
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.href}>{navLink}</div>;
        })}
      </nav>

      {/* Collapse Toggle Button (Desktop only) */}
      {!isMobile && (
        <div className="border-t border-border p-3 shrink-0">
          {(() => {
            const toggleButton = (
              <button
                type="button"
                onClick={toggleCollapsed}
                className="group relative flex items-center h-10 w-full rounded-xl px-0.5 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent/80 hover:text-foreground select-none overflow-hidden cursor-pointer"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {/* Rigid Icon Box with rotating chevron */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                  <ChevronLeft
                    className={cn(
                      'h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] text-muted-foreground group-hover:text-foreground',
                      isActuallyCollapsed && 'rotate-180'
                    )}
                  />
                </div>

                {/* Sliding Text Label */}
                <div
                  className={cn(
                    'overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center pr-2',
                    isActuallyCollapsed
                      ? 'max-w-0 opacity-0 -translate-x-2 pointer-events-none'
                      : 'max-w-[160px] opacity-100 translate-x-0 ml-1.5'
                  )}
                >
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                    Collapse sidebar
                  </span>
                </div>
              </button>
            );

            if (isActuallyCollapsed) {
              return (
                <Tooltip>
                  <TooltipTrigger render={toggleButton} />
                  <TooltipContent
                    side="right"
                    sideOffset={10}
                    className="font-medium text-xs py-1.5 px-2.5 shadow-md bg-foreground text-background"
                  >
                    Expand sidebar
                  </TooltipContent>
                </Tooltip>
              );
            }

            return toggleButton;
          })()}
        </div>
      )}
    </aside>
  );
}

