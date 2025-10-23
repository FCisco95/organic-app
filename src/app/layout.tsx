import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/features/auth/context';
import { SolanaWalletProvider } from '@/features/auth/wallet-provider';
import { Toaster } from 'react-hot-toast';

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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
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
