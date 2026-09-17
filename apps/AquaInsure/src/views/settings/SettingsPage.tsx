import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ChevronLeft, Globe, User, LogOut, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const logout = () => {
    // Clear session and all registration state so the next login starts fresh
    localStorage.removeItem('shrimpguard-user');
    localStorage.removeItem('aqua-session');
    localStorage.removeItem('aqua-farm');
    localStorage.removeItem('aqua-reg-complete');
    toast.success('Logged out');
    navigate('/login', { replace: true });
  };

  const items = [
    {
      icon: Globe,
      label: t('settings.changeLanguage'),
      action: () => navigate('/language'),
      destructive: false,
      iconBg: 'bg-teal-50 border-teal-100',
      iconColor: 'text-teal-600',
    },
    {
      icon: User,
      label: t('settings.editProfile'),
      action: () => navigate('/farmer-registration'),
      destructive: false,
      iconBg: 'bg-amber-50 border-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      icon: LogOut,
      label: t('settings.logout'),
      action: logout,
      destructive: true,
      iconBg: 'bg-red-50 border-red-100',
      iconColor: 'text-red-500',
    },
  ];

  return (
    <div
      className="min-h-screen bg-stone-50 pb-32 overflow-hidden"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');`}</style>

      {/* HEADER */}
      <div
        className="px-5 pt-8 pb-7 rounded-b-[2.5rem] relative overflow-hidden"
        style={{
          background: 'linear-gradient(140deg, #1c4a3e 0%, #1c6b5a 45%, #2d9b7f 100%)',
          boxShadow: '0 8px 32px -6px rgba(28,74,62,0.28)',
        }}
      >
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 opacity-10"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }}
        />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-white tracking-tight">
              {t('settings.title')}
            </h1>
          </div>
          <span className="text-[10px] font-bold text-white/85 px-2.5 py-1 bg-white/12 rounded-lg border border-white/15">
            Aqua <span className="text-amber-300">AI</span>nsure
          </span>
        </div>
      </div>

      {/* SETTINGS LIST */}
      <div className="px-4 mt-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm"
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={item.action}
              className={`w-full flex items-center gap-3.5 px-4 py-4 transition-colors active:bg-stone-50
                ${idx < items.length - 1 ? 'border-b border-stone-100' : ''}
                ${item.destructive ? 'hover:bg-red-50/60' : 'hover:bg-stone-50'}
              `}
            >
              {/* Icon tile */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${item.iconBg}`}
              >
                <item.icon size={16} className={item.iconColor} />
              </div>

              {/* Label */}
              <span
                className={`flex-1 text-left text-sm font-semibold ${
                  item.destructive ? 'text-red-500' : 'text-stone-700'
                }`}
              >
                {item.label}
              </span>

              {/* Chevron */}
              <ChevronRight
                size={15}
                className={item.destructive ? 'text-red-300' : 'text-stone-300'}
              />
            </button>
          ))}
        </motion.div>

        {/* App version / copyright */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-center text-[9px] font-medium mt-6 tracking-wide text-stone-300"
        >
          © 2025 Aqua AInsure · All rights reserved
        </motion.p>
      </div>

      <BottomNav />
    </div>
  );
};

export default SettingsPage;