import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, User, CalendarDays, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
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

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2.5rem)] max-w-md">
      <nav
        className="bg-white border border-stone-100 rounded-[2rem] px-3 py-2.5"
        style={{ boxShadow: '0 8px 32px rgba(28,74,62,0.10), 0 2px 8px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center justify-between">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative flex flex-col items-center flex-1 py-1 transition-all duration-200 active:scale-95"
              >
                <div
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200',
                    isActive ? 'bg-teal-50' : 'hover:bg-stone-50'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-colors duration-200',
                      isActive ? 'text-teal-700' : 'text-stone-400'
                    )}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                  <span
                    className={cn(
                      'text-[9px] font-bold uppercase tracking-wider transition-colors duration-200',
                      isActive ? 'text-teal-700' : 'text-stone-400'
                    )}
                  >
                    {t(item.labelKey)}
                  </span>
                </div>

                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-teal-600"
                    style={{ boxShadow: '0 0 6px rgba(45,155,127,0.5)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default BottomNav;