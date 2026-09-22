'use client';

import { useEffect } from 'react';
import ErrorDisplay from '@/components/ErrorDisplay';

export default function NotFoundPage() {
  useEffect(() => {
    if (typeof window !== 'undefined' && (window.location.pathname === '/' || window.location.pathname === '')) {
      window.location.replace('/aquainsure/');
    }
  }, []);

  return (
    <ErrorDisplay
      statusCode={404}
      title="Page Not Found"
      message="The requested AquaInsure page could not be found."
      showHomeButton={true}
      showBackButton={true}
    />
  );
}
