import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowRight, Globe } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🌿' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🌾' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🌻' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', flag: '🐚' },
];

const EASE = [0.16, 1, 0.3, 1] as const;

const LanguageSelection = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState(localStorage.getItem('shrimpguard-lang') || 'en');

  const handleSelect = (code: string) => {
    setSelected(code);
    i18n.changeLanguage(code);
    localStorage.setItem('shrimpguard-lang', code);
  };

  const handleContinue = () => navigate('/login');

  return (
    <div
      className="relative min-h-screen w-full flex flex-col overflow-hidden bg-white"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,500&display=swap');
        * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }

        @keyframes halo { 0%,100%{transform:scale(1);opacity:.20} 50%{transform:scale(1.10);opacity:.42} }
        .halo { animation: halo 4.2s ease-in-out infinite; will-change:transform,opacity; }

        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.25} }
        .blink { animation: blink 2s ease-in-out infinite; }

        .cta-btn {
          background: linear-gradient(110deg, #1c6b5a 20%, #2d9b7f 48%, #3ab88f 55%, #1c6b5a 80%);
          background-size: 220% auto;
          animation: shimCta 3s linear infinite;
          box-shadow: 0 8px 28px -4px rgba(28,107,90,0.35), 0 2px 8px rgba(0,0,0,0.10);
          transition: transform .15s;
        }
        @keyframes shimCta {
          0%{background-position:-200% center}
          100%{background-position:200% center}
        }
        .cta-btn:active { transform: scale(0.975); }

        .lang-card { transition: transform .18s cubic-bezier(.16,1,.3,1); }
        .lang-card:active { transform: scale(0.97); }

        @keyframes floatOrb {
          0%,100%{ transform:translateY(0); }
          50%{ transform:translateY(-12px); }
        }
        .orb1 { animation: floatOrb 8s ease-in-out infinite; }
        .orb2 { animation: floatOrb 12s ease-in-out infinite reverse; }
      `}</style>

      {/* ── BACKGROUND ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="orb1 absolute -top-20 -right-16 w-72 h-72 rounded-full opacity-50"
          style={{ background: 'radial-gradient(circle, #d6e8e1 0%, transparent 70%)' }} />
        <div className="orb2 absolute bottom-1/3 -left-16 w-64 h-64 rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, #f0e4c8 0%, transparent 70%)' }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(28,74,62,0.05) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }} />
      </div>

      {/* ── SAFE AREA ── */}
      <div className="h-12 sm:h-14 shrink-0" />

      {/* ── HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.1, ease: EASE }}
        className="z-10 flex flex-col items-center pt-2 px-6 pb-1"
      >
        {/* Logo with ring */}
        <motion.div

        >
          <img
            src="/aquainsure/logo.jpeg"
            alt="Aqua AInsure"
            className="relative w-36 h-36 sm:w-36 sm:h-36  object-contain"
            style={{ display: 'block' }}
          />

        </motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.45, ease: EASE }}
          className="text-center"
        >
          <h1 className="font-bold leading-tight mb-1 text-stone-800"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(1rem, 5vw, 1.2rem)',
            }}
          >
            {t('language.title')}
          </h1>
        </motion.div>
      </motion.div>

      {/* ── LANGUAGE CARDS ── */}
      <div className="z-10 flex-1 flex flex-col px-5 sm:px-6 pt-5 pb-4 w-full max-w-sm mx-auto gap-2.5">
        {languages.map((lang, idx) => {
          const isSel = selected === lang.code;
          return (
            <motion.button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className="lang-card w-full flex items-center gap-4 rounded-2xl text-left"
              style={{
                padding: '13px 16px',
                background: isSel ? '#f0faf6' : 'rgba(255,255,255,0.90)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: isSel
                  ? '1.5px solid rgba(45,155,127,0.50)'
                  : '1px solid rgba(28,74,62,0.10)',
                boxShadow: isSel
                  ? '0 4px 20px -4px rgba(45,155,127,0.20), inset 0 1px 0 rgba(255,255,255,0.9)'
                  : '0 1px 6px rgba(0,0,0,0.05)',
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + idx * 0.07, duration: 0.55, ease: EASE }}
            >
              {/* Flag circle */}
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{
                  background: isSel ? 'rgba(45,155,127,0.12)' : 'rgba(28,74,62,0.06)',
                  border: isSel ? '1px solid rgba(45,155,127,0.25)' : '1px solid rgba(28,74,62,0.08)',
                }}>
                {lang.flag}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-bold leading-tight text-stone-800">
                  {lang.name}
                </p>
                <p className="text-xs mt-0.5 font-medium text-stone-400 truncate">
                  {lang.native}
                </p>
              </div>

              {/* Check */}
              {isSel ? (
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(45,155,127,0.15)', border: '1.5px solid rgba(45,155,127,0.50)' }}>
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4L4 7L10 1" stroke="#2d9b7f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full shrink-0"
                  style={{ border: '1.5px solid rgba(28,74,62,0.18)', background: 'transparent' }} />
              )}
            </motion.button>
          );
        })}

        {/* CTA */}
        <motion.button
          onClick={handleContinue}
          className="cta-btn mt-3 w-full rounded-2xl text-white text-sm sm:text-base font-bold tracking-wide flex items-center justify-center gap-2.5"
          style={{ height: '52px' }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.65, ease: EASE }}
        >
          <span>{t('language.continue')}</span>
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </motion.button>

        {/* Copyright */}
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="text-center text-[8px] sm:text-[9px] font-medium mt-3 tracking-wide text-stone-300"
        >
          © 2025 Aqua AInsure · All rights reserved
        </motion.p>
      </div>

    </div>
  );
};

export default LanguageSelection;