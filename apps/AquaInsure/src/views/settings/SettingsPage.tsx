import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Globe,
  User,
  LogOut,
  ChevronRight,
  PhoneCall,
  ShieldCheck,
  FileText,
  HelpCircle,
  X,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import axios from '@/lib/api';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [farmer, setFarmer] = useState<any>(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('aqua-session') || '{}');
    if (session.farmerId) {
      axios
        .get(`/api/farmers/${session.farmerId}`)
        .then((res) => {
          if (res.data.success) {
            setFarmer(res.data.data);
          }
        })
        .catch(() => {});
    }
  }, []);

  const logout = () => {
    // Thoroughly purge all auth, profile, and draft keys
    localStorage.removeItem('shrimpguard-user');
    localStorage.removeItem('shrimpguard-farmer');
    localStorage.removeItem('aqua-session');
    localStorage.removeItem('aqua-farm');
    localStorage.removeItem('aqua-reg-complete');

    // Clean any local drafts
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('draft_')) {
        localStorage.removeItem(k);
      }
    });

    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  };

  const session = JSON.parse(localStorage.getItem('aqua-session') || '{}');
  const farmerName = farmer?.name || session.name || 'Shrimp Farmer';
  const farmerPhone = farmer?.phone || session.phone || 'Verified Account';

  const items = [
    {
      icon: User,
      label: t('settings.editProfile') || 'Edit Farmer Profile',
      action: () => navigate('/farmer-registration?mode=edit'),
      destructive: false,
      iconBg: 'bg-amber-50 border-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      icon: Globe,
      label: t('settings.changeLanguage') || 'Change Language',
      action: () => navigate('/language'),
      destructive: false,
      iconBg: 'bg-teal-50 border-teal-100',
      iconColor: 'text-teal-600',
    },
    {
      icon: HelpCircle,
      label: 'Help & 24/7 Aquaculture Support',
      action: () => setSupportModalOpen(true),
      destructive: false,
      iconBg: 'bg-sky-50 border-sky-100',
      iconColor: 'text-sky-600',
    },
    {
      icon: FileText,
      label: 'Insurance Terms & Coverage Policy',
      action: () => setTermsModalOpen(true),
      destructive: false,
      iconBg: 'bg-emerald-50 border-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      icon: LogOut,
      label: t('settings.logout') || 'Sign Out',
      action: logout,
      destructive: true,
      iconBg: 'bg-red-50 border-red-100',
      iconColor: 'text-red-500',
    },
  ];

  return (
    <div
      className="min-h-[100dvh] bg-stone-50 pb-0 overflow-x-clip flex flex-col"
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
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all touch-manipulation"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-white tracking-tight">
              {t('settings.title') || 'Settings & Support'}
            </h1>
          </div>
          <span className="text-[10px] font-bold text-white/85 px-2.5 py-1 bg-white/12 rounded-lg border border-white/15">
            Aqua <span className="text-amber-300">AI</span>nsure
          </span>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* FARMER PROFILE CARD */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm flex items-center gap-3.5"
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-teal-900/10 shrink-0"
            style={{ background: 'linear-gradient(135deg, #1c6b5a, #2d9b7f)' }}
          >
            {farmerName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-stone-800 truncate">{farmerName}</h2>
              <span className="inline-flex items-center text-teal-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-xs text-stone-500 font-medium truncate mt-0.5">{farmerPhone}</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200/60 shrink-0">
            Active Policy
          </span>
        </motion.div>

        {/* SETTINGS LIST */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm"
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              onClick={item.action}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 transition-colors active:bg-stone-50
                ${idx < items.length - 1 ? 'border-b border-stone-100' : ''}
                ${item.destructive ? 'hover:bg-red-50/60' : 'hover:bg-stone-50'}
              `}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${item.iconBg}`}
              >
                <item.icon size={16} className={item.iconColor} />
              </div>

              <span
                className={`flex-1 text-left text-xs font-semibold ${
                  item.destructive ? 'text-red-500' : 'text-stone-700'
                }`}
              >
                {item.label}
              </span>

              <ChevronRight
                size={15}
                className={item.destructive ? 'text-red-300' : 'text-stone-300'}
              />
            </button>
          ))}
        </motion.div>

        {/* APP VERSION / FOOTER */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center text-[10px] font-semibold text-stone-400 mt-5 tracking-wide"
        >
          Aqua <span className="text-teal-600">AI</span>nsure v2.4.0 · All rights reserved
        </motion.p>
      </div>

      {/* SUPPORT MODAL */}
      <AnimatePresence>
        {supportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-stone-200 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                    <PhoneCall size={16} />
                  </div>
                  <h3 className="text-base font-bold text-stone-800">Aqua Support Hotline</h3>
                </div>
                <button
                  onClick={() => setSupportModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-stone-500 leading-relaxed">
                Connect directly with certified aquaculture specialists and insurance claim adjusters for immediate field guidance.
              </p>

              <div className="space-y-2.5">
                <a
                  href="tel:18001234567"
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-teal-50/80 border border-teal-100 hover:bg-teal-100/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <PhoneCall className="w-4 h-4 text-teal-600" />
                    <div>
                      <p className="text-xs font-bold text-stone-800">Toll-Free Helpline</p>
                      <p className="text-[11px] text-teal-700 font-medium">1800-123-4567 (24/7)</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-teal-700">Call Now →</span>
                </a>

                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80">
                  <p className="text-xs font-bold text-stone-800">Field Biologist WhatsApp</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">+91 98765 43210 (Mon-Sat, 8 AM - 8 PM)</p>
                </div>
              </div>

              <Button
                onClick={() => setSupportModalOpen(false)}
                className="w-full h-11 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs"
              >
                Close
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TERMS MODAL */}
      <AnimatePresence>
        {termsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-3xl p-6 border border-stone-200 shadow-2xl flex flex-col space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <ShieldCheck size={16} />
                  </div>
                  <h3 className="text-base font-bold text-stone-800">Insurance Terms</h3>
                </div>
                <button
                  onClick={() => setTermsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 text-xs text-stone-600 leading-relaxed pr-1">
                <p>
                  <strong>1. Coverage Criteria:</strong> Shrimp crop insurance policies cover unexpected mortality exceeding 30% due to non-preventable bacterial/viral outbreaks, acute environmental fluctuations, and natural cyclones.
                </p>
                <p>
                  <strong>2. Daily Record Compliance:</strong> To validate claim eligibility, farmers must log daily DO, pH, and feeding records in the AquaInsure application.
                </p>
                <p>
                  <strong>3. Claim Filing Window:</strong> In the event of mass mortality, notice and damage evidence photos must be submitted through the Claims section within 48 hours.
                </p>
              </div>

              <Button
                onClick={() => setTermsModalOpen(false)}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-teal-700 to-teal-600 text-white font-bold text-xs shadow-md shadow-teal-700/20"
              >
                I Understand
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default SettingsPage;