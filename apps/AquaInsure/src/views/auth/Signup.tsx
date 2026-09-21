import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Phone, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from '@/lib/api';

const API = '/api/auth';
const EASE = [0.16, 1, 0.3, 1] as const;

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
      const { token, farmerId } = res.data;

      localStorage.removeItem('shrimpguard-farmer');
      localStorage.removeItem('aqua-farm');
      localStorage.setItem('aqua-reg-complete', '0');
      localStorage.setItem('aqua-session', JSON.stringify({ phone, farmerId, token }));

      toast.success(t('auth.signupSuccess'));
      navigate('/farmer-registration', { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col"
      style={{ fontFamily: "'Sora', sans-serif", background: '#f7f6f3' }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Serif+Display&display=swap');

        @keyframes shim {
          0% { background-position:-220% center }
          100% { background-position:220% center }
        }

        .cta-btn{
          background:linear-gradient(110deg,#1c6b5a 25%,#2d9b7f 48%,#3ab88f 55%,#1c6b5a 75%);
          background-size:220% auto;
          animation:shim 3.2s linear infinite;
          box-shadow:0 6px 24px -4px rgba(28,107,90,0.32);
          transition: filter .2s, transform .15s;
        }
        .cta-btn:hover { filter: brightness(1.06); }
        .cta-btn:active { transform: scale(0.975); }
        .cta-btn:disabled { opacity: 0.6; cursor: not-allowed; animation: none; }

        .f-box:focus-within{
          border-color:rgba(45,155,127,0.55);
          box-shadow:0 0 0 3px rgba(45,155,127,0.09);
          background:#fff;
        }
      `}</style>

      <div className="flex-1 flex flex-col justify-center px-4 sm:px-5 py-6 sm:py-8 w-full max-w-sm mx-auto">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 sm:mb-6"
        >
          <h1
            className="text-2xl sm:text-3xl text-stone-800 mb-1"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {t('auth.signupHeading')}
          </h1>
          <p className="text-xs sm:text-sm text-stone-400">{t('auth.signupSubtitle')}</p>
        </motion.div>

        {/* CARD */}
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex flex-col gap-4">

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
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
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