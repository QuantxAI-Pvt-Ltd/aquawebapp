import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from '@/lib/api';

const API = '/api/auth';

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
      if (res.data.success) {
        localStorage.setItem('shrimpguard-user', JSON.stringify({ phone, token: res.data.token }));
        localStorage.setItem('aqua-session', JSON.stringify({ phone, farmerId: res.data.farmerId, token: res.data.token }));
        
        toast.success(t('auth.loginSuccess'));

        // Resume onboarding step returned from server
        const { onboardingStep, isProfileComplete } = res.data;
        if (isProfileComplete) {
          localStorage.setItem('aqua-reg-complete', '1');
          navigate('/dashboard');
        } else {
          switch (onboardingStep) {
            case 'farmer_registration':
              navigate('/farmer-registration');
              break;
            case 'farm_registration':
              navigate('/farm-registration');
              break;
            case 'insurance_registration':
              navigate('/insurance-registration');
              break;
            case 'insured_ponds':
              navigate('/insured-ponds');
              break;
            default:
              navigate('/farmer-registration');
          }
        }
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || t('auth.loginFailed');
      toast.error(errorMsg);
      if (err.response?.status === 404) {
        setPhoneError(t('auth.errors.mobileNotRegistered'));
      } else if (err.response?.status === 401) {
        setPasswordError(t('auth.errors.invalidPassword'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] flex flex-col justify-between relative overflow-hidden bg-stone-50"
      style={{ fontFamily: "'Sora', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');
        * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }

        .cta-btn {
          background: linear-gradient(110deg, #1c6b5a 20%, #2d9b7f 55%, #1c6b5a 80%);
          box-shadow: 0 6px 28px -4px rgba(28,107,90,0.38), 0 2px 8px rgba(0,0,0,0.06);
          cursor: pointer;
        }
        .cta-btn:active { transform: scale(0.98); }

        .f-box:focus-within {
          border-color: #1c6b5a !important;
          box-shadow: 0 0 0 3px rgba(28,107,90,0.12);
        }
      `}</style>

      {/* Decorative top wave/glow background */}
      <div
        className="absolute top-0 left-0 right-0 h-64 pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(ellipse at 50% -20%, #2d9b7f 0%, #1c4a3e 50%, transparent 80%)',
        }}
      />

      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto px-5 py-8 relative z-10">
        {/* LOGO & HEADING */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 shadow-xl shadow-teal-900/10 border border-white/60"
            style={{
              background: 'linear-gradient(135deg, #1c6b5a 0%, #2d9b7f 100%)',
            }}
          >
            <span className="text-2xl font-black text-white tracking-tighter">AI</span>
          </div>

          <div
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
          </div>

          <p className="text-xs font-medium mt-2 text-center text-stone-400">
            {t('app.tagline')}
          </p>
        </div>

        {/* FORM CARD */}
        <div className="flex flex-col w-full">
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
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

          <p className="text-center text-[8px] sm:text-[9px] font-medium mt-5 tracking-wide text-stone-300">
            {t('auth.copyright')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;