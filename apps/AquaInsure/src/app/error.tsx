'use client';

import { useEffect } from 'react';
import ErrorDisplay from '@/components/ErrorDisplay';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Next.js Client Application Error:', error);
  }, [error]);

  return (
    <ErrorDisplay
      statusCode={500}
      title="Something went wrong"
      message={
        process.env.NODE_ENV === 'development' && error.message
          ? error.message
          : 'An unexpected error occurred in the application. Please try reloading or return to the dashboard.'
      }
      onRetry={() => reset()}
      showHomeButton={true}
      showBackButton={true}
    />
  );
}
