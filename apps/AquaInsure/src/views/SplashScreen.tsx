import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from '@/lib/api';

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
    }, 1500);

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

        /* Progress bar */
        @keyframes grow { from{transform:scaleX(0)} to{transform:scaleX(1)} }
        .bar { transform-origin:left; animation:grow 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; will-change:transform; }
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
        <div className="relative">
          <img
            src="/aquainsure/logo.jpeg"
            alt="Aqua AInsure"
            className="relative w-48 h-48 sm:w-44 sm:h-44 object-contain"
            style={{ display: 'block' }}
          />
        </div>

        {/* TAGLINE — optically centered with letter-spacing offset */}
        <div className="w-full flex items-center justify-center gap-3 px-2">
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
        </div>

        {/* PROGRESS BAR */}
        <div className="flex flex-col items-center gap-2 mt-2">
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
        </div>
      </div>

      {/* ── COPYRIGHT ── */}
      <p
        className="z-20 text-[8px] sm:text-[9px] font-medium tracking-wide mb-3"
        style={{ color: '#94a3b8' }}
      >
        © 2025 Aqua AInsure · All rights reserved
      </p>
    </div>
  );
};

export default SplashScreen;