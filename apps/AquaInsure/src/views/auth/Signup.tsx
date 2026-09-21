import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from '@/lib/api';

const API = '/api/auth';

const Signup = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!/^[0-9]{10}$/.test(phone)) e.phone = t('auth.enterValidMobile');
    if (password.length < 6) e.password = t('auth.errors.passwordMin');
    if (password !== confirmPassword) e.confirmPassword = t('auth.errors.passwordsDoNotMatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/register`, {
        phone,
        email: email || undefined,
        password,
      });

      if (res.data.success) {
        toast.success(t('auth.signupSuccess'));
        localStorage.setItem('shrimpguard-user', JSON.stringify({ phone, token: res.data.token }));
        localStorage.setItem('aqua-session', JSON.stringify({ phone, farmerId: res.data.farmerId, token: res.data.token }));
        navigate('/farmer-registration');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || t('auth.signupFailed');
      toast.error(errorMsg);
      if (err.response?.status === 409) {
        setErrors({ phone: t('auth.errors.mobileAlreadyRegistered') });
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

      {/* Decorative background glow */}
      <div
        className="absolute top-0 left-0 right-0 h-64 pointer-events-none opacity-40"
        style={{
          background: 'radial-gradient(ellipse at 50% -20%, #2d9b7f 0%, #1c4a3e 50%, transparent 80%)',
        }}
      />

      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto px-5 py-8 relative z-10">
        {/* LOGO & HEADING */}
        <div className="flex flex-col items-center mb-6">
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
              {t('auth.signupHeading')}
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
              {t('auth.createAccount')}
            </h1>
          </div>

          <p className="text-xs font-medium mt-2 text-center text-stone-400">
            {t('app.tagline')}
          </p>
        </div>

        {/* FORM CARD */}
        <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden"
          style={{ boxShadow: '0 8px 40px -8px rgba(28,74,62,0.10), 0 2px 12px rgba(0,0,0,0.04)' }}
        >
          <div className="p-5 sm:p-6 flex flex-col gap-4">
            {/* PHONE */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider pl-1 text-stone-500">
                {t('auth.mobile')}
              </label>
              <div className="f-box relative flex items-center rounded-xl bg-stone-50 border border-stone-200 transition-all duration-200">
                <span className="pl-3.5 shrink-0 text-amber-500"><Phone className="w-4 h-4" /></span>
                <Input
                  value={phone}
                  onChange={e => { setPhone(e.target.value); setErrors(p => ({ ...p, phone: '' })); }}
                  placeholder={t('auth.mobilePlaceholder')}
                  type="tel"
                  maxLength={10}
                  className="bg-transparent h-12 pl-3 pr-4 text-base sm:text-sm font-medium text-stone-800 placeholder:text-stone-400 border-0 focus-visible:ring-0"
                />
              </div>
              {errors.phone && <p className="text-xs font-medium pl-1 text-red-500">{errors.phone}</p>}
            </div>

            {/* EMAIL (optional) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider pl-1 text-stone-500">
                {t('auth.email')} <span className="text-stone-300 normal-case font-normal">({t('common.optional')})</span>
              </label>
              <div className="f-box relative flex items-center rounded-xl bg-stone-50 border border-stone-200 transition-all duration-200">
                <span className="pl-3.5 shrink-0 text-sky-400">@</span>
                <Input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  type="email"
                  className="bg-transparent h-12 pl-3 pr-4 text-base sm:text-sm font-medium text-stone-800 placeholder:text-stone-400 border-0 focus-visible:ring-0"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider pl-1 text-stone-500">
                {t('auth.password')}
              </label>
              <div className="f-box relative flex items-center rounded-xl bg-stone-50 border border-stone-200 transition-all duration-200">
                <span className="pl-3.5 shrink-0 text-teal-500"><Lock className="w-4 h-4" /></span>
                <Input
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="bg-transparent h-12 pl-3 pr-2 text-base sm:text-sm font-medium text-stone-800 placeholder:text-stone-400 border-0 focus-visible:ring-0 flex-1"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="w-11 h-11 flex items-center justify-center text-stone-400 hover:text-stone-600 touch-manipulation"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs font-medium pl-1 text-red-500">{errors.password}</p>}
            </div>

            {/* CONFIRM PASSWORD */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider pl-1 text-stone-500">
                {t('auth.confirmPassword')}
              </label>
              <div className="f-box relative flex items-center rounded-xl bg-stone-50 border border-stone-200 transition-all duration-200">
                <span className="pl-3.5 shrink-0 text-emerald-500"><Lock className="w-4 h-4" /></span>
                <Input
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: '' })); }}
                  type={showConfirm ? 'text' : 'password'}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  className="bg-transparent h-12 pl-3 pr-2 text-base sm:text-sm font-medium text-stone-800 placeholder:text-stone-400 border-0 focus-visible:ring-0 flex-1"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="w-11 h-11 flex items-center justify-center text-stone-400 hover:text-stone-600 touch-manipulation"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs font-medium pl-1 text-red-500">{errors.confirmPassword}</p>}
            </div>

            {/* SUBMIT */}
            <button
              type="button"
              onClick={handleSignup}
              disabled={loading}
              className="cta-btn mt-1 w-full h-12 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{t('auth.createAccount')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* LOGIN LINK */}
          <div className="px-5 pb-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-stone-100" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-stone-300">
                {t('auth.orDivider')}
              </span>
              <div className="flex-1 h-px bg-stone-100" />
            </div>
            <p className="text-center text-sm text-stone-500">
              {t('auth.hasAccount')}{' '}
              <Link to="/login" className="font-bold text-teal-700 hover:text-teal-900">
                {t('auth.login')}
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] mt-5 text-stone-300">
          {t('auth.copyright')}
        </p>
      </div>
    </div>
  );
};

export default Signup;