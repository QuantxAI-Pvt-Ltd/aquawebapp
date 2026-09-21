import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Phone, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from '@/lib/api';

const API = '/api/auth';
const EASE = [0.16, 1, 0.3, 1] as const;

const Login = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setPhoneError('');
    setPasswordError('');

    let hasError = false;
    if (!/^[0-9]{10}$/.test(phone)) {
      setPhoneError(t('auth.enterValidMobile'));
      hasError = true;
    }
    if (!password || password.length < 6) {
      setPasswordError(t('auth.errors.passwordMin'));
      hasError = true;
    }
    if (hasError) return;

    setLoading(true);
    try {
      const res = await axios.post(`${API}/login`, { phone, password });
      const { token, farmerId, isNewFarmer, name } = res.data;

      // Clear ALL previous session state so stale flags don't affect new users
      localStorage.removeItem('shrimpguard-farmer');
      localStorage.removeItem('aqua-farm');
      localStorage.removeItem('aqua-reg-complete');
      localStorage.removeItem('draft_farmer');
      localStorage.removeItem('draft_farm_form');
      localStorage.removeItem('draft_farm_infra');
      localStorage.removeItem('draft_insurance_form');
      localStorage.removeItem('draft_insurance_ponds');
      localStorage.setItem('aqua-session', JSON.stringify({ phone, farmerId, token }));
      if (!isNewFarmer && name) localStorage.setItem('shrimpguard-farmer', JSON.stringify({ name }));

      toast.success(t('auth.loginSuccess'));
      navigate(isNewFarmer ? '/farmer-registration' : '/dashboard', { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-[100dvh] w-full flex flex-col overflow-hidden bg-white"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
        * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }

        @keyframes shim {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        .cta-btn {
          background: linear-gradient(110deg, #1c6b5a 25%, #2d9b7f 48%, #3ab88f 55%, #1c6b5a 75%);
          background-size: 220% auto;
          animation: shim 3.2s linear infinite;
          box-shadow: 0 6px 24px -4px rgba(28, 107, 90, 0.35);
          transition: filter 0.2s, transform 0.15s;
        }
        .cta-btn:hover { filter: brightness(1.06); }
        .cta-btn:active { transform: scale(0.98); }
        .cta-btn:disabled { opacity: 0.6; cursor: not-allowed; animation: none; }

        .f-box:focus-within {
          border-color: rgba(45, 155, 127, 0.55);
          box-shadow: 0 0 0 3px rgba(45, 155, 127, 0.09);
        }
      `}</style>

      {/* CENTERED CONTENT CONTAINER */}
      <div className="z-10 flex-1 flex flex-col justify-center px-4 sm:px-0 py-6 sm:py-8 w-full max-w-sm mx-auto">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
          className="flex flex-col items-center pb-3 px-4 sm:px-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.5, ease: EASE }}
            className="text-center"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            <h1 className="text-[1.4rem] sm:text-[1.5rem] font-normal leading-tight text-stone-800">
              {t('auth.welcomeHeading')}
            </h1>
            <h1
              className="text-[1.4rem] sm:text-[1.5rem] font-normal leading-tight"
              style={{
                background: 'linear-gradient(120deg, #b5813a 0%, #d4973f 50%, #1c6b5a 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              {t('dashboard.farmer')}
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.72, duration: 0.8 }}
            className="text-xs font-medium mt-2 text-center text-stone-400"
          >
            {t('app.tagline')}
          </motion.p>
        </motion.div>

        {/* FORM CARD */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.42, ease: EASE }}
          className="flex flex-col w-full"
        >
        <div
          className="rounded-3xl p-5 sm:p-6 flex flex-col gap-4 sm:gap-5 bg-white border border-stone-100 shadow-sm"
          style={{ boxShadow: '0 8px 40px -8px rgba(28,74,62,0.10), 0 2px 12px rgba(0,0,0,0.04)' }}
        >
          {/* PHONE */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400 mb-0.5">
              {t('auth.mobile')}
            </p>
            <div className="f-wrap flex flex-col gap-1">
              <div className="f-box relative flex items-center rounded-2xl bg-white border border-stone-200 transition-all duration-200">
                <span className="pl-4 shrink-0 text-amber-500">
                  <Phone className="w-4 h-4" />
                </span>
                <Input
                  value={phone}
                  onChange={e => { setPhone(e.target.value); setPhoneError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder={t('auth.mobilePlaceholder')}
                  type="tel"
                  maxLength={10}
                  className="border-0 bg-transparent h-12 pl-3 pr-4 text-base sm:text-sm font-medium focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-stone-300 text-stone-800"
                />
              </div>
              {phoneError && (
                <p className="text-[10px] font-semibold pl-1 text-red-500">{phoneError}</p>
              )}
            </div>
          </div>

          {/* PASSWORD */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400 mb-0.5">
              {t('auth.password')}
            </p>
            <div className="f-wrap flex flex-col gap-1">
              <div className="f-box relative flex items-center rounded-2xl bg-white border border-stone-200 transition-all duration-200">
                <span className="pl-4 shrink-0 text-teal-600">
                  <Lock className="w-4 h-4" />
                </span>
                <Input
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder={t('auth.passwordPlaceholder')}
                  type={showPassword ? 'text' : 'password'}
                  className="border-0 bg-transparent h-12 pl-3 pr-2 text-base sm:text-sm font-medium focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-stone-300 text-stone-800 flex-1"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="w-11 h-11 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors touch-manipulation"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-[10px] font-semibold pl-1 text-red-500">{passwordError}</p>
              )}
            </div>
          </div>

          {/* SUBMIT */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="cta-btn w-full h-12 rounded-2xl text-white text-sm font-bold tracking-wide flex items-center justify-center gap-2.5"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              />
            ) : (
              <>
                <span>{t('auth.login')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Signup link */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-stone-100" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-stone-300">
              {t('auth.orDivider')}
            </span>
            <div className="flex-1 h-px bg-stone-100" />
          </div>
          <p className="text-center text-sm text-stone-500 -mt-2">
            {t('auth.noAccount')}{' '}
            <Link to="/signup" className="font-bold text-teal-700 hover:text-teal-900">
              {t('auth.signup')}
            </Link>
          </p>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.8 }}
          className="text-center text-[8px] sm:text-[9px] font-medium mt-5 tracking-wide text-stone-300"
        >
          {t('auth.copyright')}
        </motion.p>
      </motion.div>
      </div>
    </div>
  );
};

export default Login;