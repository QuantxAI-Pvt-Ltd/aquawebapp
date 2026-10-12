'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Waves, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
import { API_BASE } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem('admin-session') || '{}');
      if (session?.token) {
        router.replace('/');
        return;
      }
    } catch {
      localStorage.removeItem('admin-session');
    }
    setCheckingSession(false);
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please enter your username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid credentials. Please try again.');
        return;
      }

      localStorage.setItem(
        'admin-session',
        JSON.stringify({ token: data.token, username: data.username })
      );

      router.replace('/');
    } catch {
      setError('Unable to reach the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Subtle animated background blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full blur-3xl opacity-20"
        style={{ background: 'radial-gradient(circle, #E23E57 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full blur-3xl opacity-15"
        style={{ background: 'radial-gradient(circle, #88304E 0%, transparent 70%)' }}
      />

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Logo & Branding */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E23E57] to-[#311D3F] text-white shadow-lg shadow-[#E23E57]/25">
            <Waves className="h-7 w-7" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-foreground">AquaInsure Admin</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Government Scheme Control Panel</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl shadow-xl p-6 space-y-5">
          <div className="flex items-center gap-2 pb-1 border-b border-border">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Secure Admin Access</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4" id="admin-login-form">
            {/* Username */}
            <div className="space-y-1.5">
              <label htmlFor="admin-username" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="Enter admin username"
                className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="admin-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter admin password"
                  className="w-full h-11 rounded-xl border border-border bg-background px-4 pr-11 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  id="toggle-password-visibility"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-3 py-2.5 text-xs font-semibold text-destructive">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              id="admin-login-submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold tracking-wide flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/25 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Sign In to Dashboard</span>
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] font-medium text-muted-foreground mt-5">
          © 2025 AquaInsure · Zero Premium Scheme · Restricted Access
        </p>
      </div>
    </div>
  );
}
