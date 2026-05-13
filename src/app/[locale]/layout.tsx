import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/features/auth/context';
import { SolanaWalletProvider } from '@/features/auth/wallet-provider';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { LayoutClient } from '@/components/layout-client';
import { QueryProvider } from '@/components/query-provider';
import { LaunchBanner } from '@/components/layout/launch-banner';
import { RestrictionBanner } from '@/components/layout/restriction-banner';

import type { Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Organic Hub',
  description: 'Community governance and task management platform for Organic Hub. Propose ideas, vote on decisions, earn XP, and shape the future.',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Organic — Govern. Build. Earn.',
    description: 'A community-governed platform where ideas become proposals, proposals become tasks, and contributors earn XP. Join the DAO.',
    url: 'https://organichub.fun',
    siteName: 'Organic',
    type: 'website',
    images: [{ url: 'https://organichub.fun/og/og-image.png', width: 1200, height: 630, alt: 'Organic' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Organic — Govern. Build. Earn.',
    description: 'A community-governed platform where ideas become proposals, proposals become tasks, and contributors earn XP.',
    images: ['https://organichub.fun/og/og-image.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  const { locale } = params;
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="antialiased font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>
            <AuthProvider>
              <SolanaWalletProvider>
                <LaunchBanner />
                <RestrictionBanner />
                <LayoutClient>{children}</LayoutClient>
              </SolanaWalletProvider>
            </AuthProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
