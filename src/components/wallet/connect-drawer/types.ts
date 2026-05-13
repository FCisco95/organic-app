import type { Wallet } from '@solana/wallet-adapter-react';

export type ViewState = 'main' | 'all' | 'get-started';

export interface WalletViewProps {
  /** Handler when user selects a wallet to connect */
  onSelectWallet: (walletName: string) => void;
  /** Whether a connection attempt is in progress */
  isDisabled: boolean;
  /** Index of the keyboard-focused wallet item (-1 = none) */
  focusedIndex: number;
}

export interface WalletMainViewProps extends WalletViewProps {
  recentWallet: Wallet | null;
  popularWallets: Wallet[];
  availableWalletsCount: number;
  onShowAll: () => void;
}

export interface WalletAllViewProps extends WalletViewProps {
  filteredWallets: Wallet[];
  recentWalletName: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onBack: () => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
}

export interface LinkWalletCtaProps {
  onClose: () => void;
}
