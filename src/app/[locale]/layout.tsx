import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/features/auth/context';
import { SolanaWalletProvider } from '@/features/auth/wallet-provider';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { LayoutClient } from '@/components/layout-client';
import { QueryProvider } from '@/components/query-provider';
import { LaunchBanner } from '@/components/layout/launch-banner';

import type { Viewport } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://organic-app.vercel.app';

export const metadata: Metadata = {
  title: 'Organic App',
  description: 'DAO governance and task management platform for Organic DAO. Propose ideas, vote on decisions, earn XP, and shape the future.',
  openGraph: {
    title: 'Organic — Govern. Build. Earn.',
    description: 'A community-governed platform where ideas become proposals, proposals become tasks, and contributors earn XP. Join the DAO.',
    url: APP_URL,
    siteName: 'Organic',
    type: 'website',
    images: [{ url: `${APP_URL}/og-image.png`, width: 1200, height: 630, alt: 'Organic DAO' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Organic — Govern. Build. Earn.',
    description: 'A community-governed platform where ideas become proposals, proposals become tasks, and contributors earn XP.',
    images: [`${APP_URL}/og-image.png`],
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
                <LayoutClient>{children}</LayoutClient>
              </SolanaWalletProvider>
            </AuthProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
