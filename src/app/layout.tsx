import type { Metadata } from 'next';
import { Luckiest_Guy, Comic_Neue } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/features/auth/context';
import { SolanaWalletProvider } from '@/features/auth/wallet-provider';
import { Toaster } from 'react-hot-toast';

const luckiestGuy = Luckiest_Guy({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-luckiest',
});

const comicNeue = Comic_Neue({
  weight: ['300', '400', '700'],
  subsets: ['latin'],
  variable: '--font-comic',
});

export const metadata: Metadata = {
  title: 'Organic App',
  description: 'DAO governance and task management platform for Organic DAO',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${luckiestGuy.variable} ${comicNeue.variable} font-comic`}>
        <AuthProvider>
          <SolanaWalletProvider>
            {children}
            <Toaster position="bottom-right" />
          </SolanaWalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
