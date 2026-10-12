'use client';

import { useState, useEffect } from 'react';
import { Waves, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { API_BASE, BASE_PATH } from '@/lib/api';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Compute safe dashboard root redirect path
  const targetDashboardPath = BASE_PATH ? `${BASE_PATH}/` : '/';

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem('admin-session') || '{}');
      if (session?.token) {
        window.location.href = targetDashboardPath;
        return;
      }
    } catch {
      localStorage.removeItem('admin-session');
    }
    setCheckingSession(false);
  }, [targetDashboardPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please enter your username and password.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = `${API_BASE}/api/admin/login`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        setError(`Server returned an error (${res.status} ${res.statusText || ''}). Please verify the backend is running.`);
        return;
      }

      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid credentials. Please verify your username and password.');
        return;
      }

      localStorage.setItem(
        'admin-session',
        JSON.stringify({ token: data.token, username: data.username })
      );

      // Force full reload into authenticated shell
      window.location.href = targetDashboardPath;
    } catch {
      setError('Unable to reach backend API. Please verify the backend service is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutofill = (user = 'admin', pass = 'admin') => {
    setUsername(user);
    setPassword(pass);
    setError('');
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background relative overflow-hidden px-4 py-8">
      {/* Top right floating theme toggle */}
      <div className="fixed top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      {/* Subtle background ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[600px] rounded-full blur-3xl opacity-20"
        style={{ background: 'radial-gradient(circle, #2563EB 0%, #1E40AF 40%, transparent 70%)' }}
      />

      <div className="relative z-10 w-full max-w-[400px] space-y-6">
        {/* Main Clean Card */}
        <Card className="rounded-2xl border border-border/70 bg-card/95 shadow-xl shadow-slate-900/5 dark:shadow-black/30 backdrop-blur-md p-6 sm:p-8">
          <CardHeader className="p-0 pb-6 text-center space-y-2">
            {/* Logo Emblem */}
            <div className="mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-900 text-white shadow-md shadow-blue-500/20">
              <Waves className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                  AquaInsure Admin
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono font-normal text-muted-foreground border-border">
                  v2.4
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Government Scheme & Telemetry Control Panel
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <form onSubmit={handleLogin} id="admin-login-form" className="space-y-4">
              {/* Username Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-username"
                  className="text-xs font-medium text-foreground block"
                >
                  Username
                </label>
                <Input
                  id="admin-username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  placeholder="admin"
                  className="h-10 text-sm bg-background/50 border-input focus-visible:ring-1 focus-visible:ring-primary px-3"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-password"
                  className="text-xs font-medium text-foreground block"
                >
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="••••••••"
                    className="h-10 text-sm bg-background/50 border-input focus-visible:ring-1 focus-visible:ring-primary px-3 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    id="toggle-password-visibility"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-transparent h-7 w-7"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                id="admin-login-submit"
                disabled={loading}
                className="w-full h-10 text-sm font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors cursor-pointer mt-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </Button>

              {/* Subtle autofill helper */}
              <div className="pt-2 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                <span>Default:</span>
                <button
                  type="button"
                  onClick={() => handleAutofill('admin', 'admin')}
                  className="font-mono text-[11px] text-primary hover:underline cursor-pointer"
                >
                  admin / admin
                </button>
                <span className="text-muted-foreground/40">|</span>
                <button
                  type="button"
                  onClick={() => handleAutofill('admin', 'admin123')}
                  className="font-mono text-[11px] text-muted-foreground hover:text-primary hover:underline cursor-pointer"
                >
                  admin123
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer info */}
        <p className="text-center text-[11px] text-muted-foreground/70">
          © 2025 AquaInsure · Zero Premium Scheme · Restricted Access
        </p>
      </div>
    </div>
  );
}
