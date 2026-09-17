import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

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
    const timer = setTimeout(() => {
      const user = localStorage.getItem('shrimpguard-user');
      navigate(user ? '/dashboard' : '/language', { replace: true });
    }, 3500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className="relative min-h-screen w-full bg-white flex flex-col items-center justify-between overflow-hidden select-none"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
        * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }

        /* Gentle Waves — smooth horizontal translation */
        @keyframes w1 { from{transform:translateX(0)}    to{transform:translateX(-50%)} }
        @keyframes w2 { from{transform:translateX(-50%)} to{transform:translateX(0)}   }
        @keyframes w3 { from{transform:translateX(0)}    to{transform:translateX(-50%)} }
        .wave1 { animation: w1 14s linear infinite; will-change:transform; }
        .wave2 { animation: w2 18s linear infinite; will-change:transform; }
        .wave3 { animation: w3 12s linear infinite; will-change:transform; }

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

      {/* ── WAVES — balanced height to ground bottom cleanly ── */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-0 z-10 w-full overflow-hidden"
        style={{ height: '26vh' }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.4, delay: 0.4, ease: FLUID_EASE }}
      >
        {/* Layer 1 — amber, lightest */}
        <div className="wave1 absolute bottom-0 w-[200%]" style={{ opacity: 0.13 }}>
          <svg viewBox="0 0 1440 320" preserveAspectRatio="none" width="100%" height="100%">
            <path
              fill="#f59e0b"
              d="M0,192L80,181C160,171,320,149,480,154.7C640,160,800,192,960,202.7C1120,213,1280,192,1360,181.3L1440,171L1440,320L0,320Z"
            />
          </svg>
        </div>

        {/* Layer 2 — mid teal */}
        <div className="wave2 absolute bottom-0 w-[200%]" style={{ opacity: 0.25 }}>
          <svg viewBox="0 0 1440 280" preserveAspectRatio="none" width="100%" height="100%">
            <path
              fill="#14b8a6"
              d="M0,224L80,208C160,192,320,160,480,165.3C640,171,800,213,960,218.7C1120,224,1280,197,1360,186.7L1440,176L1440,280L0,280Z"
            />
          </svg>
        </div>

        {/* Layer 3 — solid deep teal, front */}
        <div className="wave3 absolute bottom-0 w-[200%]" style={{ opacity: 0.95 }}>
          <svg viewBox="0 0 1440 240" preserveAspectRatio="none" width="100%" height="100%">
            <path
              fill="#0f766e"
              d="M0,160L80,149C160,139,320,117,480,122.7C640,128,800,160,960,170.7C1120,181,1280,160,1360,149.3L1440,139L1440,240L0,240Z"
            />
          </svg>
        </div>
      </motion.div>
    </div>
  );
};

export default SplashScreen;