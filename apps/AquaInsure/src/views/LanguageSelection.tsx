import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🌿' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🌾' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🌻' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', flag: '🐚' },
];

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
      className="relative min-h-[100dvh] w-full flex flex-col overflow-hidden bg-white pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,500&display=swap');
        * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }

        .cta-btn {
          background: #1c6b5a;
          box-shadow: 0 4px 14px -2px rgba(28,107,90,0.35);
          transition: background-color .15s, transform .15s;
        }
        .cta-btn:hover {
          background: #155245;
        }
        .cta-btn:active { transform: scale(0.98); }

        .lang-card { transition: background-color .15s, border-color .15s; }
        .lang-card:active { transform: scale(0.99); }
      `}</style>

      {/* ── BACKGROUND ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, #d6e8e1 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/3 -left-16 w-64 h-64 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #f0e4c8 0%, transparent 70%)' }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(28,74,62,0.05) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }} />
      </div>

      {/* ── CENTERED CONTENT CONTAINER ── */}
      <div className="z-10 flex-1 flex flex-col justify-center my-auto py-6 w-full">
        {/* ── HEADER ── */}
        <div className="flex flex-col items-center px-6 pb-2">
          {/* Logo */}
          <div>
            <img
              src="/aquainsure/logo.jpeg"
              alt="Aqua AInsure"
              className="relative w-32 h-32 sm:w-36 sm:h-36 object-contain"
              style={{ display: 'block' }}
            />
          </div>

          {/* Heading */}
          <div className="text-center mt-2">
            <h1 className="font-bold leading-tight mb-1 text-stone-800"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(1.1rem, 5vw, 1.3rem)',
              }}
            >
              {t('language.title')}
            </h1>
          </div>
        </div>

        {/* ── LANGUAGE CARDS ── */}
        <div className="flex flex-col px-5 sm:px-6 pt-3 pb-2 w-full max-w-sm mx-auto gap-2.5">
          {languages.map((lang) => {
            const isSel = selected === lang.code;
            return (
              <button
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
              </button>
            );
          })}

          {/* CTA */}
          <button
            onClick={handleContinue}
            className="cta-btn mt-3 w-full rounded-2xl text-white text-sm sm:text-base font-bold tracking-wide flex items-center justify-center gap-2.5 touch-manipulation"
            style={{ height: '52px' }}
          >
            <span>{t('language.continue')}</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Copyright */}
          <p className="text-center text-[8px] sm:text-[9px] font-medium mt-3 tracking-wide text-stone-400">
            © 2025 Aqua AInsure · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelection;