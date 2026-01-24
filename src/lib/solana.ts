import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Solana connection
export function getConnection(): Connection {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl('mainnet-beta');
  return new Connection(rpcUrl, 'confirmed');
}

// ORG Token mint address
// Use a function to lazy-load the token mint to avoid module initialization errors
export function getOrgTokenMint(): PublicKey {
  const mintAddress =
    process.env.NEXT_PUBLIC_ORG_TOKEN_MINT || 'DuXugm4oTXrGDopgxgudyhboaf6uUg1GVbJ6jk6qbonk';
  return new PublicKey(mintAddress);
}

// Legacy export for backwards compatibility
export const ORG_TOKEN_MINT = getOrgTokenMint();

/**
 * Get SPL token balance for a wallet
 * @param walletAddress - Solana wallet public key
 * @param mintAddress - Token mint address
 * @returns Token balance in UI amount (with decimals)
 */
export async function getTokenBalance(
  walletAddress: string,
  mintAddress: PublicKey = ORG_TOKEN_MINT
): Promise<number> {
  try {
    const connection = getConnection();
    const walletPublicKey = new PublicKey(walletAddress);

    // Get token accounts owned by wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPublicKey, {
      programId: TOKEN_PROGRAM_ID,
    });

    // Find the account for our specific mint
    const tokenAccount = tokenAccounts.value.find(
      (account) => account.account.data.parsed.info.mint === mintAddress.toBase58()
    );

    if (!tokenAccount) {
      return 0;
    }

    const balance = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
    return balance || 0;
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return 0;
  }
}

/**
 * Check if wallet holds ORG tokens
 * @param walletAddress - Solana wallet public key
 * @returns Boolean indicating if wallet holds tokens
 */
export async function isOrgHolder(walletAddress: string): Promise<boolean> {
  const balance = await getTokenBalance(walletAddress);
  return balance > 0;
}

/**
 * Get all token holders for ORG token (for snapshots)
 * Uses getParsedProgramAccounts for efficient single-call fetching
 */
export async function getAllTokenHolders(
  mintAddress: PublicKey = ORG_TOKEN_MINT
): Promise<Array<{ address: string; balance: number }>> {
  try {
    const connection = getConnection();

    // Get all parsed token accounts for this mint in a single RPC call
    const accounts = await connection.getParsedProgramAccounts(TOKEN_PROGRAM_ID, {
      filters: [
        {
          dataSize: 165, // Size of token account
        },
        {
          memcmp: {
            offset: 0, // Mint address is at offset 0
            bytes: mintAddress.toBase58(),
          },
        },
      ],
    });

    const holderBalances = new Map<string, number>();

    for (const account of accounts) {
      try {
        const data = account.account.data;
        if ('parsed' in data) {
          const tokenData = data.parsed.info;
          const balance = tokenData.tokenAmount?.uiAmount;

          if (balance && balance > 0) {
            const owner = tokenData.owner as string;
            const previous = holderBalances.get(owner) || 0;
            holderBalances.set(owner, previous + balance);
          }
        }
      } catch (err) {
        console.error('Error parsing account:', err);
      }
    }

    return Array.from(holderBalances.entries()).map(([address, balance]) => ({
      address,
      balance,
    }));
  } catch (error) {
    console.error('Error fetching all token holders:', error);
    return [];
  }
}
