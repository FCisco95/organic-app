# Wallet Connect Drawer

A Kamino-style left drawer wallet connector for Solana wallets.

## Components

### `ConnectWalletButton`

The main button component that triggers the wallet drawer. Shows connection status and provides a dropdown menu when connected.

```tsx
import { ConnectWalletButton } from '@/components/wallet';

<ConnectWalletButton />
<ConnectWalletButton variant="compact" /> // Smaller variant
```

### `WalletConnectDrawer`

The main drawer component with wallet selection UI.

```tsx
import { WalletConnectDrawer } from '@/components/wallet';

<WalletConnectDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />;
```

### `WalletListItem`

Individual wallet row component.

### `WalletGetStarted`

"Get a wallet" flow for users without a Solana wallet.

## Recent Wallet Persistence

The drawer persists the last connected wallet to `localStorage`:

- **Key:** `wallet_recent`
- **Value:** Wallet adapter name (e.g., "Phantom", "Solflare")

When the drawer opens, it checks for a recent wallet and displays it in a "Recent" section if:

1. The value exists in localStorage
2. The wallet adapter is available in the current adapter list

On successful connection, the wallet name is saved to localStorage.

## Popular Wallets List

To modify the popular wallets order, edit the `POPULAR_WALLET_NAMES` array in `wallet-connect-drawer.tsx`:

```ts
const POPULAR_WALLET_NAMES = [
  'Phantom',
  'Solflare',
  'Backpack',
  'OKX Wallet',
  'Coinbase Wallet',
  'Ledger',
  'Torus',
];
```

The Popular section shows:

1. Wallets from this list (in order)
2. Any installed wallets not in the list (auto-detected via Wallet Standard)
3. Maximum 6 wallets displayed

## Adding/Removing Wallet Adapters

Wallet adapters are configured in `src/features/auth/wallet-provider.tsx`:

```ts
const wallets = useMemo(
  () => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new CoinbaseWalletAdapter(),
    new LedgerWalletAdapter(),
    new TorusWalletAdapter(),
  ],
  []
);
```

Note: Many wallets (Backpack, OKX, etc.) use the Wallet Standard and are auto-detected without explicit adapters.

## Accessibility

- **ESC key:** Closes the drawer (or returns to main view if in sub-view)
- **Arrow keys:** Navigate wallet list
- **Enter key:** Select focused wallet
- **Focus trap:** Focus is trapped inside the drawer when open
- **Click outside:** Closes the drawer
- **ARIA labels:** Proper dialog and button labels

## Mobile Behavior

On mobile (< 640px breakpoint), the drawer expands to full width for better touch interaction.
