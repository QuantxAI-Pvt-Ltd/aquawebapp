'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Pages that are publicly accessible without a farmer auth session.
 * All other routes require a valid `aqua-session` token.
 */
const PUBLIC_PATHS = ['/login', '/signup', '/language'];

/**
 * AuthGuard — wraps every page and redirects unauthenticated users to /login.
 * Works client-side since the JWT is stored in localStorage.
 * Shows an invisible placeholder (no flash of content) while checking.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Root path is SplashScreen — it handles its own auth/routing logic
    if (pathname === '/') {
      setReady(true);
      return;
    }

    // Public pages are always accessible
    const isPublic = PUBLIC_PATHS.some(
      p => pathname === p || pathname.startsWith(p + '/')
    );
    if (isPublic) {
      setReady(true);
      return;
    }

    // Check for a valid farmer session token
    try {
      const sessionStr = localStorage.getItem('aqua-session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session?.token && session?.farmerId) {
          setReady(true);
          return;
        }
      }
    } catch {
      localStorage.removeItem('aqua-session');
    }

    // No valid session — redirect to login
    const hasLang = !!localStorage.getItem('shrimpguard-lang');
    router.replace(hasLang ? '/login' : '/language');
    // Keep ready=false so page content never flashes
  }, [pathname, router]);

  // Render nothing (invisible) while auth check is in progress
  // The redirect fires before anything is shown to the user
  if (!ready) return null;

  return <>{children}</>;
}
