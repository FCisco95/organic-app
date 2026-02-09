import type { Metadata } from 'next';
import { DM_Sans, Fraunces, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/features/auth/context';
import { SolanaWalletProvider } from '@/features/auth/wallet-provider';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { LayoutClient } from '@/components/layout-client';
import { QueryProvider } from '@/components/query-provider';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Organic App',
  description: 'DAO governance and task management platform for Organic DAO',
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
      <body
        className={`${dmSans.className} ${fraunces.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>
            <AuthProvider>
              <SolanaWalletProvider>
                <LayoutClient>{children}</LayoutClient>
              </SolanaWalletProvider>
            </AuthProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
