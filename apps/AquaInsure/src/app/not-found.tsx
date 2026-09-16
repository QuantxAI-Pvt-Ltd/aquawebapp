'use client';

import { useEffect } from 'react';
import NotFound from '@/pages/NotFound';

export default function NotFoundPage() {
  useEffect(() => {
    if (typeof window !== 'undefined' && (window.location.pathname === '/' || window.location.pathname === '')) {
      window.location.replace('/aquainsure/');
    }
  }, []);

  return <NotFound />;
}
