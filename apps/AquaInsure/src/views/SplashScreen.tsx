import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import axios from '@/lib/api';

const FLUID_EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp = (delay = 0, y = 14, duration = 0.85) => ({
  initial: { opacity: 0, y },
  animate: { opacity: 1, y: 0 },
  transition: { duration, delay, ease: FLUID_EASE },
});

const SplashScreen = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    let ignore = false;

    const checkSessionAndNavigate = async () => {
      try {
        const sessionStr = localStorage.getItem('aqua-session');
        if (!sessionStr) {
          navigate('/language', { replace: true });
          return;
        }

        const session = JSON.parse(sessionStr);
        if (!session?.token) {
          navigate('/language', { replace: true });
          return;
        }

        const res = await axios.get('/api/auth/status');
        if (ignore) return;

        if (res.data.success) {
          const { isProfileComplete, onboardingStep, farmData, name } = res.data;
          if (name) localStorage.setItem('shrimpguard-farmer', JSON.stringify({ name }));
          if (farmData) localStorage.setItem('aqua-farm', JSON.stringify(farmData));
          localStorage.setItem('aqua-reg-complete', isProfileComplete ? '1' : '0');

          if (!isProfileComplete) {
            switch (onboardingStep) {
              case 'farmer_registration':
                navigate('/farmer-registration', { replace: true });
                break;
              case 'farm_registration':
                navigate('/farm-registration', { replace: true });
                break;
              case 'insurance_registration':
                navigate('/insurance-registration', { replace: true });
                break;
              case 'insured_ponds':
                navigate('/insured-ponds', { replace: true });
                break;
              default:
                navigate('/farmer-registration', { replace: true });
            }
          } else {
            navigate('/dashboard', { replace: true });
          }
        } else {
          navigate('/login', { replace: true });
        }
      } catch (err) {
        if (!ignore) {
          const isComplete = localStorage.getItem('aqua-reg-complete') === '1';
          const session = localStorage.getItem('aqua-session');
          if (session) {
            navigate(isComplete ? '/dashboard' : '/farmer-registration', { replace: true });
          } else {
            navigate('/language', { replace: true });
          }
        }
      }
    };

    const timer = setTimeout(() => {
      checkSessionAndNavigate();
    }, 2800);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div
      className="relative min-h-[100dvh] w-full bg-white flex flex-col items-center justify-between overflow-hidden select-none"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
        * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }

        /* Seamless Waves — hardware-accelerated continuous loop */
        @keyframes w1 { from{transform:translate3d(0,0,0)}    to{transform:translate3d(-50%,0,0)} }
        @keyframes w2 { from{transform:translate3d(-50%,0,0)} to{transform:translate3d(0,0,0)}   }
        @keyframes w3 { from{transform:translate3d(0,0,0)}    to{transform:translate3d(-50%,0,0)} }
        .wave1 { animation: w1 10s linear infinite; will-change:transform; }
        .wave2 { animation: w2 15s linear infinite; will-change:transform; }
        .wave3 { animation: w3 8s linear infinite; will-change:transform; }

        /* Progress bar — smooth fluid curve */
        @keyframes grow { from{transform:scaleX(0)} to{transform:scaleX(1)} }
        .bar { transform-origin:left; animation:grow 3.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; will-change:transform; }

        /* Soft halo breathing */
        @keyframes halo { 0%,100%{transform:scale(1);opacity:.25} 50%{transform:scale(1.08);opacity:.48} }
        .halo { animation:halo 4s ease-in-out infinite; will-change:transform,opacity; }
      `}</style>

      {/* ── BACKGROUND BLOBS ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div
          style={{
            position: 'absolute', top: '-6%', left: '-10%',
            width: '62vw', height: '62vw', maxWidth: 320, maxHeight: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 68%)'
          }}
        />
        <div
          style={{
            position: 'absolute', top: '-4%', right: '-10%',
            width: '55vw', height: '55vw', maxWidth: 290, maxHeight: 290,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 68%)'
          }}
        />
        <div
          style={{
            position: 'absolute', top: '35%', left: '-12%',
            width: '50vw', height: '50vw', maxWidth: 260, maxHeight: 260,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 68%)'
          }}
        />
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(15,118,110,0.05) 1px, transparent 1px)',
            backgroundSize: '26px 26px'
          }}
        />
      </div>

      {/* ── SAFE AREA TOP ── */}
      <div className="h-8 sm:h-12 w-full shrink-0" />

      {/* ── CENTRE CONTENT ── */}
      <div className="z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6 w-full max-w-sm my-auto">
        {/* LOGO */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.95, delay: 0.2, ease: FLUID_EASE }}
        >
          {/* Subtle halo pulse */}
          <div
            className="halo pointer-events-none absolute -inset-3 rounded-full blur-xl"
            style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.2) 0%, transparent 70%)' }}
          />

          <img
            src="/aquainsure/logo.jpeg"
            alt="Aqua AInsure"
            className="relative w-48 h-48 sm:w-44 sm:h-44 object-contain"
            style={{ display: 'block' }}
          />
        </motion.div>

        {/* TAGLINE — optically centered with letter-spacing offset */}
        <motion.div
          {...fadeUp(0.55, 10)}
          className="w-full flex items-center justify-center gap-3 px-2"
        >
          <div
            className="h-px flex-1 max-w-[36px]"
            style={{ background: 'linear-gradient(to right, transparent, rgba(20,184,166,0.4))' }}
          />
          <p
            className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.32em] pl-[0.32em] text-center shrink-0"
            style={{ color: '#64748b' }}
          >
            {t('app.tagline')}
          </p>
          <div
            className="h-px flex-1 max-w-[36px]"
            style={{ background: 'linear-gradient(to left, transparent, rgba(20,184,166,0.4))' }}
          />
        </motion.div>

        {/* PROGRESS BAR */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8, ease: FLUID_EASE }}
          className="flex flex-col items-center gap-2 mt-2"
        >
          <div
            className="relative h-[3px] w-40 sm:w-48 overflow-hidden rounded-full"
            style={{ background: 'rgba(20,184,166,0.14)' }}
          >
            <div
              className="bar absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #14b8a6 0%, #f59e0b 50%, #0f766e 100%)'
              }}
            />
          </div>
        </motion.div>
      </div>

      {/* ── COPYRIGHT ── */}
      <p
        className="z-20 text-[8px] sm:text-[9px] font-medium tracking-wide mb-3"
        style={{ color: '#94a3b8' }}
      >
        © 2025 Aqua AInsure · All rights reserved
      </p>

      {/* ── WAVES — full immersive ocean depth with seamless loops ── */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-0 z-10 w-full overflow-hidden"
        style={{ height: '42vh' }}
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.8, delay: 0.5, ease: [0.25, 1, 0.5, 1] }}
      >
        {/* Layer 1 — amber undertone (Back, slowest) */}
        <div className="wave1 absolute bottom-0 w-[200%] h-full" style={{ opacity: 0.14 }}>
          <svg viewBox="0 0 2880 320" preserveAspectRatio="none" className="w-full h-full">
            <path
              fill="#f59e0b"
              d="M0,180 C360,100 720,240 1080,140 C1260,90 1380,130 1440,180 C1800,100 2160,240 2520,140 C2700,90 2820,130 2880,180 L2880,320 L0,320 Z"
            />
          </svg>
        </div>

        {/* Layer 2 — mid aqua surge (Middle, counter-flow) */}
        <div className="wave2 absolute bottom-0 w-[200%] h-full" style={{ opacity: 0.28 }}>
          <svg viewBox="0 0 2880 320" preserveAspectRatio="none" className="w-full h-full">
            <path
              fill="#14b8a6"
              d="M0,190 C320,260 680,120 1040,210 C1240,260 1380,220 1440,190 C1760,260 2120,120 2480,210 C2680,260 2820,220 2880,190 L2880,320 L0,320 Z"
            />
          </svg>
        </div>

        {/* Layer 3 — deep solid ocean teal (Front crest, crisp grounding) */}
        <div className="wave3 absolute bottom-0 w-[200%] h-full" style={{ opacity: 1 }}>
          <svg viewBox="0 0 2880 320" preserveAspectRatio="none" className="w-full h-full">
            <path
              fill="#0f766e"
              d="M0,150 C280,80 620,200 960,110 C1180,50 1360,100 1440,150 C1720,80 2060,200 2400,110 C2620,50 2800,100 2880,150 L2880,320 L0,320 Z"
            />
          </svg>
        </div>
      </motion.div>
    </div>
  );
};

export default SplashScreen;