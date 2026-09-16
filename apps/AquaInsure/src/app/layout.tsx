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
    <html lang="en">
      <body className="min-h-screen bg-stone-50 font-sans antialiased text-stone-900 selection:bg-teal-100 selection:text-teal-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
