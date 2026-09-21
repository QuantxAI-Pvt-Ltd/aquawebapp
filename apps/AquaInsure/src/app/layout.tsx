import '../lib/polyfills';
import '../lib/api';
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
  viewportFit: 'cover',
  themeColor: '#1c4a3e',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="min-h-[100dvh] bg-stone-100 dark:bg-stone-950 font-sans antialiased text-stone-900 selection:bg-teal-100 selection:text-teal-900 flex justify-center">
        <div className="w-full sm:max-w-[440px] min-h-[100dvh] bg-stone-50 dark:bg-stone-900 sm:shadow-2xl sm:border-x sm:border-stone-300/70 dark:sm:border-stone-800 relative flex flex-col">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
