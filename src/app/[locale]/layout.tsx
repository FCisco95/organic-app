import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/features/auth/context';
import { SolanaWalletProvider } from '@/features/auth/wallet-provider';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { LayoutClient } from '@/components/layout-client';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
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
      <body className={inter.className}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <SolanaWalletProvider>
              <LayoutClient>{children}</LayoutClient>
            </SolanaWalletProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
