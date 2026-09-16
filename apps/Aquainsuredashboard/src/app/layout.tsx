import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import './globals.css';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AquaInsure Dashboard',
  description: 'Production-grade admin dashboard for AquaInsure aquaculture insurance platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-screen bg-background text-foreground">
        <TooltipProvider>
          <Sidebar />
          {/* Main area offset by sidebar width — uses CSS transition to match sidebar collapse */}
          <div className="ml-[240px] flex flex-1 flex-col transition-all duration-300 has-[aside.w-\\[68px\\]]:ml-[68px]">
            <Topbar />
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
