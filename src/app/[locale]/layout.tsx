import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/features/auth/context';
import { SolanaWalletProvider } from '@/features/auth/wallet-provider';
import { Toaster } from 'react-hot-toast';
import { NextIntlClientProvider, useMessages } from 'next-intl';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Organic App',
  description: 'DAO governance and task management platform for Organic DAO',
};

export default function RootLayout({
  children,
  params: { locale },
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string };
}>) {
  const messages = useMessages();

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <SolanaWalletProvider>
              {children}
              <Toaster position="bottom-right" />
            </SolanaWalletProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
