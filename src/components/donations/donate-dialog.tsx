'use client';

import { useState } from 'react';
import { Heart, Loader2, ExternalLink } from 'lucide-react';
import { useSubmitDonation } from '@/features/donations/hooks';
import type { DonationToken } from '@/features/donations/types';

interface DonateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treasuryWallet: string;
  userWallet: string | null;
}

export function DonateDialog({ open, onOpenChange, treasuryWallet, userWallet }: DonateDialogProps) {
  const [token, setToken] = useState<DonationToken>('SOL');
  const [amount, setAmount] = useState('');
  const [txSignature, setTxSignature] = useState('');
  const [step, setStep] = useState<'form' | 'verify'>('form');

  const submitMutation = useSubmitDonation();

  if (!open) return null;

  const handleSubmit = async () => {
    if (!userWallet || !txSignature.trim() || !amount) return;

    await submitMutation.mutateAsync({
      tx_signature: txSignature.trim(),
      token,
      amount: parseFloat(amount),
      from_wallet: userWallet,
      to_wallet: treasuryWallet,
    });

    // Reset and close
    setAmount('');
    setTxSignature('');
    setStep('form');
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => onOpenChange(false)}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold">Donate to the DAO</h2>
        </div>

        {!userWallet ? (
          <p className="text-sm text-muted-foreground">
            Please link your Solana wallet first to make a donation.
          </p>
        ) : step === 'form' ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Token</label>
              <div className="flex gap-2">
                {(['SOL', 'ORG'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setToken(t)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      token === t
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card hover:bg-muted'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Amount</label>
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Enter ${token} amount`}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              <p className="font-medium">Treasury wallet:</p>
              <p className="mt-1 break-all font-mono">{treasuryWallet}</p>
              <p className="mt-2">
                Send your {token} to the address above using your wallet app, then paste the
                transaction signature below.
              </p>
            </div>

            <button
              onClick={() => setStep('verify')}
              disabled={!amount || parseFloat(amount) <= 0}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              I&apos;ve sent the transaction
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Transaction Signature</label>
              <input
                type="text"
                value={txSignature}
                onChange={(e) => setTxSignature(e.target.value)}
                placeholder="Paste your transaction signature"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Find the transaction signature in your wallet app or on{' '}
              <a
                href="https://explorer.solana.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-primary hover:underline"
              >
                Solana Explorer <ExternalLink className="h-3 w-3" />
              </a>
            </p>

            {submitMutation.error && (
              <p className="text-sm text-destructive">
                {submitMutation.error instanceof Error
                  ? submitMutation.error.message
                  : 'Submission failed'}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep('form')}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!txSignature.trim() || submitMutation.isPending}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                ) : (
                  'Submit for verification'
                )}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => onOpenChange(false)}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
