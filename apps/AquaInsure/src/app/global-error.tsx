'use client';

import { useEffect } from 'react';
import ErrorDisplay from '@/components/ErrorDisplay';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Next.js Global Root Error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-stone-50 m-0 p-0">
        <ErrorDisplay
          statusCode={500}
          title="Application Encountered a Problem"
          message="A critical layout error occurred. Please reload the application to restore your session."
          onRetry={() => reset()}
          showHomeButton={true}
          showBackButton={false}
        />
      </body>
    </html>
  );
}
