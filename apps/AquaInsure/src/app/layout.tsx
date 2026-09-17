import '../lib/polyfills';
import type { Metadata, Viewport } from 'next';
import Providers from './providers';
import '../index.css';

export const metadata: Metadata = {
  title: 'AquaInsure - Aquaculture Insurance & Pond Management',
  description: 'Smart aquaculture insurance, pond management, and daily logging platform for shrimp farmers.',
  icons: {
    icon: '/aquainsure/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="min-h-screen bg-stone-200/50 dark:bg-stone-950 font-sans antialiased text-stone-900 selection:bg-teal-100 selection:text-teal-900 flex justify-center items-start sm:py-6 sm:px-4">
        <div className="w-full sm:max-w-[440px] min-h-screen bg-stone-50 dark:bg-stone-900 sm:rounded-[36px] sm:shadow-2xl sm:border sm:border-stone-300/70 dark:sm:border-stone-800 relative flex flex-col overflow-x-hidden">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
