import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import DashboardShell from '@/components/layout/DashboardShell';
import { Toaster } from '@/components/ui/sonner';
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
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-screen bg-background text-foreground selection:bg-[#E23E57]/20 selection:text-[#88304E] dark:selection:text-[#E23E57]">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <DashboardShell>{children}</DashboardShell>
            <Toaster position="top-right" richColors />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
