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
      <body className="h-[100dvh] bg-stone-50 sm:bg-stone-200/50 dark:bg-stone-950 font-sans antialiased text-stone-900 selection:bg-teal-100 selection:text-teal-900 flex justify-center items-center sm:py-3 sm:px-4 overflow-hidden">
        <div className="w-full sm:max-w-[440px] h-[100dvh] sm:h-[860px] sm:max-h-[96vh] bg-stone-50 dark:bg-stone-900 sm:shadow-2xl sm:border sm:border-stone-300/70 dark:sm:border-stone-800 relative flex flex-col overflow-hidden">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
