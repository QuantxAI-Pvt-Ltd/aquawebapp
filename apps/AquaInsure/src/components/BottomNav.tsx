import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, User, CalendarDays, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, labelKey: 'dashboard.home', path: '/dashboard' },
  { icon: CalendarDays,    labelKey: 'dashboard.daily', path: '/entries/daily' },
  { icon: BarChart3,       labelKey: 'dashboard.reports', path: '/reports' },
  { icon: User,            labelKey: 'dashboard.farmer', path: '/settings' },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Hide BottomNav during onboarding until full profile registration is completed
  const regComplete = typeof window !== 'undefined' ? localStorage.getItem('aqua-reg-complete') : '1';
  if (regComplete !== '1') {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full sm:max-w-[440px] bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200/90 dark:border-stone-800 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <nav className="h-[56px] px-3 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-150 active:scale-95 touch-manipulation group"
            >
              <div className="flex flex-col items-center gap-1">
                <Icon
                  className={cn(
                    'w-5 h-5 transition-all duration-150',
                    isActive ? 'text-teal-700 scale-105' : 'text-stone-400 group-hover:text-stone-600'
                  )}
                  strokeWidth={isActive ? 2.3 : 1.7}
                />
                <span
                  className={cn(
                    'text-[10px] font-semibold tracking-tight transition-colors duration-150',
                    isActive ? 'text-teal-800 font-bold' : 'text-stone-400 group-hover:text-stone-600'
                  )}
                >
                  {t(item.labelKey)}
                </span>
              </div>

              {isActive && (
                <div
                  className="absolute top-0 w-8 h-[2px] rounded-full bg-teal-600"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;